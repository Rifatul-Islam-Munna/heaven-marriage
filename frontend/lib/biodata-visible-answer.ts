/**
 * Compatibility guard for cached public-profile responses from older servers.
 * Never render broken text like "[সংরক্ষিত]Sadar", even in custom multiple
 * answers. The backend owns privacy and preserves original saved data.
 */
export function visiblePublicAnswer(value: unknown): unknown {
  if (typeof value === "string") {
    return value.includes("[সংরক্ষিত]") ? undefined : value;
  }
  if (Array.isArray(value)) {
    const visible = value.map(visiblePublicAnswer)
      .filter(item => item !== undefined && item !== null);
    return visible.length ? visible : undefined;
  }
  if (value && typeof value === "object") {
    const visible = Object.entries(value).map(([key, item]) =>
      [key, visiblePublicAnswer(item)] as const)
      .filter(([, item]) => item !== undefined && item !== null);
    return Object.fromEntries(visible);
  }
  return value;
}
