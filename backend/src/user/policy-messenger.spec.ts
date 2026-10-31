import { createHash } from 'node:crypto';
import { suppliedPolicies, resolvePolicySettings } from './policy-defaults';
import { normalizeMessengerUrl } from './messenger-url';
import { PublicController } from './public.controller';
import { PlatformController } from './platform.controller';
describe('Supplied policy pages and Messenger settings', () => {
  it('preserves every policy paragraph and its source digest', () => {
    for (const kind of ['terms', 'refund'] as const) {
      const p = suppliedPolicies[kind];
      expect(p.blocks.map((b) => b.text).join('\n\n')).toBe(p.text);
      expect(createHash('sha256').update(p.text).digest('hex')).toBe(p.sha256);
    }
    expect(suppliedPolicies.terms.blocks).toHaveLength(157);
    expect(suppliedPolicies.refund.blocks).toHaveLength(101);
    expect(suppliedPolicies.terms.text).not.toContain(
      'Turn on screen reader support',
    );
    expect(suppliedPolicies.terms.text).toContain(
      'প্রকাশের তারিখে পূরণ করতে হবে',
    );
  });
  it('publishes the supplied versions over previous empty placeholders and retains future admin edits', () => {
    const current = resolvePolicySettings({
      termsPublished: false,
      refundPublished: false,
    });
    expect(current.terms).toBe(suppliedPolicies.terms.text);
    expect(current.termsPublished).toBe(true);
    const edited = resolvePolicySettings({
      terms: 'Approved edit',
      termsPublished: false,
      termsSourceHash: suppliedPolicies.terms.sha256,
    });
    expect(edited.terms).toBe('Approved edit');
    expect(edited.termsPublished).toBe(false);
  });
  it('returns exact document text and headings from the public API', async () => {
    const db = { collection: () => ({ findOne: async () => null }) };
    const c = new PublicController({} as any, db as any);
    expect((await c.settings()).policies).toMatchObject({
      terms: true,
      refund: true,
      privacy: false,
    });
    const p = await c.policy('terms');
    expect(p.text).toBe(suppliedPolicies.terms.text);
    expect(p.blocks).toEqual(suppliedPolicies.terms.blocks);
  });
  it('honors an explicit admin unpublish on the supplied version', async () => {
    const db = {
      collection: () => ({
        findOne: async () => ({
          terms: suppliedPolicies.terms.text,
          termsPublished: false,
          termsSourceHash: suppliedPolicies.terms.sha256,
        }),
      }),
    };
    await expect(
      new PublicController({} as any, db as any).policy('terms'),
    ).rejects.toThrow();
  });
  it('normalizes only supported HTTPS Messenger destinations', () => {
    expect(normalizeMessengerUrl(' m.me/niqaha.page ')).toBe(
      'https://m.me/niqaha.page',
    );
    expect(normalizeMessengerUrl('https://www.messenger.com/t/123')).toBe(
      'https://messenger.com/t/123',
    );
    expect(
      normalizeMessengerUrl('https://www.facebook.com/messages/t/123'),
    ).toBe('https://facebook.com/messages/t/123');
    for (const url of [
      'javascript:alert(1)',
      'https://m.me.evil.example/page',
      'https://evil.example',
      'http://m.me/page',
      'https://name:pass@m.me/page',
      'https://facebook.com/random-page',
    ])
      expect(normalizeMessengerUrl(url)).toBe('');
  });
  it('saves a Messenger URL without overwriting the policies and exposes it on the landing-page settings API', async () => {
    let state: any = {
      terms: suppliedPolicies.terms.text,
      termsPublished: true,
      termsSourceHash: suppliedPolicies.terms.sha256,
    };
    const db = {
      collection: () => ({
        findOne: async () => state,
        updateOne: async (_f: any, u: any) => {
          state = { ...state, ...u.$set };
        },
      }),
    };
    const service = { audit: jest.fn() };
    const c = new PlatformController(
      service as any,
      {} as any,
      {} as any, // QuestionConfigService; unused in this settings test
      db as any,
      {} as any,
    );
    await c.saveSettings({ user: { id: 'test-admin' } } as any, {
      messengerUrl: 'm.me/niqaha.page',
    });
    expect(state.messengerUrl).toBe('https://m.me/niqaha.page');
    expect(state.terms).toBe(suppliedPolicies.terms.text);
    expect(
      (await new PublicController({} as any, db as any).settings())
        .messengerUrl,
    ).toBe('https://m.me/niqaha.page');
    await expect(
      c.saveSettings({ user: { id: 'test-admin' } } as any, {
        messengerUrl: 'https://evil.example',
      }),
    ).rejects.toThrow();
  });
});
