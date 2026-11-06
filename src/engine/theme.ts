export type ThemeName = "light" | "dark";

const DARK: Record<string, string> = {
  "#121417": "#F2F3F5",
  "#16181C": "#F2F3F5",
  "#F7F8FA": "#16181C",
  "#62666D": "#A7ADB6",
  "#43474E": "#C8CDD4",
  "#D7DADE": "#343A44",
  "#FFFFFF": "#1A1D24",
  "#4C5BD4": "#9AA6F5",
  "#8F949B": "#9AA0A8",
  "#9DA2A9": "#4A5160",
  "#E1E3E6": "#2A2E36",
  "#131518": "#0C0D10",
  "#30343A": "#3A3F47",
  "#25282D": "#2E333C",
  "#D9D9D9": "#3A3F48",
};

export function readTheme(): ThemeName {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function paint(color: string | undefined, theme: ThemeName): string | undefined {
  if (!color || theme === "light") return color;
  return DARK[color.toUpperCase()] ?? color;
}
