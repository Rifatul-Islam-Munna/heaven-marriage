import { Connection, Types } from 'mongoose';

/**
 * Public discovery leaderboard periods are fixed 15-day UTC cycles.
 * Lifetime member stats remain untouched. Old cycles are excluded from ranking.
 */
export const DISCOVERY_CYCLE_DAYS = 15;
const CYCLE_MS = DISCOVERY_CYCLE_DAYS * 24 * 60 * 60 * 1000;
const weights = { views: 1, favourites: 3, connections: 5 } as const;
export type DiscoveryEvent = keyof typeof weights;

export function discoveryCycle(at: Date = new Date()) {
  const cycle = Math.floor(at.getTime() / CYCLE_MS);
  return {
    cycle,
    days: DISCOVERY_CYCLE_DAYS,
    startsAt: new Date(cycle * CYCLE_MS),
    endsAt: new Date((cycle + 1) * CYCLE_MS),
  };
}

/** Each event is counted only when its corresponding action was newly created. */
export async function recordDiscoveryEvent(
  db: Connection,
  target: string,
  kind: DiscoveryEvent,
  adjustment: 1 | -1 = 1,
  at: Date = new Date(),
): Promise<void> {
  if (!Types.ObjectId.isValid(target)) throw new Error('Invalid discovery target');
  const { cycle, endsAt } = discoveryCycle(at);
  const key = `${cycle}:${String(target)}`;
  const collection = db.collection('discovery_engagement');
  const delta = { [kind]: adjustment, score: weights[kind] * adjustment };

  if (adjustment === -1) {
    // Do not subtract an old-cycle favourite from this cycle, or go negative.
    await collection.updateOne(
      { _id: key as any, [kind]: { $gt: 0 }, score: { $gte: weights[kind] } },
      { $inc: delta },
    );
    return;
  }

  await collection.updateOne(
    { _id: key as any },
    {
      $inc: delta,
      $setOnInsert: {
        profileId: new Types.ObjectId(target),
        cycle,
        expiresAt: new Date(endsAt.getTime() + 2 * CYCLE_MS),
      },
    },
    { upsert: true },
  );
}

/** Query only active-cycle scores; previous 15-day periods never carry forward. */
export function cycleEngagementProjection() {
  return {
    views: { $ifNull: ['$views', 0] },
    favourites: { $ifNull: ['$favourites', 0] },
    connections: { $ifNull: ['$connections', 0] },
  };
}
