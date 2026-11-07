import { scoreMatch } from './matching';

/** Both people must have express preferences for a reciprocal scored match. */
export function reciprocalMatch(source: any, candidate: any, settings: any = {}) {
  const forward = scoreMatch(source, candidate, settings);
  const reverse = scoreMatch(candidate, source, settings);
  const score = forward.score === null || reverse.score === null
    ? null : Math.round((forward.score + reverse.score) / 2);
  const coverage = Math.round((forward.coverage + reverse.coverage) / 2);
  return { profile: candidate, score, coverage, forward, reverse,
    matchedCount:forward.matchedCount + reverse.matchedCount,
    mismatchedCount:forward.mismatchedCount + reverse.mismatchedCount,
    unknownCount:forward.unknownCount + reverse.unknownCount };
}
export function compareReciprocal(a: ReturnType<typeof reciprocalMatch>, b: ReturnType<typeof reciprocalMatch>) {
  return (b.score ?? -1) - (a.score ?? -1) ||
    b.coverage - a.coverage ||
    String(a.profile._id).localeCompare(String(b.profile._id));
}
