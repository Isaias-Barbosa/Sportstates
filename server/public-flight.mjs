// Parse public Next.js Flight JSON as data. Never execute page scripts.
export function flightObjects(html) {
  if (typeof html !== "string" || html.length > 3_000_000)
    throw Error("Resposta de programação inválida.");
  let text = "";
  for (const m of html.matchAll(
    /self\.__next_f\.push\((\[.*?\])\)<\/script>/g,
  )) {
    try {
      const part = JSON.parse(m[1]);
      if (part[0] === 1 && typeof part[1] === "string") text += part[1];
    } catch {}
  }
  const objects = [];
  let count = 0;
  function visit(v, depth = 0) {
    if (depth > 40 || ++count > 100000) return;
    if (Array.isArray(v)) v.forEach((x) => visit(x, depth + 1));
    else if (v && typeof v === "object") {
      objects.push(v);
      Object.values(v).forEach((x) => visit(x, depth + 1));
    }
  }
  for (const line of text.split("\n")) {
    try {
      visit(JSON.parse(line.slice(line.indexOf(":") + 1)));
    } catch {}
  }
  return objects;
}
