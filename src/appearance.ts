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
