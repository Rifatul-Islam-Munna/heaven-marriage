import { Connection } from 'mongoose';
import { VisualContentService } from './visual-content.service';

type Doc = {
  scope: string;
  draft?: Record<string, string>;
  published?: Record<string, string>;
  updatedAt?: Date;
  publishedAt?: Date;
};
function fakeDb() {
  const records = new Map<string, Doc>();
  const audits: object[] = [];
  const visual = {
    async findOne({ scope }: { scope: string }) {
      return records.get(scope) || null;
    },
    async updateOne({ scope }: { scope: string }, update: any, opts?: { upsert?: boolean }) {
      let document = records.get(scope);
      if (!document) {
        if (!opts?.upsert) return;
        document = { scope };
        records.set(scope, document);
      }
      if (Array.isArray(update)) {
        // Model MongoDB's atomic copy of the current draft, used for publish.
        document.published = { ...document.draft };
        document.publishedAt = new Date();
      } else {
        for (const [k, v] of Object.entries(update.$set || {})) {
          if (k.startsWith('draft.')) {
            document.draft ||= {};
            document.draft[k.slice(6)] = v as string;
          } else (document as Record<string, unknown>)[k] = v;
        }
        for (const k of Object.keys(update.$unset || {})) {
          if (k.startsWith('draft.')) delete document.draft?.[k.slice(6)];
        }
      }
    },
    find() {
      return {
        sort() { return this; },
        limit() { return this; },
        async toArray() { return [...records.values()]; },
      };
    },
  };
  const connection = {
    collection(name: string) {
      return name === 'visual_content_audit'
        ? { async insertOne(entry: object) { audits.push(entry); } }
        : visual;
    },
  } as unknown as Connection;
  return { service: new VisualContentService(connection), records, audits };
}
const titleKey = 't_aabbccddeeff0011';
const subtitleKey = 't_11223344aabbccdd';
const navKey = 't_00224466aabbccdd';

describe('Visual editor draft/publish and original-content fallback', () => {
  it('does not create records when only reading a page', async () => {
    const { service, records } = fakeDb();
    expect(await service.publicPage('/')).toEqual({ path: '/', page: {}, global: {} });
    expect(records.size).toBe(0);
  });
  it('saves all edits, publishes a complete snapshot, and restores defaults', async () => {
    const { service, records, audits } = fakeDb();
    await service.update('admin1', { scope: '/', key: titleKey, value: 'مرحباً' });
    await service.update('admin1', { scope: '/', key: subtitleKey, value: 'নতুন শিরোনাম' });
    expect((await service.publicPage('/')).page).toEqual({});
    await service.publish('admin1', { scope: '/' });
    expect((await service.publicPage('/')).page).toEqual({
      [titleKey]: 'مرحباً',
      [subtitleKey]: 'নতুন শিরোনাম',
    });
    await service.reset('admin1', { scope: '/', key: titleKey });
    const editor = await service.adminPage('/');
    expect(editor.page.draft).toEqual({ [subtitleKey]: 'নতুন শিরোনাম' });
    expect(editor.page.published[titleKey]).toBe('مرحباً');
    await service.publish('admin1', { scope: '/' });
    expect((await service.publicPage('/')).page).toEqual({
      [subtitleKey]: 'নতুন শিরোনাম',
    });
    await service.reset('admin1', { scope: '/', key: subtitleKey });
    await service.publish('admin1', { scope: '/' });
    expect((await service.publicPage('/')).page).toEqual({});
    expect(records.get('/')?.draft).toEqual({});
    expect(audits.length).toBe(7);
  });
  it('isolates each page and shares navigation/footer overrides', async () => {
    const { service } = fakeDb();
    await service.update('admin1', { scope: '/about', key: titleKey, value: 'About override' });
    await service.update('admin1', { scope: '@global', key: navKey, value: 'Navigation' });
    await service.publish('admin1', { scope: '/about' });
    await service.publish('admin1', { scope: '@global' });
    expect((await service.publicPage('/faq')).page).toEqual({});
    expect((await service.publicPage('/faq')).global).toEqual({ [navKey]: 'Navigation' });
    expect((await service.publicPage('/about')).page).toEqual({ [titleKey]: 'About override' });
  });
  it('rejects script-like selectors and invalid payloads', async () => {
    const { service } = fakeDb();
    await expect(service.update('admin1', { scope: '/', key: 'draft.__proto__', value: 'x' })).rejects.toThrow();
    await expect(service.update('admin1', { scope: '/api/private', key: titleKey, value: 'x' })).rejects.toThrow();
    await expect(service.update('admin1', { scope: '/', key: titleKey, value: 'x'.repeat(10001) })).rejects.toThrow();
  });
});
