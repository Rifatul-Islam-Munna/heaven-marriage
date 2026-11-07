/** Public biodata discovery: real engagement plus rotating exposure for new/less-seen members. */
export const engagementScoreExpression = {
  $add: [
    { $ifNull: ['$profileViews', 0] },
    { $multiply: [3, { $ifNull: ['$profileInterests', 0] }] },
    { $multiply: [5, { $ifNull: ['$profileContactRequests', 0] }] },
  ],
};

/**
 * A deterministic, day-dependent rotation key. Unlike $rand, it won't
 * reshuffle between pages and cause duplicates while a visitor browses.
 * Numeric biodata IDs are already assigned at signup.
 */
export function dailyRotationExpression(date: Date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  const prime = 1_000_003;
  // Change BOTH slope and offset daily. An offset-only hash keeps nearly
  // identical numeric IDs in the same relative order for many consecutive days.
  const factor = 225_000 + ((day * 104_729) % 750_000);
  const shift = (day * 97_531) % prime;
  return {
    $mod: [
      {
        $add: [
          {
            $multiply: [
              {
                $mod: [
                  { $convert: { input: '$userId', to: 'long', onError: 0, onNull: 0 } },
                  prime,
                ],
              },
              factor,
            ],
          },
          shift,
        ],
      },
      prime,
    ],
  };
}

export type DiscoverySource = 'ranked' | 'fresh' | 'explore';
type Candidate = { _id?: unknown; userId?: string };
type Selected<T> = T & { discoverySource: DiscoverySource; rankingPosition?: number };

function rotate<T>(items: T[], day: number): T[] {
  if (!items.length) return [];
  const offset = ((day % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

/** Select distinct cards: ranked, newly registered, and underexposed members. */
export function selectDiscovery<T extends Candidate>(
  ranked: T[],
  newest: T[],
  underexposed: T[],
  date: Date = new Date(),
  limit = 4,
): { popular: Selected<T>[]; recent: Selected<T>[] } {
  const day = Math.floor(date.getTime() / 86_400_000);
  const used = new Set<string>();
  const popular: Selected<T>[] = [];
  const recent: Selected<T>[] = [];
  const key = (u: T) => String(u._id ?? u.userId ?? '');
  const add = (
    into: Selected<T>[],
    profile: T,
    source: DiscoverySource,
    position?: number,
  ) => {
    const id = key(profile);
    if (!id || used.has(id) || into.length >= limit) return;
    used.add(id);
    into.push({
      ...profile,
      discoverySource: source,
      ...(position ? { rankingPosition: position } : {}),
    });
  };

  // The real #1 gets a consistent position; other ranked slots rotate daily.
  const orderedRanked = ranked.map((profile, i) => ({ profile, position: i + 1 }));
  for (const item of [
    ...orderedRanked.slice(0, 1),
    ...rotate(orderedRanked.slice(1), day),
  ]) add(popular, item.profile, 'ranked', item.position);

  // Half the second row is fresh; half is underexposed (not falsely labelled new).
  const orderedNewest = [...newest.slice(0, 1), ...rotate(newest.slice(1), day)];
  for (const profile of orderedNewest) {
    if (recent.length >= Math.ceil(limit / 2)) break;
    add(recent, profile, 'fresh');
  }
  const exploreTarget = limit;
  for (const profile of underexposed) {
    if (recent.length >= exploreTarget) break;
    add(recent, profile, 'explore');
  }
  // Small sites may not have enough underexposed members: fill with remaining new.
  for (const profile of orderedNewest) add(recent, profile, 'fresh');
  return { popular, recent };
}
