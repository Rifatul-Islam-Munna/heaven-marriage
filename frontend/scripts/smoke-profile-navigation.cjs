// Real React form + isolated browser/API fixture. No app build or real account.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { EventEmitter, once } = require('node:events');
const ts = require('typescript');
const puppeteer = require('../../backend/node_modules/puppeteer');
const { compile } = require('@tailwindcss/node');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const formSource = read('components/custom/updateProfile/ProfileUpdateForm.tsx');
const transpile = file => ts.transpileModule(read(file), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
const ids = ['a', 'b', 'c', 'd'].map(letter => 'q_' + letter.repeat(32));
const countryOptions = [
  'Bangladesh', 'Afghanistan', 'India', 'Saudi Arabia', 'United Arab Emirates', 'Malaysia',
  'United Kingdom', 'United States', 'Canada', 'Australia', 'Pakistan', 'Nepal', 'Sri Lanka',
  'Qatar', 'Oman', 'Choice A',
].map(value => ({ value, label: value }));
const schema = { revision: 12, sections: [{ id: 0, title: 'Test details' }],
  questions: ids.map((id, index) => ({ id, path: index === 2 ? 'residenceCountry' : undefined,
    question: 'Question ' + (index + 1), publicLabel: 'Answer ' + (index + 1), section: 0, gender: 'both',
    type: index === 2 ? 'select' : index === 3 ? 'textarea' : 'text',
    options: index === 2 ? countryOptions : [],
    optionSource: index === 2 ? 'countries' : '', required: index < 2, enabled: true, showPublic: false, order: index, locked: false,
  })) };
const profile = { _id: 'fixture-member', name: 'Test member', gender: 'male', role: 'user',
  biodataStage: 'draft', biodataStatus: 'draft', dynamicAnswers: { [ids[2]]: 'Bangladesh' }, draftStep: 0 };
const modules = {
  react: read('node_modules/react/cjs/react.development.js'),
  'react/jsx-runtime': read('node_modules/react/cjs/react-jsx-runtime.development.js'),
  'react-dom': read('node_modules/react-dom/cjs/react-dom.development.js'),
  'react-dom/client': read('node_modules/react-dom/cjs/react-dom-client.development.js'),
  scheduler: read('node_modules/scheduler/cjs/scheduler.development.js'),
  zustand: 'module.exports=require("zustand/react");',
  'zustand/react': read('node_modules/zustand/react.js'),
  'zustand/vanilla': read('node_modules/zustand/vanilla.js'),
  form: transpile('components/custom/updateProfile/ProfileUpdateForm.tsx'),
  '@/zustan/useProfileStore': transpile('zustan/useProfileStore.ts'),
  '@/lib/profile-questions': transpile('lib/profile-questions.ts'),
  './profile-questions': 'module.exports=require("@/lib/profile-questions");',
  './profile-question-defaults.json': 'module.exports=' + read('lib/profile-question-defaults.json'),
  './birth-date': transpile('lib/birth-date.ts'),
  '@/lib/birth-date': 'module.exports=require("./birth-date");',
  '@/lib/biodata-draft': transpile('lib/biodata-draft.ts'),
  '@/lib/biodata-status': transpile('lib/biodata-status.ts'),
  '@/lib/profile-completion': transpile('lib/profile-completion.ts'),
  '@/lib/profile-question-options': 'exports.profileQuestionOptions=q=>q.options;',
  '@/staticData/countries': 'exports.countries=[{code:"BD",en:"Bangladesh"}];',
  'next/link': 'exports.__esModule=true;exports.default=({children,...props})=>require("react").createElement("a",props,children);',
  'next/navigation': 'exports.useRouter=()=>({push:path=>window.routes.push(path)});',
  'lucide-react': 'module.exports=new Proxy({},{get:(_,name)=>name==="__esModule"?true:props=>require("react").createElement("svg",{...props,width:20,height:20,"aria-hidden":true})});',
  sonner: 'exports.toast={error:message=>window.toasts.push(message),info:message=>window.toasts.push(message)};',
  '@tanstack/react-query': 'exports.useQueryClient=()=>window.queryClient;',
  '@/api-hooks/react-query-wrapper': 'exports.useQueryWrapper=key=>({data:key[0]==="get-my-profile"?window.fixture:undefined,isLoading:false,isError:false});',
  '@/api-hooks/use-api-mutation': 'exports.useCommonMutationApi=()=>({isPending:false,mutate:payload=>window.submissions.push(payload)});',
  '@/api-hooks/api-hooks': `exports.PatchRequestAxios=async(url,payload)=>{
    const response=await fetch('/save',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();return response.ok?[data,null]:[null,data];
  };`,
  './AiBiodataAssistant': 'exports.__esModule=true;exports.default=()=>null;',
  './BirthDateSelect': 'exports.__esModule=true;exports.default=()=>null;',
  './DynamicQuestionStep': 'exports.SavedQuestionAnswer=()=>null;',
};
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const requests = [], pending = [], events = new EventEmitter();
let hold = false, failNext = false, browser, server;
const nextButton = '[data-question-action="next"]';
const skipButton = '[data-question-action="skip"]';
const screenshot = path.join(os.tmpdir(), 'heaven-profile-navigation-mobile.png');
function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
(async () => {
  try {
    // Generate only fixture utility CSS from the actual form's class names.
    const styles = await compile('@import "tailwindcss";', { base: root, onDependency() {} });
    const css = styles.build([...new Set(formSource.match(/[\w!#.[\]()%/,:-]+/g))]);
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>${css}</style></head><body><div id="app"></div><script>
      window.process={env:{NODE_ENV:'development'}};
      window.fixture=${JSON.stringify(profile)};window.routes=[];window.toasts=[];window.submissions=[];
      window.queryClient={setQueryData(){},invalidateQueries(){return Promise.resolve()}};
      const sources=${JSON.stringify(modules).replace(/</g, '\\u003c')},cache={};
      function require(id){if(cache[id])return cache[id].exports;if(!sources[id])throw Error('Missing '+id);
        const module={exports:{}};cache[id]=module;new Function('require','module','exports',sources[id])(require,module,module.exports);return module.exports;}
      require('react-dom/client').createRoot(document.getElementById('app')).render(require('react').createElement(require('form').default));
      </script></body></html>`;
    server = http.createServer(async (req, res) => {
      if (req.url === '/api/profile-questions') return respond(res, 200, schema);
      if (req.url === '/save') {
        let raw = ''; for await (const chunk of req) raw += chunk;
        const payload = JSON.parse(raw);
        requests.push(payload);
        const finish = () => {
          Object.assign(profile.dynamicAnswers, payload.dynamicAnswers || {});
          profile.draftStep = payload.draftStep;
          respond(res, 200, { data: profile, completion: { percentage: 50 }, biodataStage: 'draft' });
        };
        if (failNext) { failNext = false; respond(res, 500, { message: 'Test save failed' }); }
        else if (hold) pending.push(finish);
        else finish();
        events.emit('save');
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.includes('যেখানে থেমেছিলেন')))
      .catch(async error => {
        console.error('PAGE_ERRORS:', errors.join('\n'));
        console.error('PAGE_TEXT:', await page.evaluate(() => document.body.innerText));
        throw error;
      });
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('যেখানে থেমেছিলেন')).click());
    await page.waitForSelector('#qb-question');
    await page.waitForSelector(nextButton);
    for (const width of [320, 390, 515, 768]) {
      await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true });
      const boxes = await page.evaluate(() => {
        const box = selector => { const rect = document.querySelector(selector).getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height }; };
        return { header: box('[data-question-header]'), skip: box('[data-question-action="skip"]'),
          next: box('[data-question-action="next"]'), width: innerWidth,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert(boxes.skip.left >= boxes.header.left && boxes.skip.right <= boxes.header.right &&
        boxes.skip.right >= boxes.header.right - 2, 'Skip must stay at the top-right at ' + width + 'px');
      assert(boxes.next.left >= 0 && boxes.next.right <= boxes.width, 'Next must fit ' + width + 'px');
      assert(boxes.skip.height >= 44 && boxes.next.height >= 44, 'Mobile buttons must remain tappable');
      assert(boxes.skip.bottom <= boxes.next.top, 'Skip must appear above the main Next button');
      assert(!boxes.overflow, 'No horizontal overflow at ' + width + 'px');
    }
    await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
    await page.screenshot({ path: screenshot, fullPage: true });
    await page.click(nextButton);
    assert.equal(await page.$eval('#qb-question', el => el.textContent), 'Question 1', 'Empty required Next stays blocked');
    assert.equal(requests.length, 0);
    await page.click(skipButton);
    await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'Question 2');

    await page.type('fieldset input', 'Latest typed answer');
    failNext = true;
    let received = once(events, 'save');
    await page.click(nextButton); await received;
    await page.waitForFunction(() => !document.querySelector('[data-question-action="next"]').disabled && document.body.textContent.includes('Test save failed'));
    assert.equal(await page.$eval('#qb-question', el => el.textContent), 'Question 2', 'Failed save must keep current question');
    assert.equal(await page.$eval('fieldset input', el => el.value), 'Latest typed answer');

    hold = true;
    received = once(events, 'save');
    await page.click(nextButton); await received;
    assert.equal(await page.$eval('#qb-question', el => el.textContent), 'Question 2', 'Next must await server confirmation');
    assert(await page.$eval(skipButton, el => el.disabled));
    assert(await page.$eval('fieldset', el => el.disabled));
    const count = requests.length;
    await page.$eval(nextButton, el => { el.click(); el.click(); });
    assert.equal(requests.length, count, 'Repeated clicks must not duplicate writes');
    assert.deepEqual(requests.at(-1), { dynamicAnswers: { [ids[1]]: 'Latest typed answer' }, draftStep: 0 });
    hold = false; pending.splice(0).forEach(finish => finish());
    await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'Question 3');
    assert.equal(profile.dynamicAnswers[ids[1]], 'Latest typed answer');
    assert(await page.$eval(skipButton, el => !el.disabled), 'Optional questions also show Skip');

    // A saved country should be compact; changing it reveals a searchable list only on demand.
    await page.waitForFunction(() => document.body.textContent.includes('বাংলাদেশ · Bangladesh') &&
      document.body.textContent.includes('অন্য দেশ বেছে নিন'));
    assert.equal(await page.$('fieldset input'), null, 'A saved country must not show the long list or search by default');
    await page.evaluate(() => [...document.querySelectorAll('fieldset button')]
      .find(button => button.textContent.includes('অন্য দেশ বেছে নিন')).click());
    await page.waitForSelector('fieldset input');
    await page.type('fieldset input', 'Choice A');

    // Select + immediate Next must cancel the delayed auto-advance callback.
    await page.evaluate(() => {
      [...document.querySelectorAll('fieldset button')].find(button => button.textContent.includes('Choice A')).click();
      document.querySelector('[data-question-action="next"]').click();
    });
    await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'Question 4');
    await new Promise(resolve => setTimeout(resolve, 450));
    assert.equal(await page.$eval('#qb-question', el => el.textContent), 'Question 4', 'Old timer must not skip the following question');
    assert.equal(profile.dynamicAnswers[ids[2]], 'Choice A');

    await page.type('fieldset textarea', 'Final saved answer');
    hold = true; received = once(events, 'save');
    await page.click(nextButton); await received;
    assert.equal(await page.$eval('#qb-question', el => el.textContent), 'Question 4', 'Level completion must wait for its save');
    hold = false; pending.splice(0).forEach(finish => finish());
    await page.waitForFunction(() => !document.querySelector('#qb-question') && document.body.textContent.includes('প্রায় শেষ'));
    assert.equal(profile.dynamicAnswers[ids[3]], 'Final saved answer');
    assert(await page.evaluate(() => ![...document.querySelectorAll('button')].some(button => button.textContent.includes('বায়োডাটা জমা দিন'))),
      'Skipping must not bypass final required answers');
    assert.deepEqual(errors, []);
    console.log('PASS: 320/390/768px Skip visibility, immediate Next saves, failure/retry, duplicate-click/timer guards, final save and required submission checks');
    console.log('Screenshot: ' + screenshot);
  } finally {
    hold = false; pending.splice(0).forEach(finish => finish());
    await browser?.close();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
