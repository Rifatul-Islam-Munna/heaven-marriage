// Production smoke test: an isolated fake NestJS endpoint, real Next.js server,
// cache validation and (when Chrome is installed) click-to-edit browser coverage.
// Run after npm run build: node scripts/smoke-visual-content.mjs
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const docs = new Map();
const calls = new Map();
const empty = () => ({ draft: {}, published: {}, updatedAt: null, publishedAt: null });
const doc = (scope) => {
  if (!docs.has(scope)) docs.set(scope, empty());
  return docs.get(scope);
};
const json = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
const backend = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if(url.pathname==='/staff-access/me'){
    if(req.headers.access_token==='smoke-token')return json(res,200,{role:'admin',isAdmin:true,permissions:['users','faq','guidelines','contact','visual-editor','seo','blog','images','pricing','questions','settings','upgrades']});
    return json(res,401,{message:'Unauthorized'});
  }
  if (url.pathname === '/visual-content' && req.method === 'GET') {
    const scope = url.searchParams.get('path') || '/';
    calls.set(scope, (calls.get(scope) || 0) + 1);
    return json(res, 200, { path: scope, page: doc(scope).published, global: doc('@global').published });
  }
  if (url.pathname.startsWith('/visual-content/admin')) {
    if (req.headers.access_token !== 'smoke-token') return json(res, 401, { message: 'Unauthorized' });
    if (url.pathname.endsWith('/list') && req.method === 'GET') return json(res, 200, []);
    if (req.method === 'GET') {
      const scope = url.searchParams.get('path') || '/';
      return json(res, 200, { path: scope, page: doc(scope), global: doc('@global') });
    }
    let text = '';
    for await (const chunk of req) text += chunk.toString();
    const payload = JSON.parse(text || '{}');
    const record = doc(payload.scope);
    if (req.method === 'PATCH') {
      record.draft[payload.key] = payload.value;
      return json(res, 200, { ...payload });
    }
    if (req.method === 'DELETE') {
      delete record.draft[payload.key];
      return json(res, 200, { scope: payload.scope, key: payload.key });
    }
    if (req.method === 'POST' && url.pathname.endsWith('/publish')) {
      record.published = { ...record.draft };
      return json(res, 200, { scope: payload.scope, message: 'Published' });
    }
  }
  return json(res, 404, { message: 'Mock route not found' });
});
const port = async () => {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const p = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return p;
};
const request = async (url, options) => {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
  return { response, json: await response.json() };
};
let next;
let browser;
try {
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const backendPort = backend.address().port;
  const frontPort = await port();
  const base = 'http://127.0.0.1:' + frontPort;
  next = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(frontPort)], {
    cwd: root, env: { ...process.env, BASE_URL: 'http://127.0.0.1:' + backendPort },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let serverLogs = '';
  next.stdout.on('data', buffer => { serverLogs += buffer.toString(); });
  next.stderr.on('data', buffer => { serverLogs += buffer.toString(); });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (next.exitCode !== null) throw Error('Next server exited: ' + serverLogs);
    try {
      const r = await fetch(base + '/api/visual-content?path=%2Fabout', { signal: AbortSignal.timeout(800) });
      if (r.ok) { ready = true; break; }
    } catch { /* Still booting. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  assert.ok(ready, 'Next production server failed to start: ' + serverLogs);
  // One warm-up fetch. The subsequent visits MUST reuse the Data Cache.
  const first = await request(base + '/api/visual-content?path=%2Fabout');
  assert.deepEqual(first.json.page, {});
  const originalCount = calls.get('/about');
  for (let i = 0; i < 7; i++) {
    const item = await request(base + '/api/visual-content?path=%2Fabout');
    assert.deepEqual(item.json.page, {});
  }
  assert.equal(calls.get('/about'), originalCount, 'Repeated visitors hit NestJS despite a warm cache');
  console.log('PASS: eight visitors to /about hit NestJS just once.');

  const denied = await request(base + '/api/visual-content?mode=admin&path=%2Fabout');
  assert.equal(denied.response.status, 401);
  console.log('PASS: admin endpoint is private.');

  const post = (method, payload) => request(base + '/api/visual-content', {
    method,
    headers: {
      Cookie: 'access_token=smoke-token',
      Origin: base, 'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const key = 't_aabbccddeeff0011';
  assert.equal((await post('PATCH', { scope: '/about', key, value: 'اختبار عربي' })).response.status, 200);
  assert.deepEqual((await request(base + '/api/visual-content?path=%2Fabout')).json.page, {},
    'Draft must not leak to visitors');
  assert.equal((await post('POST', { scope: '/about' })).response.status, 200);
  assert.equal((await request(base + '/api/visual-content?path=%2Fabout')).json.page[key], 'اختبار عربي',
    'Published override must be visible after cache invalidation');
  assert.equal(calls.get('/about'), originalCount + 1,
    'Publish must invalidate the cached public content');
  console.log('PASS: drafts stay private, publish invalidates the 20-minute Next cache.');

  assert.equal((await post('DELETE', { scope: '/about', key })).response.status, 200);
  assert.equal((await post('POST', { scope: '/about' })).response.status, 200);
  assert.deepEqual((await request(base + '/api/visual-content?path=%2Fabout')).json.page, {});
  console.log('PASS: restoring default removes the DB override.');

  // Optional real browser check, using an isolated fake editor session.
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const chrome = chromePaths.find(existsSync);
  let puppeteer = null;
  try { puppeteer = require(path.resolve(root, '../backend/node_modules/puppeteer')); } catch { /* Optional */ }
  if (chrome && puppeteer) {
    browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setCookie({
      name: 'access_token', value: 'smoke-token', url: base, httpOnly: true,
    }, {
      name: 'user', value: JSON.stringify({ name: 'Smoke Admin', role: 'admin' }),
      url: base, httpOnly: true,
    });
    await page.goto(base + '/about?visualEdit=1', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('[data-visual-editor-ui]', { timeout: 20000 });
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.click('h1');
    await page.waitForSelector('[role="dialog"] textarea', { timeout: 10000 });
    await page.focus('[role="dialog"] textarea');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.type('تجربة المحرر');
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('aside[role="dialog"] button')];
      const save = buttons.find(button => button.textContent?.includes('Save draft'));
      if (!save) throw Error('Save button is missing');
      save.click();
    });
    await page.waitForFunction(() => document.body.textContent.includes('Draft saved to MongoDB'), { timeout: 12000 });
    assert.ok(Object.values(doc('/about').draft).includes('تجربة المحرر'),
      'Chrome edit was not saved to backend');
    console.log('PASS: Chrome click-to-edit and draft save.');

    page.on('dialog', async dialog => dialog.accept());
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')]
        .find(el => el.textContent?.includes('Publish page'));
      if (!button) throw Error('Publish button not found');
      button.click();
    });
    await page.waitForFunction(() => document.body.textContent.includes('Public cache invalidated'), { timeout: 12000 });
    assert.ok(Object.values(doc('/about').published).includes('تجربة المحرر'));
    await page.goto(base + '/about', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('تجربة المحرر'), { timeout: 12000 });
    console.log('PASS: Chrome publish updates the public site.');

    await page.goto(base + '/about?visualEdit=1', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('[data-visual-editor-ui]', { timeout: 15000 });
    await page.click('h1');
    await page.waitForSelector('aside[role="dialog"]', { timeout: 10000 });
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('aside[role="dialog"] button')]
        .find(el => el.textContent?.includes('Restore default'));
      if (!button) throw Error('Restore default button missing');
      button.click();
    });
    await page.waitForFunction(() => document.body.textContent.includes('Override removed from draft'), { timeout: 12000 });
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')]
        .find(el => el.textContent?.includes('Publish page'));
      if (!button) throw Error('Publish button not found');
      button.click();
    });
    await page.waitForFunction(() => document.body.textContent.includes('Public cache invalidated'), { timeout: 12000 });
    await page.goto(base + '/about', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('niqaha সম্পর্কে'), { timeout: 12000 });
    console.log('PASS: Chrome restore-default returns to original JSX text.');
  } else {
    console.log('INFO: Browser UI smoke skipped (Chrome/Puppeteer unavailable).');
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  if (next) next.kill();
  await new Promise(resolve => backend.close(resolve));
}
