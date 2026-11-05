export const showcaseFontSizes: readonly ("small" | "medium" | "large")[];
export const showcaseCharacterLimits: readonly number[];
export function countShowcaseCharacters(text: string): number;
export function trimShowcaseCharacters(text: string, limit: number): string;
