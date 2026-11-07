import { premiumRecommendationSmsTargets } from './recommendation-sms';

const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const expired = () => new Date(Date.now() - 24 * 60 * 60 * 1000);
const member = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id, phoneNumber: '01712345678', isSubscriber: false,
  premiumService: { expiresAt: future() }, isNew: true, ...extra,
});

describe('Premium recommendation SMS recipient policy', () => {
  it('sends to nobody when neither member has premium', () => {
    expect(premiumRecommendationSmsTargets([member('a'), member('b')])).toEqual([]);
  });
  it('sends to only the subscriber when one member has premium', () => {
    expect(premiumRecommendationSmsTargets([
      member('a', { isSubscriber: true }), member('b'),
    ])).toEqual([{ id: 'a', number: '01712345678' }]);
  });
  it('sends to both when both memberships are active', () => {
    expect(premiumRecommendationSmsTargets([
      member('a', { isSubscriber: true }),
      member('b', { isSubscriber: true, phoneNumber: '+8801812345678' }),
    ])).toEqual([
      { id: 'a', number: '01712345678' },
      { id: 'b', number: '+8801812345678' },
    ]);
  });
  it('does not send to an expired subscriber, invalid number, or repeated recommendation', () => {
    expect(premiumRecommendationSmsTargets([
      member('a', { isSubscriber: true, premiumService: { expiresAt: expired() } }),
      member('b', { isSubscriber: true, phoneNumber: '12345' }),
      member('c', { isSubscriber: true, isNew: false }),
    ])).toEqual([]);
  });
});
