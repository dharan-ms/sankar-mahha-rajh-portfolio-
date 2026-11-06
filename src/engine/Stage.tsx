import { useContext, useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode, createContext } from "react";
import { CursorView } from "./cursors";
import { Engine, fontFamily, lineHeight } from "./engine";
import { MARK } from "./scene";
import { paint, type ThemeName } from "./theme";
import { CANVAS_W, type El, type OverlayItem, type TextEl } from "./types";

const BLUE = "#0D99FF";
const RED = "#F24822";
const RULER = 20;
const NAV_OFFSET = 24;
const NAV_HEIGHT = 64;
const ThemeContext = createContext<ThemeName>("light");

function codeLine(text: string): ReactNode {
  if (text.trimStart().startsWith("#")) return <span style={{ color: "#6B7078" }}>{text}</span>;
  const parts: ReactNode[] = [];
  const pattern = /([A-Za-z_]+)(?=:)|([{}:,])|([^{}:,A-Za-z_]+|[A-Za-z_]+)/g;
  let match: RegExpExecArray | null;
  let key = 0;
  let firstKey = true;
  while ((match = pattern.exec(text))) {
    if (match[1]) {
      parts.push(
        <span key={key} style={{ color: firstKey ? "#8FC9D6" : "#AEB6EE" }}>
          {match[1]}
        </span>,
      );
      firstKey = false;
    } else if (match[2]) {
      parts.push(
        <span key={key} style={{ color: "#81868D" }}>
          {match[2]}
        </span>,
      );
    } else {
      parts.push(match[3]);
    }
    key += 1;
  }
  return parts.length ? parts : text;
}

function TextView({ el, onNavigate }: { el: TextEl; onNavigate: (href: string, event: MouseEvent) => void }) {
  const theme = useContext(ThemeContext);
  if (!el.vis) return null;
  const style: CSSProperties = {
    left: el.x + el.dx,
    top: el.y + el.dy,
    width: el.w,
    whiteSpace: el.w != null && !el.st.pre ? "pre-wrap" : "pre",
    fontFamily: fontFamily(el.st),
    fontSize: el.size,
    fontWeight: el.st.weight,
    lineHeight: `${lineHeight(el.st, el.size)}px`,
    letterSpacing: `${el.st.ls ?? 0}em`,
    color: paint(el.st.color, theme),
    textAlign: el.align,
  };
  const body = (
    <>
      {el.selAll ? <span className="text-sel">{el.shown}</span> : el.st.code ? codeLine(el.shown) : el.shown}
      {el.editing && !el.selAll && <span className="caret" style={{ height: el.size * 1.15 }} />}
    </>
  );
  const Tag = el.tag ?? "div";
  if (el.href) {
    return (
      <a className="el-text" href={el.href} style={style} onClick={(event) => onNavigate(el.href!, event)}>
        {body}
      </a>
    );
  }
  return (
    <Tag className="el-text" style={style}>
      {body}
    </Tag>
  );
}

function RectView({ el, onNavigate }: { el: Extract<El, { kind: "rect" }>; onNavigate: (href: string, event: MouseEvent) => void }) {
  const theme = useContext(ThemeContext);
  if (!el.vis) return null;
  const style: CSSProperties = {
    left: el.x + el.dx,
    top: el.y + el.dy,
    width: el.draw?.w ?? el.w,
    height: el.draw?.h ?? el.h,
    background: el.styled ? paint(el.fill, theme) : paint("#D9D9D9", theme),
    borderRadius: el.styled ? el.r : 0,
    boxShadow: el.styled && el.stroke ? `inset 0 0 0 1px ${paint(el.stroke, theme)}` : "none",
  };
  if (el.href) {
    return (
      <a className="el-rect" href={el.href} style={style} aria-hidden="true" tabIndex={-1} onClick={(event) => onNavigate(el.href!, event)} />
    );
  }
  return <div className="el-rect" style={style} />;
}

function PathView({ el }: { el: Extract<El, { kind: "path" }> }) {
  const theme = useContext(ThemeContext);
  if (!el.vis || el.placed === 0) return null;
  if (el.d && el.tf) {
    const progress = Math.min(1, (el.placed - 1) / Math.max(1, el.pts.length));
    return (
      <path
        d={el.d}
        transform={`translate(${el.tf.x} ${el.tf.y}) scale(${el.tf.s})`}
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - progress}
        stroke={paint(el.stroke, theme)}
        strokeWidth={1.2 / el.tf.s}
        fill={paint(el.fill, theme)}
        fillOpacity={el.fillOn ? 1 : 0}
        style={{ transition: "fill-opacity 220ms ease, stroke-dashoffset 120ms linear" }}
      />
    );
  }
  const d = `${el.pts
    .slice(0, el.placed)
    .map((pt, index) => `${index ? "L" : "M"}${pt.x} ${pt.y}`)
    .join(" ")}${el.shut ? " Z" : ""}`;
  return (
    <path
      d={d}
      stroke={paint(el.stroke, theme)}
      strokeWidth={el.sw}
      fill={el.fill ? paint(el.fill, theme) : "none"}
      fillOpacity={el.fillOn ? 1 : 0}
      style={{ transition: "fill-opacity 220ms ease" }}
      vectorEffect="non-scaling-stroke"
      strokeLinejoin="miter"
      strokeLinecap="square"
    />
  );
}

function Layer({ els, height, onNavigate }: { els: El[]; height: number; onNavigate: (href: string, event: MouseEvent) => void }) {
  return (
    <>
      {els.map((el) => (el.kind === "rect" ? <RectView key={el.id} el={el} onNavigate={onNavigate} /> : null))}
      <svg className="paths" width={CANVAS_W} height={height} aria-hidden="true">
        {els.map((el) => (el.kind === "path" ? <PathView key={el.id} el={el} /> : null))}
      </svg>
      {els.map((el) => (el.kind === "text" ? <TextView key={el.id} el={el} onNavigate={onNavigate} /> : null))}
    </>
  );
}

function boxNodes(
  item: Extract<OverlayItem, { t: "box" }>,
  xOf: (value: number) => number,
  yOf: (value: number) => number,
  rulers: number,
  scrollY: number,
  badges: ReactNode[],
  nextKey: () => number,
) {
  const nodes: ReactNode[] = [];
  const x = xOf(item.b.x);
  const y = yOf(item.b.y);
  const scaleX = xOf(1) - xOf(0);
  const scaleY = yOf(1) - yOf(0);
  const w = item.b.w * scaleX;
  const h = item.b.h * scaleY;
  const color = item.color === "red" ? RED : BLUE;
  nodes.push(<rect key={nextKey()} x={x} y={y} width={Math.max(0, w)} height={Math.max(0, h)} fill="none" stroke={color} strokeWidth={1} />);
  if (item.underline && item.underline.w > 0) {
    const line = item.underline;
    nodes.push(
      <line key={nextKey()} x1={xOf(line.x)} x2={xOf(line.x + line.w)} y1={yOf(line.y)} y2={yOf(line.y)} stroke={BLUE} strokeWidth={1.5} />,
    );
  }
  if (item.rulerLines && rulers > 0.05) {
    nodes.push(
      <g key={nextKey()} stroke={BLUE} strokeWidth={1} strokeDasharray="2 2" opacity={rulers}>
        <line x1={RULER} x2={x} y1={y + h / 2} y2={y + h / 2} />
        <line x1={x + w / 2} x2={x + w / 2} y1={scrollY + RULER} y2={y} />
      </g>,
    );
  }
  if (item.handles) {
    for (const [hx, hy] of [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ]) {
      nodes.push(<rect key={nextKey()} x={hx - 3.5} y={hy - 3.5} width={7} height={7} fill="#fff" stroke={BLUE} strokeWidth={1} />);
    }
  }
  if (item.badge && w > 0) {
    badges.push(
      <div key={nextKey()} className="badge" style={{ left: x + w / 2, top: y + h + 8, background: color }}>
        {item.badge}
      </div>,
    );
  }
  return nodes;
}

function Overlay({ engine }: { engine: Engine }) {
  const { s, left, vw, scrollY } = engine.vp;
  const xOf = (value: number) => left + value * s;
  const yOf = (value: number) => value * s;
  const height = engine.height * s;
  const shapes: ReactNode[] = [];
  const badges: ReactNode[] = [];
  let key = 0;
  const nextKey = () => key++;
  for (const el of engine.list) {
    if (el.kind === "guide" && el.vis && el.op > 0) {
      const glow = el.flash > 0 ? `drop-shadow(0 0 ${2 + el.flash * 3}px ${RED})` : undefined;
      const width = 1 + el.flash;
      shapes.push(
        el.axis === "x" ? (
          <line key={nextKey()} x1={xOf(el.cur)} x2={xOf(el.cur)} y1={0} y2={height} stroke={RED} strokeWidth={width} opacity={el.op} style={{ filter: glow }} />
        ) : (
          <line key={nextKey()} x1={0} x2={vw} y1={yOf(el.cur)} y2={yOf(el.cur)} stroke={RED} strokeWidth={width} opacity={el.op} style={{ filter: glow }} />
        ),
      );
    }
    if (el.kind === "path" && el.edit) {
      const shift = el.sticky ? engine.stick : 0;
      const pts = el.pts.slice(0, el.placed).map((pt) => ({ x: xOf(pt.x), y: yOf(pt.y + shift) }));
      const owner = el.owner != null ? engine.cursors.find((cursor) => cursor.id === el.owner) : null;
      const live = [...pts, ...(owner ? [{ x: xOf(owner.x), y: yOf(owner.y + shift) }] : [])];
      shapes.push(
        <polyline
          key={nextKey()}
          points={`${live.map((pt) => `${pt.x},${pt.y}`).join(" ")}${el.shut && pts[0] ? ` ${pts[0].x},${pts[0].y}` : ""}`}
          fill="none"
          stroke={BLUE}
          strokeWidth={1.5}
        />,
      );
      for (const pt of pts) {
        shapes.push(<circle key={nextKey()} cx={pt.x} cy={pt.y} r={3.6} fill="#fff" stroke={BLUE} strokeWidth={1.5} />);
      }
    }
  }
  for (const cursor of engine.cursors) {
    if (!cursor.ov) continue;
    const yShift = (value: number) => (value + (cursor.sticky ? engine.stick : 0)) * s;
    for (const item of cursor.ov()) {
      if (item.t === "box") shapes.push(...boxNodes(item, xOf, yShift, engine.rulers.t, scrollY, badges, nextKey));
      else {
        const a = { x: xOf(item.a.x), y: yShift(item.a.y) };
        const b = { x: xOf(item.b.x), y: yShift(item.b.y) };
        shapes.push(<line key={nextKey()} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={RED} strokeWidth={1} />);
        const horizontal = a.y === b.y;
        badges.push(
          <div key={nextKey()} className="badge" style={{ left: horizontal ? (a.x + b.x) / 2 : a.x + 18, top: horizontal ? a.y + 8 : (a.y + b.y) / 2 - 9, background: RED }}>
            {item.label}
          </div>,
        );
      }
    }
  }
  return (
    <div className="overlay" style={{ height }}>
      <svg width={vw} height={height} aria-hidden="true">
        {shapes}
      </svg>
      {badges}
    </div>
  );
}

function Rulers({ engine }: { engine: Engine }) {
  const t = engine.rulers.t;
  if (t <= 0.001) return null;
  const { s, left, vw, vh, scrollY } = engine.vp;
  const step = s > 0.6 ? 100 : s > 0.3 ? 200 : 500;
  const top: ReactNode[] = [];
  const side: ReactNode[] = [];
  const startX = Math.floor(-left / s / step) * step;
  for (let value = startX; left + value * s < vw; value += step / 2) {
    const x = left + value * s;
    const major = value % step === 0;
    top.push(<line key={`tx${value}`} x1={x} x2={x} y1={major ? 13 : 16} y2={RULER} stroke="#5E5E5E" />);
    if (major) {
      top.push(
        <text key={`tl${value}`} x={x + 3} y={11} className="rtext">
          {value}
        </text>,
      );
    }
  }
  const startY = Math.floor(scrollY / s / step) * step;
  for (let value = startY; value * s - scrollY < vh; value += step / 2) {
    const y = value * s - scrollY;
    const major = value % step === 0;
    side.push(<line key={`sy${value}`} y1={y} y2={y} x1={major ? 13 : 16} x2={RULER} stroke="#5E5E5E" />);
    if (major) {
      side.push(
        <text key={`sl${value}`} x={11} y={y - 3} className="rtext" transform={`rotate(-90 11 ${y - 3})`}>
          {value}
        </text>,
      );
    }
  }
  for (const cursor of engine.cursors) {
    if (!cursor.ov) continue;
    for (const item of cursor.ov()) {
      if (item.t !== "box" || !item.handles) continue;
      const x = left + item.b.x * s;
      const x2 = left + (item.b.x + item.b.w) * s;
      const y = item.b.y * s - scrollY;
      const y2 = (item.b.y + item.b.h) * s - scrollY;
      top.unshift(<rect key={`sx${cursor.id}`} x={x} y={0} width={Math.max(0, x2 - x)} height={RULER} fill="rgba(13,153,255,0.22)" />);
      top.push(
        <text key={`st${cursor.id}`} x={x + 3} y={11} className="rtext rsel">
          {Math.round(item.b.x)}
        </text>,
      );
      side.unshift(<rect key={`syy${cursor.id}`} y={y} x={0} height={Math.max(0, y2 - y)} width={RULER} fill="rgba(13,153,255,0.22)" />);
    }
  }
  for (const el of engine.list) {
    if (el.kind !== "guide" || !el.dragging) continue;
    if (el.axis === "x") {
      const x = left + el.cur * s;
      top.push(<line key={`g${el.id}`} x1={x} x2={x} y1={0} y2={RULER} stroke={RED} />);
      top.push(
        <text key={`gl${el.id}`} x={x + 4} y={11} className="rtext" fill={RED}>
          {Math.round(el.cur)}
        </text>,
      );
    } else {
      const y = el.cur * s - scrollY;
      side.push(<line key={`g${el.id}`} y1={y} y2={y} x1={0} x2={RULER} stroke={RED} />);
    }
  }
  return (
    <>
      <div className="ruler ruler-top" style={{ transform: `translateY(${(t - 1) * 100}%)` }}>
        <svg width={vw} height={RULER}>
          {top}
        </svg>
      </div>
      <div className="ruler ruler-left" style={{ transform: `translateX(${(t - 1) * 100}%)` }}>
        <svg width={RULER} height={vh}>
          {side}
        </svg>
      </div>
      <div className="ruler-corner" style={{ opacity: t }} />
    </>
  );
}

function navigate(engine: Engine, href: string, event: MouseEvent) {
  if (!href.startsWith("#")) return;
  event.preventDefault();
  const id = href.slice(1) || "top";
  const y = engine.anchors[id] ?? 0;
  window.scrollTo({ top: Math.max(0, y * engine.vp.s - 72), behavior: engine.instant ? "auto" : "smooth" });
  history.replaceState(null, "", href === "#top" ? location.pathname + location.search : href);
}

export function Stage({ engine, theme }: { engine: Engine; theme: ThemeName }) {
  const { s, left } = engine.vp;
  const onNavigate = (href: string, event: MouseEvent) => navigate(engine, href, event);
  const sticky = engine.list.filter((el) => el.sticky);
  const rest = engine.list.filter((el) => !el.sticky);
  const navVisible = sticky.some((el) => el.vis);
  return (
    <ThemeContext.Provider value={theme}>
      <div className="page" style={{ height: engine.height * s }}>
        <div className="nav-sticky" style={{ marginTop: NAV_OFFSET * s, height: NAV_HEIGHT * s, top: RULER * engine.rulers.t }}>
          {navVisible && <div className="nav-backdrop" />}
          <div className="nav-canvas" style={{ width: CANVAS_W, transform: `translateX(${left}px) scale(${s}) translateY(${-NAV_OFFSET}px)` }}>
            <Layer els={sticky} height={NAV_OFFSET + NAV_HEIGHT + 40} onNavigate={onNavigate} />
          </div>
        </div>
        <div className="canvas" style={{ width: CANVAS_W, height: engine.height, transform: `translateX(${left}px) scale(${s})` }}>
          <Layer els={rest} height={engine.height} onNavigate={onNavigate} />
        </div>
        <div className={`intro-logo${engine.started ? " gone" : ""}`} aria-hidden="true">
          <svg viewBox="0 0 120 160" width="60" height="80">
            <path d={MARK.d} fill={paint("#D7DADE", theme)} />
          </svg>
        </div>
        <Overlay engine={engine} />
        <div className="cursors" style={{ height: engine.height * s }}>
          {engine.cursors.map((cursor) => (
            <CursorView
              key={cursor.id}
              agent={cursor}
              x={left + cursor.x * s}
              y={(cursor.y + (cursor.sticky ? engine.stick : 0)) * s}
            />
          ))}
        </div>
      </div>
      <Rulers engine={engine} />
    </ThemeContext.Provider>
  );
}

export function useEngine() {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [, setFrame] = useState(0);
  useEffect(() => {
    const instant =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(location.search).has("built");
    const fonts = ["400 16px Inter", "500 16px Inter", "600 16px Inter", '400 16px "JetBrains Mono"', '500 16px "JetBrains Mono"'];
    let alive = true;
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 2500));
    Promise.race([Promise.all(fonts.map((font) => document.fonts.load(font))), timeout]).then(() => {
      if (alive) setEngine(new Engine(instant));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!engine) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const measureViewport = () => {
      const width = document.documentElement.clientWidth;
      const scale = Math.min(1, width / CANVAS_W);
      engine.vp.vw = width;
      engine.vp.vh = window.innerHeight;
      engine.vp.s = scale;
      engine.vp.left = (width - CANVAS_W * scale) / 2;
    };
    const onScroll = () => engine.setScroll(window.scrollY);
    const onWheel = () => {
      if (window.scrollY > 0) engine.start();
    };
    const onPointer = (event: PointerEvent) => {
      engine.mouse = { x: event.clientX, y: event.clientY };
    };
    const onLeave = () => {
      engine.mouse = null;
    };
    measureViewport();
    onScroll();
    window.addEventListener("resize", measureViewport);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      engine.step((now - last) / 1000);
      last = now;
      setFrame((value) => value + 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const hash = location.hash.slice(1);
    if (hash && engine.anchors[hash] != null) window.scrollTo(0, Math.max(0, engine.anchors[hash] * engine.vp.s - 72));
    else window.scrollTo(0, 0);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureViewport);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [engine]);
  return engine;
}
