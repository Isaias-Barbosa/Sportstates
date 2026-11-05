const segmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("pt-BR", { granularity: "grapheme" })
    : null;
const characters = (text) =>
  segmenter
    ? Array.from(segmenter.segment(text), (part) => part.segment)
    : Array.from(text);
export const showcaseFontSizes = ["small", "medium", "large"];
export const showcaseCharacterLimits = [40, 60, 88];
export const countShowcaseCharacters = (text) => characters(text).length;
export const trimShowcaseCharacters = (text, limit) =>
  characters(text).slice(0, limit).join("");
