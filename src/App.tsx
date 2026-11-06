import { useEffect, useState } from "react";
import { portfolio } from "./data/portfolio";
import { Stage, useEngine } from "./engine/Stage";
import { readTheme, type ThemeName } from "./engine/theme";

const links = [
  ...portfolio.nav,
  { label: "Stack", href: "#stack" },
  { label: "Contact", href: "#contact" },
  ...portfolio.contact.socials.filter((item) => item.url).map((item) => ({ label: item.label, href: item.url })),
];

export default function App() {
  const engine = useEngine();
  const [theme, setTheme] = useState<ThemeName>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);
  return (
    <>
      <a className="skip" href="#about">
        Skip to content
      </a>
      <button
        type="button"
        className="theme-toggle"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      >
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </button>
      <nav className="sr-only" aria-label="Sections">
        {links.map((link) => (
          <a key={link.href + link.label} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <main>{engine ? <Stage engine={engine} theme={theme} /> : <div className="page" style={{ minHeight: "100vh" }} />}</main>
    </>
  );
}
