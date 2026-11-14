export type Appearance = {
  light: string;
  dark: string;
  home: string[];
  standings: string[];
};

export function prioritize<T>(
  items: T[],
  order: string[] | undefined,
  key: (item: T) => string,
) {
  if (!order?.length) return items;
  const priority = new Map(order.map((id, index) => [id, index]));
  return [...items].sort(
    (a, b) =>
      (priority.get(key(a)) ?? Infinity) - (priority.get(key(b)) ?? Infinity),
  );
}

export function readAppearanceDraft(key: string): Appearance | undefined {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    const { light, dark, home, standings } = JSON.parse(raw) as Appearance;
    const isColor = (value: unknown) =>
      typeof value === "string" &&
      (value === "" || /^#[0-9a-f]{6}$/i.test(value));
    const isOrder = (value: unknown) =>
      Array.isArray(value) &&
      value.length <= 100 &&
      value.every(
        (key) => typeof key === "string" && /^[a-z-]+\/[a-z0-9._-]+$/.test(key),
      );
    if (isColor(light) && isColor(dark) && isOrder(home) && isOrder(standings))
      return { light, dark, home, standings };
  } catch {
    // Invalid drafts and blocked storage fall back to the published settings.
  }
}
