import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { portfolio } from "./data/portfolio";
import "./styles.css";

document.title = portfolio.seo.title;
const description = document.querySelector('meta[name="description"]');
if (description) description.setAttribute("content", portfolio.seo.description);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
