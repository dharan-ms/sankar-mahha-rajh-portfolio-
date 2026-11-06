import type { FontStyle } from "./types";

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
const cache = new Map<string, { w: number; h: number; lines: number[] }>();

export function fontFamily(style: FontStyle): string {
  return style.font === "mono"
    ? '"JetBrains Mono", ui-monospace, monospace'
    : "Inter, system-ui, sans-serif";
}

export function lineHeight(style: FontStyle, size = style.size): number {
  return Math.round(size * style.lh);
}

export function measure(text: string, style: FontStyle, size: number, maxWidth?: number) {
  const key = `${text}|${style.font}|${style.weight}|${size}|${style.ls ?? 0}|${maxWidth ?? -1}|${style.pre ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const widths: number[] = [];
  if (!ctx) {
    const guess = Math.max(2, text.length * size * 0.52);
    const box = { w: Math.ceil(maxWidth ?? guess), h: lineHeight(style, size), lines: [guess] };
    cache.set(key, box);
    return box;
  }
  ctx.font = `${style.weight} ${size}px ${fontFamily(style)}`;
  try {
    ctx.letterSpacing = `${(style.ls ?? 0) * size}px`;
  } catch {
    /* older canvas implementations */
  }
  for (const rawLine of text.split("\n")) {
    if (maxWidth == null || style.pre) {
      widths.push(ctx.measureText(rawLine).width);
      continue;
    }
    const words = rawLine.split(" ");
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(next).width > maxWidth) {
        widths.push(ctx.measureText(current).width);
        current = word;
      } else {
        current = next;
      }
    }
    widths.push(ctx.measureText(current).width);
  }
  const width = maxWidth ?? Math.max(0, ...widths, 0);
  const box = {
    w: Math.ceil(width),
    h: Math.max(1, widths.length) * lineHeight(style, size),
    lines: widths,
  };
  cache.set(key, box);
  return box;
}
