import { portfolio } from "../data/portfolio";
import { measure } from "./measure";
import {
  CONTENT_X,
  MARGIN,
  OFF_L,
  OFF_R,
  RIGHT,
  type El,
  type FontStyle,
  type Group,
  type Pt,
  type Scene,
  type Task,
  type TextEl,
} from "./types";

const ink = "#121417";
const solid = "#16181C";
const muted = "#62666D";
const line = "#D7DADE";
const accent = "#4C5BD4";
const card = "#FFFFFF";
const codeBg = "#131518";
const onSolid = "#F7F8FA";

const sans = (size: number, weight: number, lh: number, color = ink, ls = 0): FontStyle => ({
  font: "sans",
  size,
  weight,
  lh,
  color,
  ls,
});

const mono = (size: number, color = muted, weight = 400, extra: Partial<FontStyle> = {}): FontStyle => ({
  font: "mono",
  size,
  weight,
  lh: 1.45,
  color,
  ...extra,
});

const R = {
  h1: sans(64, 600, 1.02, ink, -0.035),
  h2: sans(40, 600, 1.08, ink, -0.03),
  h3: sans(21, 600, 1.25, ink, -0.012),
  lead: sans(19, 400, 1.5, muted, -0.005),
  body: sans(15.5, 400, 1.55, muted),
  item: sans(14.5, 450, 1.4, ink),
  nav: sans(14, 500, 1.4, ink),
  btn: sans(14.5, 600, 1.4, onSolid),
  btnDark: sans(14.5, 600, 1.4, ink),
  logo: sans(18, 650, 1.3, "#43474E", -0.02),
  brand: sans(18, 650, 1.3, ink, -0.02),
  stat: sans(52, 600, 1, ink, -0.04),
  code: mono(13.5, "#E0E2E5", 400, { lh: 1.7, code: true, pre: true }),
  codeDim: mono(12, "#81868D"),
  nodeName: mono(13, ink, 500),
  nodeWhite: mono(14, "#F4F6F8", 500),
  small: mono(12, muted),
  year: mono(12, accent, 500),
};

export const MARK = {
  d: "M86 34C86 14 54 4 32 16C12 26 8 48 24 60C38 70 58 74 74 84C96 98 100 122 82 136C62 152 28 148 16 128C8 116 14 104 28 100L36 112C30 116 28 122 36 126C50 132 70 126 72 112C74 100 58 94 42 86C20 74 2 62 10 40C18 18 52 10 74 22L86 34Z",
  anchors: [
    [86, 34],
    [32, 16],
    [24, 60],
    [74, 84],
    [16, 128],
    [42, 86],
    [10, 40],
    [74, 22],
  ] as [number, number][],
};

type TaskDraft = Omit<Task, "state" | "doneAt">;

export function buildScene(agentCount: () => number): Scene {
  const els: El[] = [];
  const tasks: TaskDraft[] = [];
  const groups: Group[] = [];
  const byId = new Map<string, El>();
  const anchors: Record<string, number> = { top: 88 };

  const add = (el: El) => {
    els.push(el);
    byId.set(el.id, el);
    return el;
  };

  const task = (id: string, y: number, spec: Task["spec"], deps: string[] = []) => {
    tasks.push({ id, y, spec, deps });
    return id;
  };

  const path = (
    id: string,
    pts: Pt[],
    opts: {
      closed?: boolean;
      stroke?: string;
      fill?: string;
      add?: boolean;
      d?: string;
      tf?: { x: number; y: number; s: number };
      deps?: string[];
    } = {},
  ) => {
    add({
      kind: "path",
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      pts,
      closed: Boolean(opts.closed),
      stroke: opts.stroke ?? line,
      sw: 1,
      fill: opts.fill,
      d: opts.d,
      tf: opts.tf,
      add: opts.add ?? true,
      placed: 0,
      shut: false,
      edit: false,
      owner: null,
      fillOn: false,
    });
    return task(`p:${id}`, Math.min(...pts.map((pt) => pt.y)), { type: "path", el: id }, opts.deps ?? []);
  };

  const rect = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { r?: number; fill?: string; stroke?: string; deps?: string[]; href?: string } = {},
  ) => {
    add({
      kind: "rect",
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      x,
      y,
      w,
      h,
      r: opts.r ?? 0,
      fill: opts.fill ?? card,
      stroke: opts.stroke,
      draw: null,
      styled: false,
      href: opts.href,
    });
    return task(`r:${id}`, y, { type: "rect", el: id }, opts.deps ?? []);
  };

  const text = (
    id: string,
    x: number,
    y: number,
    value: string,
    st: FontStyle,
    opts: {
      w?: number;
      align?: "left" | "center";
      snap?: string;
      grow?: boolean;
      deps?: string[];
      href?: string;
      tag?: TextEl["tag"];
      dyn?: () => string;
    } = {},
  ) => {
    add({
      kind: "text",
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      x,
      y,
      w: opts.w,
      align: opts.align ?? "left",
      text: value,
      shown: "",
      st,
      size: st.size,
      editing: false,
      selAll: false,
      dyn: opts.dyn,
      href: opts.href,
      tag: opts.tag,
    });
    return task(`t:${id}`, y, { type: "text", el: id, snap: opts.snap, grow: opts.grow }, opts.deps ?? []);
  };

  const guide = (id: string, axis: "x" | "y", pos: number, y: number) => {
    add({
      kind: "guide",
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      axis,
      pos,
      cur: pos,
      op: 1,
      flash: 0,
      dragging: false,
    });
    return task(`g:${id}`, y, { type: "guide", el: id });
  };

  const elementY = (id: string) => {
    const el = byId.get(id);
    if (!el || el.kind === "path") return 0;
    if (el.kind === "guide") return el.pos;
    return el.y;
  };

  const dup = (id: string, ids: string[], copies: { dx: number; dy: number; edits: string[] }[]) => {
    const group: Group = { id, ids, copies: [] };
    const sourceTasks = tasks.filter((item) => "el" in item.spec && ids.includes(item.spec.el)).map((item) => item.id);
    const dupIds: string[] = [];
    copies.forEach((copy, index) => {
      const copyIds: string[] = [];
      let edit = 0;
      for (const sourceId of ids) {
        const source = byId.get(sourceId)!;
        const nextId = `${sourceId}~${index + 1}`;
        copyIds.push(nextId);
        if (source.kind === "text") {
          add({
            ...source,
            id: nextId,
            x: source.x + copy.dx,
            y: source.y + copy.dy,
            text: copy.edits[edit] ?? source.text,
            shown: "",
            v: 0,
            vis: false,
          });
          edit += 1;
        } else if (source.kind === "rect") {
          add({ ...source, id: nextId, x: source.x + copy.dx, y: source.y + copy.dy, v: 0, vis: false, styled: false, draw: null });
        }
      }
      group.copies.push({ dx: copy.dx, dy: copy.dy, ids: copyIds });
      dupIds.push(task(`d:${id}:${index}`, Math.min(...copyIds.map(elementY)), { type: "dup", group: id, k: index }, sourceTasks));
    });
    group.copies.forEach((copy) => {
      copy.ids.forEach((copyId, index) => {
        const copyEl = byId.get(copyId);
        const sourceEl = byId.get(ids[index]);
        if (copyEl?.kind === "text" && sourceEl?.kind === "text" && copyEl.text !== sourceEl.text) {
          task(`e:${copyId}`, copyEl.y, { type: "edit", el: copyId }, dupIds);
        }
      });
    });
    groups.push(group);
  };

  const band = (name: string, top: number, bottom: number, full = false) => {
    const dir = full ? [OFF_R, OFF_L] : [OFF_L, OFF_R];
    path(`rule-${name}`, [
      { x: dir[0], y: bottom },
      { x: dir[1], y: bottom },
    ]);
    path(`left-${name}`, [
      { x: MARGIN, y: top },
      { x: MARGIN, y: bottom },
    ]);
    path(`right-${name}`, [
      { x: RIGHT, y: bottom },
      { x: RIGHT, y: top },
    ]);
  };

  const vline = (id: string, x: number, y0: number, y1: number, deps?: string[]) =>
    path(id, [
      { x, y: y0 },
      { x, y: y1 },
    ], { deps });

  const mark = (id: string, x: number, y: number, size: number) => {
    const tf = { x, y, s: size / 140 };
    path(
      id,
      MARK.anchors.map(([ax, ay]) => ({ x: x + ax * tf.s, y: y + ay * tf.s })),
      { closed: true, stroke: solid, fill: solid, add: false, d: MARK.d, tf },
    );
  };

  const navFrom = els.length;
  path("rule-top", [
    { x: OFF_L, y: 24 },
    { x: OFF_R, y: 24 },
  ], { add: false });
  band("nav", 24, 88, true);
  mark("mark", MARGIN + 18, 40, 26);
  text("brand", MARGIN + 52, 46, portfolio.name, R.brand, { href: "#top" });
  text("nav0", 500, 48, portfolio.nav[0].label, R.nav, { href: portfolio.nav[0].href });
  dup(
    "nav",
    ["nav0"],
    portfolio.nav.slice(1).map((item, index) => ({ dx: 104 * (index + 1), dy: 0, edits: [item.label] })),
  );
  portfolio.nav.slice(1).forEach((item, index) => {
    const el = byId.get(`nav0~${index + 1}`);
    if (el) el.href = item.href;
  });
  vline("nav-div", RIGHT - 208, 24, 88);
  rect("nav-btn", RIGHT - 184, 36, 168, 40, { r: 8, fill: solid, href: portfolio.cta.href });
  text("nav-btn-t", RIGHT - 184, 46, portfolio.cta.label, R.btn, {
    w: 168,
    align: "center",
    deps: ["r:nav-btn"],
    href: portfolio.cta.href,
  });
  for (const el of els.slice(navFrom)) el.sticky = true;

  band("hero", 88, 700);
  vline("hero-div", 740, 88, 700);
  guide("g-hero", "x", CONTENT_X, 130);
  guide("g-hero-r", "x", 776, 130);
  text("h-title", CONTENT_X, 188, portfolio.headline, R.h1, { w: 560, snap: "g-hero", grow: true, tag: "h1" });
  text("h-lead", CONTENT_X, 348, portfolio.tagline, R.lead, { w: 520, snap: "g-hero" });
  text("h-support", CONTENT_X, 392, portfolio.heroSupport, R.body, { w: 500, snap: "g-hero" });
  text("h-pills", CONTENT_X, 500, portfolio.pills.join("   "), R.item, { w: 560, snap: "g-hero" });
  rect("h-btn1", CONTENT_X, 544, 196, 48, { r: 8, fill: solid, href: portfolio.actions[0].href });
  text("h-btn1-t", CONTENT_X, 557, portfolio.actions[0].label, R.btn, {
    w: 196,
    align: "center",
    deps: ["r:h-btn1"],
    href: portfolio.actions[0].href,
  });
  rect("h-btn2", CONTENT_X + 212, 544, 210, 48, { r: 8, fill: card, stroke: line, href: portfolio.actions[1].href });
  text("h-btn2-t", CONTENT_X + 212, 557, portfolio.actions[1].label, R.btnDark, {
    w: 210,
    align: "center",
    deps: ["r:h-btn2"],
    href: portfolio.actions[1].href,
  });

  rect("g-disp", 776, 168, 388, 96, { r: 10, fill: codeBg });
  text("g-disp-t", 800, 178, portfolio.diagram.command, R.nodeWhite, { w: 348, deps: ["r:g-disp"] });
  text("g-disp-s", 800, 226, portfolio.diagram.status, mono(12, "#8F949B"), { deps: ["r:g-disp"] });
  const stem = path("g-stem", [
    { x: 970, y: 264 },
    { x: 970, y: 300 },
  ], { stroke: "#9DA2A9", deps: ["r:g-disp"] });
  path("g-bus", [
    { x: 866, y: 328 },
    { x: 866, y: 300 },
    { x: 1074, y: 300 },
    { x: 1074, y: 328 },
  ], { stroke: "#9DA2A9", deps: [stem] });
  rect("w0", 776, 328, 180, 64, { r: 10, fill: card, stroke: line });
  text("w0-n", 796, 339, portfolio.diagram.nodes[0].name, R.nodeName, { deps: ["r:w0"] });
  text("w0-s", 796, 361, portfolio.diagram.nodes[0].meta, mono(12, accent), { deps: ["r:w0"] });
  dup("workers", ["w0", "w0-n", "w0-s"], [
    { dx: 208, dy: 0, edits: [portfolio.diagram.nodes[1].name, portfolio.diagram.nodes[1].meta] },
    { dx: 0, dy: 104, edits: [portfolio.diagram.nodes[2].name, portfolio.diagram.nodes[2].meta] },
    { dx: 208, dy: 104, edits: [portfolio.diagram.nodes[3].name, portfolio.diagram.nodes[3].meta] },
  ]);
  path("g-l1", [
    { x: 866, y: 392 },
    { x: 866, y: 432 },
  ], { stroke: "#9DA2A9", deps: ["d:workers:1"] });
  path("g-l2", [
    { x: 1074, y: 392 },
    { x: 1074, y: 432 },
  ], { stroke: "#9DA2A9", deps: ["d:workers:1"] });
  rect("g-track", 776, 548, 388, 6, { r: 3, fill: "#E1E3E6" });
  rect("g-fill", 776, 548, 252, 6, { r: 3, fill: accent, deps: ["r:g-track"] });
  text("g-stat", 776, 568, portfolio.diagram.footer, R.small, { snap: "g-hero-r" });

  band("logos", 700, 832, true);
  text("l-label", CONTENT_X, 752, portfolio.organizations.label, R.small, { w: 200 });
  portfolio.organizations.names.forEach((_, index) => vline(`l-div${index}`, 340 + index * 220, 700, 832));
  text("logo0", 364, 746, portfolio.organizations.names[0], R.logo);
  dup(
    "logos",
    ["logo0"],
    portfolio.organizations.names.slice(1).map((name, index) => ({ dx: 220 * (index + 1), dy: 0, edits: [name] })),
  );

  const aboutTop = 832;
  anchors[portfolio.about.id] = aboutTop;
  band("about", aboutTop, 1280);
  guide("g-about", "x", CONTENT_X, 860);
  text("a-title", CONTENT_X, 900, portfolio.about.title, R.h2, { w: 720, snap: "g-about", grow: true, tag: "h2" });
  text("a-essay", CONTENT_X, 990, portfolio.about.essay, R.body, { w: 860 });
  text("a-focus", CONTENT_X, 1080, portfolio.about.focus, R.body, { w: 860 });
  text("a-aside", CONTENT_X, 1208, portfolio.about.aside, R.body, { w: 860 });

  const specTop = 1280;
  const specBot = 2080;
  band("specs", specTop, specBot, true);
  path("spec-a", [
    { x: OFF_L, y: 1528 },
    { x: OFF_R, y: 1528 },
  ]);
  path("spec-b", [
    { x: OFF_L, y: 1768 },
    { x: OFF_R, y: 1768 },
  ]);
  vline("spec-v1", 453, specTop, specBot);
  vline("spec-v2", 826, specTop, specBot);
  guide("g-cell", "x", CONTENT_X, specTop + 20);
  guide("g-cell-y", "y", 1344, specTop + 20);
  const specItems = [
    ...portfolio.specializations.items,
    { title: portfolio.learning.title, body: `${portfolio.learning.items.join(", ")}.` },
  ];
  text("sp-title", CONTENT_X, 1344, specItems[0].title, R.h3, { snap: "g-cell-y", tag: "h3" });
  text("sp-body", CONTENT_X, 1380, specItems[0].body, R.body, { w: 296, snap: "g-cell" });
  const specShifts = [
    [373, 0],
    [746, 0],
    [0, 240],
    [373, 240],
    [746, 240],
    [0, 480],
    [373, 480],
    [746, 480],
  ];
  dup(
    "specs",
    ["sp-title", "sp-body"],
    specShifts.map(([dx, dy], index) => ({
      dx,
      dy,
      edits: [specItems[index + 1].title, specItems[index + 1].body],
    })),
  );

  const workTop = 2080;
  const workBot = 2920;
  anchors[portfolio.experience.id] = workTop;
  band("work", workTop, workBot);
  vline("work-div", 700, workTop, workBot);
  guide("g-work", "x", CONTENT_X, workTop + 24);
  text("w-title", CONTENT_X, 2144, portfolio.experience.title, R.h2, { w: 520, snap: "g-work", grow: true, tag: "h2" });
  text("w-co", CONTENT_X, 2264, portfolio.experience.company, R.h3, { tag: "h3" });
  text("w-role", CONTENT_X, 2300, `${portfolio.experience.position}  ·  ${portfolio.experience.duration}`, R.item);
  text(
    "w-resp",
    CONTENT_X,
    2352,
    portfolio.experience.responsibilities.map((item, index) => `${index + 1}.  ${item}`).join("\n\n"),
    R.body,
    { w: 520 },
  );
  text("w-tech", CONTENT_X, 2748, portfolio.experience.technologies, R.small, { w: 520 });
  text("w-other", CONTENT_X, 2788, portfolio.experience.otherOrganizations, R.body, { w: 520 });
  text("w-resume", CONTENT_X, 2848, portfolio.experience.resume, R.item, { w: 520 });

  const win = rect("c-win", 744, 2188, 420, 392, { r: 12, fill: codeBg });
  for (let i = 0; i < 3; i++) rect(`c-dot${i}`, 768 + i * 18, 2206, 10, 10, { r: 5, fill: "#30343A", deps: [win] });
  const fileWidth = measure(portfolio.experience.windowFile, R.codeDim, R.codeDim.size).w;
  text("c-file", 1140 - fileWidth, 2204, portfolio.experience.windowFile, R.codeDim, { deps: [win] });
  path("c-sep", [
    { x: 744, y: 2232 },
    { x: 1164, y: 2232 },
  ], { stroke: "#25282D", deps: [win] });
  portfolio.experience.windowLines.forEach((lineText, index) => {
    text(`c-ln${index}`, 768, 2252 + index * 23, lineText, R.code, { deps: [win] });
  });

  const statTop = 2920;
  const statBot = 3140;
  band("stats", statTop, statBot, true);
  [400, 680, 960].forEach((x) => vline(`s-div${x}`, x, statTop, statBot));
  guide("g-stats", "y", 2980, statTop + 16);
  guide("g-stats-x", "x", CONTENT_X, statTop + 16);
  text("st-n", CONTENT_X, 2972, portfolio.stats[0].value, R.stat, { snap: "g-stats" });
  text("st-l", CONTENT_X, 3040, portfolio.stats[0].label, R.body, { w: 230, snap: "g-stats-x" });
  dup(
    "stats",
    ["st-n", "st-l"],
    portfolio.stats.slice(1).map((item, index) => ({
      dx: 280 * (index + 1),
      dy: 0,
      edits: [item.value, item.label],
    })),
  );

  const projectTop = 3140;
  const projectBot = 4460;
  anchors[portfolio.projects.id] = projectTop;
  band("projects", projectTop, projectBot, true);
  guide("g-proj", "x", CONTENT_X, projectTop + 20);
  text("p-title", CONTENT_X, 3204, portfolio.projects.title, R.h2, { w: 680, snap: "g-proj", grow: true, tag: "h2" });
  const projects = portfolio.projects.items;
  const cardY = 3328;
  rect("pc", 116, cardY, 330, 430, { r: 14, fill: card, stroke: line });
  text("pc-name", 144, cardY + 24, projects[0].name, R.h3, { w: 274, deps: ["r:pc"], tag: "h3" });
  text("pc-sum", 144, cardY + 96, projects[0].summary, R.body, { w: 274, deps: ["r:pc"] });
  text("pc-feat", 144, cardY + 300, projects[0].features.join("\n"), R.item, { w: 274, deps: ["r:pc"] });
  text("pc-tech", 144, cardY + 360, projects[0].technologies, R.small, { w: 274, deps: ["r:pc"] });
  dup(
    "projects",
    ["pc", "pc-name", "pc-sum", "pc-feat", "pc-tech"],
    projects.slice(1).map((item, index) => {
      const column = index < 2 ? index + 1 : index - 2;
      const row = index < 2 ? 0 : 1;
      return {
        dx: column * 355,
        dy: row * 540,
        edits: [item.name, item.summary, item.features.join("\n"), item.technologies],
      };
    }),
  );
  text("p-more", CONTENT_X, 4348, portfolio.projects.github.label, R.item, {
    href: portfolio.projects.github.url,
  });

  const stackTop = 4460;
  const stackBot = 5320;
  anchors[portfolio.stack.id] = stackTop;
  band("stack", stackTop, stackBot);
  guide("g-stack", "x", CONTENT_X, stackTop + 20);
  text("k-title", CONTENT_X, 4524, portfolio.stack.title, R.h2, { w: 520, snap: "g-stack", grow: true, tag: "h2" });
  text("k-lead", CONTENT_X, 4604, portfolio.stack.lead, R.body, { w: 720 });
  vline("k-v1", 453, 4680, 5140);
  vline("k-v2", 736, 4680, 5140);
  vline("k-v3", 1010, 4680, 5140);
  text("k-h", CONTENT_X, 4728, portfolio.stack.groups[0].title, sans(16, 600, 1.3), { w: 250 });
  text("k-items", CONTENT_X, 4764, portfolio.stack.groups[0].items.join("\n"), R.item, { w: 250 });
  dup(
    "stack",
    ["k-h", "k-items"],
    portfolio.stack.groups.slice(1).map((group, index) => ({
      dx: 283 * (index + 1),
      dy: 0,
      edits: [group.title, group.items.join("\n")],
    })),
  );
  text("k-learn", CONTENT_X, 5204, `${portfolio.learning.title} — ${portfolio.learning.items.join(" · ")}`, R.small, { w: 1040 });

  const writeTop = 5320;
  const writeBot = 6100;
  anchors[portfolio.writing.id] = writeTop;
  band("writing", writeTop, writeBot, true);
  path("write-mid", [
    { x: OFF_L, y: 5720 },
    { x: OFF_R, y: 5720 },
  ]);
  vline("write-v", 640, writeTop, writeBot);
  guide("g-write", "x", CONTENT_X, writeTop + 20);
  text("wr-title", CONTENT_X, 5384, portfolio.writing.title, R.h2, { w: 760, snap: "g-write", grow: true, tag: "h2" });
  const articles = portfolio.writing.items;
  text("ar-y", CONTENT_X, 5508, articles[0].year, R.year);
  text("ar-t", CONTENT_X, 5536, articles[0].title, R.h3, { w: 460, tag: "h3" });
  text("ar-d", CONTENT_X, 5616, articles[0].description, R.body, { w: 460 });
  dup("articles", ["ar-y", "ar-t", "ar-d"], [
    { dx: 560, dy: 0, edits: [articles[1].year, articles[1].title, articles[1].description] },
    { dx: 0, dy: 300, edits: [articles[2].year, articles[2].title, articles[2].description] },
    { dx: 560, dy: 300, edits: [articles[3].year, articles[3].title, articles[3].description] },
  ]);

  const contactTop = 6100;
  const contactBot = 6760;
  anchors[portfolio.contact.id] = contactTop;
  band("contact", contactTop, contactBot);
  vline("contact-div", 760, contactTop, contactBot);
  guide("g-cta", "x", CONTENT_X, contactTop + 24);
  guide("g-cta-r", "x", 820, contactTop + 24);
  text("x-title", CONTENT_X, 6172, portfolio.contact.title, R.h1, { w: 560, snap: "g-cta", grow: true, tag: "h2" });
  text("x-lead", CONTENT_X, 6288, portfolio.contact.paragraphs.join("\n\n"), R.lead, { w: 560, snap: "g-cta" });
  const helloHref = portfolio.contact.email ? `mailto:${portfolio.contact.email}` : portfolio.contactCta.href;
  rect("x-btn", CONTENT_X, 6420, 180, 48, { r: 8, fill: solid, href: helloHref });
  text("x-btn-t", CONTENT_X, 6433, portfolio.contactCta.label, R.btn, {
    w: 180,
    align: "center",
    deps: ["r:x-btn"],
    href: helloHref,
  });
  text("x-count", 820, 6188, "", mono(13, accent, 500), {
    w: 340,
    snap: "g-cta-r",
    dyn: () => {
      const count = agentCount();
      return count > 0 ? `This page was built by ${count} cursors while you scrolled.` : portfolio.builtNote;
    },
  });
  text("x-note", 820, 6268, portfolio.builtDetail, R.body, { w: 340, snap: "g-cta-r" });
  text("x-social", 820, 6408, portfolio.contact.socials.map((item) => item.label).join("\n"), R.item, { w: 280 });

  const footTop = 6760;
  const footBot = 7160;
  band("footer", footTop, footBot, true);
  mark("fmark", CONTENT_X, 6808, 26);
  text("f-brand", CONTENT_X + 32, 6816, portfolio.footer.mark, R.brand);
  text("f-loc", CONTENT_X, 6864, portfolio.footer.location, R.small);
  text("f-credit", CONTENT_X, 6900, portfolio.footer.credit, R.small);
  text("f-built", CONTENT_X, 6932, portfolio.footer.builtOn, R.small);
  text("f-copy", CONTENT_X, 7020, portfolio.footer.copyright, R.small);
  const columns = [
    ...portfolio.footer.columns,
    {
      title: "Connect",
      links: portfolio.contact.socials.map((item) => ({ label: item.label, href: item.url })),
    },
  ];
  columns.forEach((column, index) => {
    const x = 560 + index * 220;
    text(`ft-h-${index}`, x, 6816, column.title, sans(14.5, 600, 1.4, ink));
    column.links.forEach((link, linkIndex) => {
      text(`ft-l-${index}-${linkIndex}`, x, 6856 + linkIndex * 30, link.label, R.item, {
        href: link.href || undefined,
      });
    });
  });

  return { els, tasks, groups, height: footBot + 40, anchors };
}
