import { portfolio } from "./data/portfolio";
import { Stage, useEngine } from "./engine/Stage";

const links = [
  ...portfolio.nav,
  { label: "Stack", href: "#stack" },
  { label: "Contact", href: "#contact" },
  ...portfolio.contact.socials.filter((item) => item.url).map((item) => ({ label: item.label, href: item.url })),
];

export default function App() {
  const engine = useEngine();
  return (
    <>
      <a className="skip" href="#about">
        Skip to content
      </a>
      <nav className="sr-only" aria-label="Sections">
        {links.map((link) => (
          <a key={link.href + link.label} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <main>
        {engine ? (
          <Stage engine={engine} />
        ) : (
          <div className="page" style={{ minHeight: "100vh" }} />
        )}
      </main>
    </>
  );
}
