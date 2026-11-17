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
const defaults = JSON.parse(read('lib/profile-question-defaults.json'));
const locationQuestion = (field, overrides) => ({ ...defaults.questions.find(q => q.path === field), ...overrides });
const locationSchema = { revision: 13, sections: [{ id: 1, title: 'Address' }, { id: 2, title: 'Saved section' }, { id: 3, title: 'Final section' }], questions: [
  locationQuestion('address.presentAddress', { required: true, order: 50 }),
  locationQuestion('address.district', { options: [{ label: 'Dhaka', value: 'Dhaka' }], required: true }),
  locationQuestion('address.upazila', { options: [{ label: 'Savar', value: 'Savar' }], required: true }),
  { ...schema.questions[0], id: 'builtin_8e65c7400068cbde', path: 'address.cityCorporation', question: 'City corporation',
    type: 'select', options: [{ label: 'Dhaka North', value: 'Dhaka North' }], section: 1, required: true, order: 150 },
  { ...schema.questions[0], id: 'builtin_8e65c7400068cbdf', path: 'address.area', question: 'Area', section: 1, required: true, order: 180 },
  locationQuestion('address.permanentAddress', {}),
  { ...schema.questions[0], id: 'q_' + 'e'.repeat(32), question: 'Already answered section', section: 2 },
  { ...schema.questions[3], id: 'q_' + 'f'.repeat(32), path: undefined, question: 'Final question', section: 3 },
] };
const locationProfiles = Object.fromEntries(['upazila', 'city'].map(kind => ['/locations/' + kind, {
  ...profile, _id: 'location-' + kind, residenceCountry: 'Bangladesh', draftStep: 1,
  address: { district: '', upazila: '', cityCorporation: '', area: '', presentAddress: '', permanentAddress: 'Saved permanent address' },
  dynamicAnswers: { ['q_' + 'e'.repeat(32)]: 'Already answered' },
}]));
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
const keyboardScreenshot = path.join(os.tmpdir(), 'heaven-profile-keyboard-mobile.png');
function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
(async () => {
  try {
    // Generate only fixture utility CSS from the actual form's class names.
    const styles = await compile('@import "tailwindcss";', { base: root, onDependency() {} });
    const css = styles.build([...new Set(formSource.match(/[\w!#.[\]()%/,:-]+/g))]);
    const initialProfileJson = JSON.stringify(profile);
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>${css}</style></head><body><div id="app"></div><script>
      window.process={env:{NODE_ENV:'development'}};
      window.fixture=${initialProfileJson};window.routes=[];window.toasts=[];window.submissions=[];
      window.queryClient={setQueryData(){},invalidateQueries(){return Promise.resolve()}};
      const sources=${JSON.stringify(modules).replace(/</g, '\\u003c')},cache={};
      function require(id){if(cache[id])return cache[id].exports;if(!sources[id])throw Error('Missing '+id);
        const module={exports:{}};cache[id]=module;new Function('require','module','exports',sources[id])(require,module,module.exports);return module.exports;}
      require('react-dom/client').createRoot(document.getElementById('app')).render(require('react').createElement(require('form').default));
      </script></body></html>`;
    server = http.createServer(async (req, res) => {
      const referrerPath = new URL(req.headers.referer || '/', 'http://127.0.0.1').pathname;
      const requestProfile = locationProfiles[referrerPath] || profile;
      if (req.url === '/api/profile-questions') return respond(res, 200, locationProfiles[referrerPath] ? locationSchema : schema);
      if (req.url === '/save') {
        let raw = ''; for await (const chunk of req) raw += chunk;
        const payload = JSON.parse(raw);
        requests.push(payload);
        const finish = () => {
          Object.assign(requestProfile.dynamicAnswers, payload.dynamicAnswers || {});
          if (payload.address) Object.assign(requestProfile.address, payload.address);
          requestProfile.draftStep = payload.draftStep;
          respond(res, 200, { data: requestProfile, completion: { percentage: 50 }, biodataStage: 'draft' });
        };
        if (failNext) { failNext = false; respond(res, 500, { message: 'Test save failed' }); }
        else if (hold) pending.push(finish);
        else finish();
        events.emit('save');
        return;
      }
      const documentProfile = locationProfiles[new URL(req.url, 'http://127.0.0.1').pathname];
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html.replace('window.fixture=' + initialProfileJson, 'window.fixture=' + JSON.stringify(documentProfile || profile)));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    // Headless Chrome has no OS keyboard. Model its visual-only resize and pan
    // independently of the layout viewport, as on Android Chrome / iOS Safari.
    await page.evaluateOnNewDocument(() => {
      const viewport = new EventTarget();
      Object.defineProperties(viewport, {
        height: { get: () => window.keyboardFixture?.height ?? innerHeight },
        width: { get: () => window.keyboardFixture?.width ?? innerWidth },
        offsetTop: { get: () => window.keyboardFixture?.top ?? 0 },
        offsetLeft: { get: () => window.keyboardFixture?.left ?? 0 },
        scale: { get: () => window.keyboardFixture?.scale ?? 1 },
      });
      Object.defineProperty(window, 'visualViewport', { value: viewport });
      window.setKeyboardFixture = value => {
        window.keyboardFixture = value;
        viewport.dispatchEvent(new Event('resize'));
        viewport.dispatchEvent(new Event('scroll'));
      };
      window.addEventListener('resize', () => viewport.dispatchEvent(new Event('resize')));
    });
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

    const closeKeyboard = async () => {
      await page.evaluate(() => window.setKeyboardFixture(null));
      await page.waitForFunction(() => document.querySelector('[data-question-viewport]')?.dataset.keyboardOpen === 'false');
      await page.waitForFunction(() => !history.state?.niqahaProfileKeyboard);
    };
    const checkKeyboard = async (height, top = 0, selector = 'fieldset input', scale = 1) => {
      await page.$eval(selector, input => input.blur());
      await page.focus(selector);
      await page.evaluate(value => window.setKeyboardFixture({ ...value, width: innerWidth / value.scale }), { height, top, scale });
      await page.waitForFunction(() => document.querySelector('[data-question-viewport]')?.dataset.keyboardOpen === 'true');
      await page.waitForFunction(() => !!history.state?.niqahaProfileKeyboard);
      await page.waitForFunction((height, top) => {
        const rect = document.querySelector('[data-question-viewport]').getBoundingClientRect();
        return Math.abs(rect.height - height) < 1 && Math.abs(rect.top - top) < 1;
      }, {}, height, top);
      await page.waitForFunction(selector => {
        const input = document.querySelector(selector).getBoundingClientRect();
        const content = document.querySelector('[data-question-content]').getBoundingClientRect();
        return input.top >= content.top - 1 && input.bottom <= content.bottom + 1;
      }, {}, selector);
      const boxes = await page.evaluate(selector => {
        const rect = node => {
          const r = node.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
        };
        const hit = node => {
          const r = node.getBoundingClientRect();
          return node.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        };
        const skip = document.querySelector('[data-question-action="skip"]');
        const next = document.querySelector('[data-question-action="next"]');
        const content = document.querySelector('[data-question-content]');
        const result = { skip: rect(skip), next: rect(next), content: rect(content),
          input: rect(document.querySelector(selector)), hitSkip: hit(skip), hitNext: hit(next),
          overflow: document.documentElement.scrollWidth > innerWidth };
        content.scrollTop = content.scrollHeight;
        result.scrolledSkip = rect(skip); result.scrolledNext = rect(next);
        return result;
      }, selector);
      for (const action of [boxes.skip, boxes.next]) {
        assert(action.top >= top && action.bottom <= top + height, 'Actions must stay above the keyboard');
        assert(action.height >= 44 && action.left >= 0, 'Keyboard actions must remain tappable');
      }
      assert(boxes.hitSkip && boxes.hitNext, 'Actions must not be covered by other content');
      assert(boxes.input.top >= boxes.content.top - 1 && boxes.input.bottom <= boxes.content.bottom + 1,
        'Focused input must fit between the header and Next');
      assert.deepEqual(boxes.skip, boxes.scrolledSkip, 'Scrolling answers must not move Skip');
      assert.deepEqual(boxes.next, boxes.scrolledNext, 'Scrolling answers must not move Next');
      assert(!boxes.overflow, 'Keyboard layout must not overflow horizontally');
    };
    for (const width of [320, 360, 390, 515, 768]) {
      await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true });
      await checkKeyboard(320);
      await checkKeyboard(280, 64);
      await closeKeyboard();
    }
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await checkKeyboard(350, 24);
    await page.screenshot({ path: keyboardScreenshot });
    await closeKeyboard();
    // Browser chrome changes and pinch zoom are not keyboard opening events.
    await page.evaluate(() => window.setKeyboardFixture({ height: 770 }));
    await page.waitForFunction(() => document.querySelector('[data-question-viewport]')?.dataset.keyboardOpen === 'false');
    await page.evaluate(() => window.setKeyboardFixture({ height: innerHeight / 1.5, width: innerWidth / 1.5, scale: 1.5 }));
    await page.waitForFunction(() => document.querySelector('[data-question-viewport]')?.dataset.keyboardOpen === 'false');
    await checkKeyboard(300, 24, 'fieldset input', 1.5);
    await closeKeyboard();
    // Some browsers resize the layout viewport as well as the visual viewport.
    await page.setViewport({ width: 390, height: 360, isMobile: true, hasTouch: true });
    await page.waitForFunction(() => document.querySelector('[data-question-viewport]')?.dataset.keyboardOpen === 'true');
    await checkKeyboard(360);
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await closeKeyboard();

    // Preserve the router's history payload, consume one Back for the keyboard,
    // then allow the next Back through without changing the answer or question.
    const formUrl = page.url();
    await page.evaluate(url => {
      history.replaceState({ __NA: true, tree: { fixture: 'router-state' } }, '', '/previous');
      history.pushState({ __NA: true, tree: { fixture: 'router-state' } }, '', url);
    }, formUrl);
    await page.type('fieldset input', 'Kept after Back');
    await checkKeyboard(340);
    assert.deepEqual(await page.evaluate(() => history.state.tree), { fixture: 'router-state' });
    await page.evaluate(() => history.back());
    await page.waitForFunction(() => !history.state?.niqahaProfileKeyboard && document.activeElement.tagName !== 'INPUT');
    assert.equal(page.url(), formUrl, 'Back with keyboard open must stay on this page');
    assert.equal(await page.$eval('fieldset input', input => input.value), 'Kept after Back');
    await closeKeyboard();
    await page.evaluate(() => history.back());
    await page.waitForFunction(() => location.pathname === '/previous');
    await page.evaluate(() => history.forward());
    await page.waitForFunction(url => location.href === url, {}, formUrl);
    await page.click('fieldset input', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    // A native keyboard resize immediately followed by popstate must not go back twice.
    await checkKeyboard(340);
    await page.evaluate(() => { window.setKeyboardFixture(null); history.back(); });
    await closeKeyboard();
    assert.equal(page.url(), formUrl, 'Native keyboard close plus Back must not traverse twice');
    await checkKeyboard(340);
    await page.click('[data-question-action="back"]');
    await closeKeyboard();
    assert.equal(await page.$eval('#qb-question', el => el.textContent), 'Question 1', 'In-form Back must dismiss the keyboard first');

    await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true });
    assert(await page.$eval(nextButton, button => button.disabled), 'Empty required answers must disable Next');
    await page.type('fieldset input', '   ');
    assert(await page.$eval(nextButton, button => button.disabled), 'Whitespace must not enable required Next');
    await page.click('fieldset input', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.click(nextButton);
    assert.equal(await page.$eval('#qb-question', el => el.textContent), 'Question 1', 'Empty required Next stays blocked');
    assert.equal(requests.length, 0);
    await page.click(skipButton);
    await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'Question 2');

    await page.type('fieldset input', 'Latest typed answer');
    assert(await page.$eval(nextButton, button => !button.disabled), 'An answer must enable Next immediately');
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
    await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'Question 4');
    assert.equal(profile.dynamicAnswers[ids[2]], 'Bangladesh', 'Answered country must be skipped automatically');
    await page.click('[data-question-action="back"]');
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
    await checkKeyboard(340, 20);
    await page.type('fieldset input', 'a');
    assert(await page.$$eval('fieldset li', items => items.length > 4), 'Long keyboard search results must remain available');
    await checkKeyboard(340, 20);
    await page.click('fieldset input', { clickCount: 3 });
    await page.keyboard.press('Backspace');
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

    await checkKeyboard(340, 20, 'fieldset textarea');
    await page.type('fieldset textarea', 'Final saved answer');
    hold = true; received = once(events, 'save');
    await page.click(nextButton); await received;
    assert.equal(await page.$eval('#qb-question', el => el.textContent), 'Question 4', 'Level completion must wait for its save');
    hold = false; pending.splice(0).forEach(finish => finish());
    await page.waitForFunction(() => !document.querySelector('#qb-question') && document.body.textContent.includes('প্রায় শেষ'));
    assert.equal(profile.dynamicAnswers[ids[3]], 'Final saved answer');
    assert(await page.evaluate(() => ![...document.querySelectorAll('button')].some(button => button.textContent.includes('বায়োডাটা জমা দিন'))),
      'Skipping must not bypass final required answers');

    for (const kind of ['upazila', 'city']) {
      await page.goto('http://127.0.0.1:' + server.address().port + '/locations/' + kind);
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.includes('যেখানে থেমেছিলেন')));
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('যেখানে থেমেছিলেন')).click());
      await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'বর্তমান ঠিকানার বিস্তারিত');
      assert(await page.$eval(nextButton, button => button.disabled));
      await page.type('fieldset textarea', 'Road 1');
      await page.click(nextButton);
      await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'জেলা নির্বাচন করুন');
      await page.evaluate(() => {
        [...document.querySelectorAll('fieldset button')].find(button => button.textContent.includes('Dhaka')).click();
        document.querySelector('[data-question-action="next"]').click();
      });
      await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'City corporation');
      if (kind === 'upazila') {
        await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'উপজেলা নির্বাচন করুন').click());
        await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'উপজেলা নির্বাচন করুন');
      }
      assert(await page.$eval(nextButton, button => button.disabled));
      await page.evaluate(label => {
        [...document.querySelectorAll('fieldset button')].find(button => button.textContent.includes(label)).click();
        document.querySelector('[data-question-action="next"]').click();
      }, kind === 'upazila' ? 'Savar' : 'Dhaka North');
      await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'Area');
      await page.type('fieldset input', 'Mirpur');
      await page.click(nextButton);
      await page.waitForFunction(() => document.querySelector('#qb-question')?.textContent === 'Final question');
      assert.equal(locationProfiles['/locations/' + kind].address.presentAddress, 'Road 1');
      assert.equal(locationProfiles['/locations/' + kind].address.area, 'Mirpur');
      assert.equal(locationProfiles['/locations/' + kind].draftStep, 1);
      await page.click(nextButton);
      await page.waitForFunction(() => !document.querySelector('#qb-question') && document.body.textContent.includes('মাশাআল্লাহ, আপনার বায়োডাটা তৈরি!'));
    }
    assert.deepEqual(errors, []);
    console.log('PASS: keyboard Back/history, required Next, address/city/upazila/area progression, no answered-question repeats, 320–768px keyboard layout, saves/retries and submission checks');
    console.log('Screenshot: ' + screenshot);
    console.log('Keyboard screenshot: ' + keyboardScreenshot);
  } finally {
    hold = false; pending.splice(0).forEach(finish => finish());
    await browser?.close();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
