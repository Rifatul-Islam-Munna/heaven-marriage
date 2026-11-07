import { selectDiscovery, dailyRotationExpression } from './discovery-selection';

describe('Fair public discovery selection', () => {
  const profiles = Array.from({ length: 24 }, (_, i) => ({
    _id: String(i + 1),
    userId: String(i + 1).padStart(6, '0'),
  }));
  it('shows real ranking positions and never repeats a member', () => {
    const selection = selectDiscovery(
      profiles.slice(0, 8),
      [...profiles.slice(8, 14), ...profiles.slice(0, 3)],
      [...profiles.slice(14), ...profiles.slice(0, 3)],
      new Date('2026-11-06T12:00:00Z'),
    );
    expect(selection.popular).toHaveLength(4);
    expect(selection.recent).toHaveLength(4);
    expect(selection.popular[0].rankingPosition).toBe(1);
    expect(selection.popular.every(p => p.discoverySource === 'ranked')).toBe(true);
    expect(selection.recent.filter(p => p.discoverySource === 'fresh')).toHaveLength(2);
    expect(selection.recent.filter(p => p.discoverySource === 'explore')).toHaveLength(2);
    expect(new Set([...selection.popular, ...selection.recent].map(p => p._id)).size).toBe(8);
  });
  it('rotates the same pool daily without randomly changing a page during a day', () => {
    const today = new Date('2026-11-06T12:00:00Z');
    const sameDay = new Date('2026-11-06T23:59:00Z');
    const tomorrow = new Date('2026-11-07T12:00:00Z');
    const select = (date: Date) => selectDiscovery(profiles.slice(0, 12), profiles.slice(12), profiles.slice(12), date);
    expect(select(today)).toEqual(select(sameDay));
    expect(select(today).popular.map(p => p._id)).not.toEqual(select(tomorrow).popular.map(p => p._id));
    expect(dailyRotationExpression(today)).toEqual(dailyRotationExpression(sameDay));
    expect(dailyRotationExpression(today)).not.toEqual(dailyRotationExpression(tomorrow));
  });
  it('works with small populations and never invents ranking data', () => {
    const first = profiles[0];
    const selection = selectDiscovery([], [first], [first]);
    expect(selection.popular).toEqual([]);
    expect(selection.recent).toEqual([{...first, discoverySource: 'fresh'}]);
  });
});
