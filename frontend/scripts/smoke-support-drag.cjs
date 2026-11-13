// Runs the actual widget in an isolated React fixture. No Next build or account needed.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const ts = require('typescript');
const puppeteer = require('../../backend/node_modules/puppeteer');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const component = 'components/custom/common/';
const transpile = file => ts.transpileModule(read(file), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const modules = {
  react: read('node_modules/react/cjs/react.development.js'),
  'react/jsx-runtime': read('node_modules/react/cjs/react-jsx-runtime.development.js'),
  'react-dom': read('node_modules/react-dom/cjs/react-dom.development.js'),
  'react-dom/client': read('node_modules/react-dom/cjs/react-dom-client.development.js'),
  scheduler: read('node_modules/scheduler/cjs/scheduler.development.js'),
  widget: transpile(component + 'SupportChatWidget.tsx'),
  './SupportSmileAvatar': transpile(component + 'SupportSmileAvatar.tsx'),
  './SupportChatWidget.module.css': 'exports.default=new Proxy({},{get:(_,key)=>key});',
  './SupportSmileAvatar.module.css': 'exports.default=new Proxy({},{get:(_,key)=>key});',
  'next/navigation': 'exports.usePathname=()=>"/";',
  '@/api-hooks/react-query-wrapper': 'exports.useQueryWrapper=()=>({data:{messengerUrl:"https://m.me/niqaha"}});',
  '@/lib/contact-config': 'exports.contacts={general:"+8801748919251",messenger:"https://m.me/niqaha"};',
  '@/lib/messenger-url': 'exports.normalizeMessengerUrl=value=>value;',
  '@/lib/utils': 'exports.cn=(...values)=>values.filter(Boolean).join(" ");',
  'lucide-react': 'module.exports=new Proxy({},{get:()=>props=>require("react").createElement("svg",{width:props.size||20,height:props.size||20})});',
  'react-icons/fa': 'exports.FaFacebookMessenger=()=>require("react").createElement("svg",{width:23,height:23});',
};
const css = `
*{box-sizing:border-box}body{margin:0;min-height:2000px}
[data-support-hub]{position:fixed;right:12px;bottom:88px;display:flex;flex-direction:column;align-items:flex-end;gap:12px;pointer-events:none;z-index:65}
[data-support-hub-controls]{pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:8px}
[data-support-ai-avatar]{position:relative;width:68px;height:68px;flex-shrink:0}
[data-support-more],[data-support-messenger],[data-support-call]{width:48px;height:48px;display:flex}
#niqaha-contact-actions{flex-direction:column;align-items:center;gap:8px}.hidden{display:none}.flex{display:flex}
#niqaha-support-dialog{pointer-events:auto;display:flex;flex-direction:column;overflow:hidden;background:white;border:1px solid pink}
.avatarLabel{position:absolute;right:79px;white-space:nowrap}
@media(min-width:1024px){[data-support-hub]{bottom:24px;right:20px}}
` + read(component + 'SupportChatWidget.module.css');
const html = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><div id="app"></div><script>
window.process={env:{NODE_ENV:'development'}};
const sources=${JSON.stringify(modules).replace(/</g, '\\u003c')},cache={};
function require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;new Function('require','module','exports',sources[id])(require,module,module.exports);return module.exports;}
require('react-dom/client').createRoot(document.getElementById('app')).render(require('react').createElement(require('widget').default));
</script>`;
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', req.url.startsWith('/api/') ? 'application/json' : 'text/html');
  res.end(req.url.startsWith('/api/') ? JSON.stringify({ remaining: 10 }) : html);
});
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const avatar = '[data-support-ai-avatar]';
const dialog = '#niqaha-support-dialog';
let browser;
(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForSelector(avatar);
    await page.$eval(avatar, el => Promise.all(el.getAnimations().filter(animation =>
      Number.isFinite(animation.effect.getComputedTiming().endTime)).map(animation => animation.finished)));
    await page.evaluate(() => scrollTo(0, 200));
    const start = await page.$eval(avatar, el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const cdp = await page.createCDPSession();
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
      type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }],
    });
    await touch('touchStart', start.x, start.y);
    for (let i = 1; i <= 8; i++) await touch('touchMove', start.x + (60 - start.x) * i / 8, start.y + (160 - start.y) * i / 8);
    await touch('touchEnd');
    await page.waitForFunction(() => document.querySelector('[data-support-hub]').dataset.supportMoved === 'true');
    let rect = await page.$eval(avatar, el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; });
    assert.ok(Math.abs(rect.x - 26) < 3 && Math.abs(rect.y - 126) < 3, 'Touch drag follows finger: ' + JSON.stringify(rect));
    assert.equal(await page.$(dialog), null, 'Dragging must not open chat');
    assert.equal(await page.evaluate(() => scrollY), 200, 'Dragging must not scroll page');
    const saved = { ...rect };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-support-hub]')?.dataset.supportMoved === 'true');
    rect = await page.$eval(avatar, el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; });
    assert.ok(Math.abs(rect.x - saved.x) < 2 && Math.abs(rect.y - saved.y) < 2, 'Position survives reload');
    await page.tap(avatar);
    await page.waitForSelector(dialog);
    await page.tap('button[aria-label="Close support chat"]');
    await page.waitForSelector(dialog, { hidden: true });
    for (const { width, height } of [{ width: 320, height: 480 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
      await page.setViewport({ width, height, isMobile: width < 1024, hasTouch: true });
      const box = await page.$eval(avatar, el => { const r = el.getBoundingClientRect(); return { x: r.x + 34, y: r.y + 34 }; });
      await page.mouse.move(box.x, box.y);
      await page.mouse.down();
      await page.mouse.move(width + 300, height + 300, { steps: 8 });
      await page.mouse.up();
      await page.waitForFunction(() => !document.querySelector('#niqaha-support-dialog'));
      const bounded = await page.$eval(avatar, el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; });
      assert.ok(bounded.left >= 0 && bounded.top >= 0 && bounded.right <= width && bounded.bottom <= height, 'Dragged button stays onscreen');
      await page.click(avatar);
      await page.waitForSelector(dialog);
      const panel = await page.$eval(dialog, el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; });
      assert.ok(panel.left >= 0 && panel.top >= 0 && panel.right <= width && panel.bottom <= height, 'Chat stays onscreen after moving');
      await page.click('button[aria-label="Close support chat"]');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: touch/mouse dragging, tap versus drag, saved position, viewport bounds, rotation and chat opening');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
