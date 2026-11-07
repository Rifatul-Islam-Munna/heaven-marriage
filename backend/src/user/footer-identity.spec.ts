import { PlatformController } from './platform.controller';
import { PublicController } from './public.controller';

describe('Footer public business identity settings', () => {
  let state: Record<string, any>;
  let controller: PlatformController;
  let publicController: PublicController;
  const admin = { user: { id: 'test-admin' } } as any;
  const audit = jest.fn();
  const db = {
    collection: () => ({
      findOne: async () => state,
      updateOne: async (_query: unknown, u: { $set: Record<string, unknown> }) => {
        state = { ...state, ...u.$set };
      },
    }),
  };

  beforeEach(() => {
    state = {
      messengerUrl: 'https://m.me/niqaha.page',
      termsPublished: true,
      discoveryEnabled: true,
    };
    audit.mockReset();
    controller = new PlatformController(
      { audit } as any, {} as any, {} as any, db as any, {} as any,
    );
    publicController = new PublicController({} as any, db as any);
  });

  it('publishes an admin-entered real licence number and safe TikTok profile URL', async () => {
    await controller.saveSettings(admin, {
      tradeLicenseNumber: ' DCC/TRADE-2026/১২৩৪ ',
      tiktokUrl: 'https://tiktok.com/@niqaha.official?lang=bn',
    });
    expect(state.tradeLicenseNumber).toBe('DCC/TRADE-2026/১২৩৪');
    expect(state.tiktokUrl).toBe('https://www.tiktok.com/@niqaha.official');
    expect(state.messengerUrl).toBe('https://m.me/niqaha.page');
    expect(state.termsPublished).toBe(true);
    expect(audit).toHaveBeenCalledTimes(1);
    const p = await publicController.settings();
    expect(p.tradeLicenseNumber).toBe('DCC/TRADE-2026/১২৩৪');
    expect(p.tiktokUrl).toBe('https://www.tiktok.com/@niqaha.official');
    const adminSettings = await controller.settings();
    expect(adminSettings.tradeLicenseNumber).toBe('DCC/TRADE-2026/১২৩৪');
  });

  it('defaults to the official TikTok profile but allows admins to disable it', async () => {
    const p = await publicController.settings();
    expect(p.tradeLicenseNumber).toBe('');
    expect(p.tiktokUrl).toBe('https://www.tiktok.com/@niqaha.com');
    await controller.saveSettings(admin, { tradeLicenseNumber: '', tiktokUrl: '' });
    expect((await publicController.settings()).tradeLicenseNumber).toBe('');
    expect((await publicController.settings()).tiktokUrl).toBe('');
  });

  it.each([
    'http://www.tiktok.com/@niqaha',
    'https://evil.example/@niqaha',
    'https://tiktok.com.evil.example/@niqaha',
    'https://www.tiktok.com/video/12345',
    'https://www.tiktok.com:4433/@niqaha',
    'https://someone:password@www.tiktok.com/@niqaha',
    'javascript:alert(1)',
  ])('rejects unsafe or non-profile TikTok link: %s', async (link) => {
    await expect(controller.saveSettings(admin, { tiktokUrl: link }))
      .rejects.toThrow();
    expect(state.tiktokUrl).toBeUndefined();
    expect(audit).not.toHaveBeenCalled();
  });

  it('rejects invalid trade-license text and oversized values', async () => {
    for (const number of ['<script>alert(1)</script>', 'line\nbreak', 'x'.repeat(81)]) {
      await expect(controller.saveSettings(admin, { tradeLicenseNumber: number }))
        .rejects.toThrow();
    }
    expect(state.tradeLicenseNumber).toBeUndefined();
    expect(audit).not.toHaveBeenCalled();
  });
});
