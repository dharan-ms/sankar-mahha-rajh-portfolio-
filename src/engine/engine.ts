import { fontFamily, lineHeight, measure } from "./measure";
import { buildScene } from "./scene";
import {
  CANVAS_W,
  OFF_L,
  OFF_R,
  type Agent,
  type Bounds,
  type El,
  type Group,
  type GuideEl,
  type OverlayItem,
  type PathEl,
  type Pt,
  type RectEl,
  type Task,
  type TextEl,
} from "./types";

const NAMES = [
  "Ada", "Linus", "Grace", "Alan", "Margaret", "Ken", "Barbara", "Dennis",
  "Radia", "Guido", "Frances", "Bjarne", "Hedy", "Tim", "Katherine", "Edsger",
];
const COLORS = [
  "#F24E1E", "#A259FF", "#1ABCFE", "#0ACF83", "#FF7262", "#FFC700",
  "#9747FF", "#E8467C", "#14AE5C", "#0D99FF", "#FF8A00", "#00B5CE",
];

const NAV_Y = 24;
const RULER = 20;
const INITIAL = 18;
const MIN_AGENTS = 6;
const MAX_AGENTS = 48;
const FLOCK_MAX = 36;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeInOut = (e: number) => (e < 0.5 ? 4 * e * e * e : 1 - (-2 * e + 2) ** 3 / 2);
const easeOut = (e: number) => 1 - (1 - e) ** 3;
export const bump = (el: { v: number }) => {
  el.v += 1;
};

export class Engine {
  els = new Map<string, El>();
  list: El[] = [];
  tasks: Task[] = [];
  byTask = new Map<string, Task>();
  groups = new Map<string, Group>();
  cursors: Agent[] = [];
  vp = { scrollY: 0, vh: 800, vw: 1280, s: 1, left: 0 };
  started = false;
  frontier = 0;
  vel = 0;
  tempo = 1;
  time = 0;
  rulers = { want: 0, t: 0, lastNeed: -10 };
  lastScroll = 0;
  nextId = 0;
  spawnCooldown = 0;
  flocking = false;
  lastT: Pt | null = null;
  tv = { x: 0, y: 0 };
  mouse: Pt | null = null;
  guideDeps = new Map<string, Task[]>();
  retiredWorkers = 0;
  height: number;
  anchors: Record<string, number>;
  instant: boolean;

  constructor(instant: boolean) {
    this.instant = instant;
    const scene = buildScene(() => this.cursors.filter((c) => c.worked).length + this.retiredWorkers);
    this.height = scene.height;
    this.anchors = scene.anchors;
    for (const el of scene.els) {
      this.els.set(el.id, el);
      this.list.push(el);
    }
    for (const task of scene.tasks) {
      const live: Task = { ...task, state: "wait", doneAt: 0 };
      this.tasks.push(live);
      this.byTask.set(task.id, live);
      if (task.spec.type === "text" && task.spec.snap) {
        const list = this.guideDeps.get(task.spec.snap) ?? [];
        list.push(live);
        this.guideDeps.set(task.spec.snap, list);
      }
    }
    for (const group of scene.groups) this.groups.set(group.id, group);
    if (instant) {
      this.revealAll();
      return;
    }
    for (let i = 0; i < INITIAL; i++) {
      const a = (i / INITIAL) * Math.PI * 2;
      const cursor = this.makeCursor(
        CANVAS_W / 2 + Math.cos(a) * 160,
        400 + Math.sin(a) * 160,
        i < MIN_AGENTS ? { x: 0, y: 0 } : null,
      );
      cursor.follow = true;
      this.cursors.push(cursor);
    }
  }

  revealAll() {
    this.started = true;
    for (const el of this.list) {
      if (el.kind === "guide") {
        el.vis = false;
        continue;
      }
      el.vis = true;
      if (el.kind === "text") {
        if (el.dyn) el.text = el.dyn();
        el.shown = el.text;
        el.editing = false;
        el.selAll = false;
      } else if (el.kind === "rect") {
        el.styled = true;
        el.draw = null;
      } else if (el.kind === "path") {
        el.placed = el.pts.length + 1;
        el.shut = el.closed || Boolean(el.d);
        el.fillOn = Boolean(el.fill);
        el.edit = false;
      }
      bump(el);
    }
    for (const task of this.tasks) task.state = "done";
  }

  makeCursor(x: number, y: number, home: Pt | null = null): Agent {
    const id = this.nextId++;
    const fast = Math.random() < 0.25;
    return {
      id,
      x,
      y,
      home,
      name: NAMES[id % NAMES.length],
      color: COLORS[id % COLORS.length],
      shape: "arrow",
      press: 0,
      task: null,
      gen: null,
      ov: null,
      idleFor: 0,
      leaving: false,
      worked: false,
      sticky: false,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: fast ? rand(1000, 1500) : rand(300, 750),
      force: fast ? rand(3500, 6000) : rand(700, 1800),
      spin: fast ? rand(2.2, 3.4) : rand(0.8, 1.8),
      curl: rand(-1, 1),
      ph: rand(0, Math.PI * 2),
      orbit: rand(70, 170),
      follow: false,
    };
  }

  get viewTop() {
    return this.vp.scrollY / this.vp.s;
  }

  get viewBot() {
    return (this.vp.scrollY + this.vp.vh) / this.vp.s;
  }

  get stick() {
    return Math.max(0, this.viewTop + (RULER * this.rulers.t) / this.vp.s - NAV_Y);
  }

  isSticky(task: Task) {
    const spec = task.spec;
    const id = spec.type === "dup" ? this.groups.get(spec.group)?.ids[0] : "el" in spec ? spec.el : undefined;
    return Boolean(id && this.els.get(id)?.sticky);
  }

  fromViewport(x: number, y: number): Pt {
    return { x: (x - this.vp.left) / this.vp.s, y: (this.vp.scrollY + y) / this.vp.s };
  }

  start() {
    if (this.started) return;
    this.started = true;
    for (const cursor of this.cursors) {
      cursor.follow = false;
      cursor.gen = null;
      cursor.angle = ((cursor.angle + 180) % 360 + 360) % 360 - 180;
    }
  }

  bounds(el: El): Bounds {
    if (el.kind === "text") {
      const box = measure(el.shown || " ", el.st, el.size, el.w);
      return {
        x: el.x + el.dx,
        y: el.y + el.dy,
        w: el.w ?? Math.max(box.w, 2),
        h: Math.max(box.h, lineHeight(el.st, el.size)),
      };
    }
    if (el.kind === "rect") {
      return { x: el.x + el.dx, y: el.y + el.dy, w: el.draw?.w ?? el.w, h: el.draw?.h ?? el.h };
    }
    if (el.kind === "path") {
      const xs = el.pts.map((p) => p.x);
      const ys = el.pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
    }
    return { x: el.pos, y: 0, w: 0, h: 0 };
  }

  unionBounds(ids: string[]): Bounds {
    const boxes = ids.map((id) => this.bounds(this.els.get(id)!));
    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));
    return {
      x,
      y,
      w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
      h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
    };
  }

  textUnderline(el: TextEl) {
    const box = measure(el.shown || " ", el.st, el.size, el.w);
    const bounds = this.bounds(el);
    const first = box.lines[0] ?? 0;
    return {
      x: el.align === "center" && el.w ? bounds.x + (el.w - first) / 2 : bounds.x,
      y: bounds.y + lineHeight(el.st, el.size) * 0.5 + el.size * 0.42,
      w: first,
      h: 0,
    };
  }

  selection(el: El, extra: Partial<Extract<OverlayItem, { t: "box" }>> = {}): OverlayItem {
    const b = this.bounds(el);
    return {
      t: "box",
      b,
      handles: true,
      badge: `${Math.round(b.w)} × ${Math.round(b.h)}`,
      rulerLines: true,
      underline: el.kind === "text" ? this.textUnderline(el) : undefined,
      ...extra,
    };
  }

  setScroll(y: number) {
    this.vp.scrollY = y;
    if (y > 4) this.start();
  }

  step(dt: number) {
    if (this.instant) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const scale = this.vp.s;
    const speed = Math.abs(this.vp.scrollY - this.lastScroll) / scale / Math.max(dt, 0.001);
    this.lastScroll = this.vp.scrollY;
    this.vel = Math.max(this.vel * Math.exp(-dt * 1.2), this.vel * 0.7 + speed * 0.3);
    if (this.started) this.frontier = Math.max(this.frontier, this.viewBot);
    const ready = this.started ? this.available() : [];
    const busy = this.cursors.filter((c) => c.task).length;
    this.tempo = clamp(2.1 + this.vel / 900 + (ready.length / Math.max(1, this.cursors.length)) * 0.5, 2.1, 4.5);
    if (this.rulers.want > 0) this.rulers.lastNeed = this.time;
    const rulerTarget = this.time - this.rulers.lastNeed < 0.7 ? 1 : 0;
    this.rulers.t += (rulerTarget - this.rulers.t) * Math.min(1, dt * 10);
    if (Math.abs(rulerTarget - this.rulers.t) < 0.002) this.rulers.t = rulerTarget;

    for (const el of this.list) {
      if (el.kind !== "guide" || !el.vis) continue;
      if (el.flash > 0) {
        el.flash = Math.max(0, el.flash - dt * 1.5);
        bump(el);
      }
      const deps = this.guideDeps.get(el.id) ?? [];
      if (!el.dragging && deps.length > 0 && deps.every((task) => task.state === "done")) {
        const last = Math.max(...deps.map((task) => task.doneAt));
        if (this.time - last > 1.2 && el.op > 0) {
          el.op = Math.max(0, el.op - dt * 1.2);
          bump(el);
        }
      }
    }

    if (!this.flocking && this.started && this.tasks.every((task) => task.state !== "wait")) {
      for (const cursor of this.cursors) {
        if (!cursor.task && !cursor.follow) {
          cursor.follow = true;
          cursor.gen = null;
          cursor.leaving = false;
          cursor.ov = null;
          cursor.shape = "arrow";
        }
      }
      if (this.cursors.every((cursor) => cursor.follow)) this.flocking = true;
    }
    if (this.flocking) {
      this.flock(dt);
      return;
    }
    if (!this.started) {
      const center = this.fromViewport(this.vp.vw / 2, this.vp.vh / 2);
      if (this.follow(dt, this.cursors, center, 0.7)) this.start();
      return;
    }
    const followers = this.cursors.filter((cursor) => cursor.follow);
    if (followers.length) this.follow(dt, followers);
    this.spawnCooldown -= dt;
    const targetCount = clamp(MIN_AGENTS + Math.floor(this.vel / 50) + Math.floor(ready.length / 3), MIN_AGENTS, MAX_AGENTS);
    const alive = this.cursors.filter((cursor) => !cursor.leaving).length;
    if (alive < targetCount && ready.length > alive - busy && this.spawnCooldown <= 0) {
      const fromLeft = Math.random() < 0.5;
      const spot = this.fromViewport(fromLeft ? -40 : this.vp.vw + 40, rand(0.2, 0.8) * this.vp.vh);
      this.cursors.push(this.makeCursor(spot.x, spot.y));
      this.spawnCooldown = 0.035;
    }
    for (const cursor of this.cursors) {
      if (cursor.task || cursor.leaving || cursor.follow || !this.started) continue;
      const task = this.pick(cursor, ready);
      if (!task) continue;
      ready.splice(ready.indexOf(task), 1);
      task.state = "active";
      cursor.task = task;
      cursor.worked = true;
      if (this.isSticky(task)) {
        cursor.sticky = true;
        cursor.y -= this.stick;
      }
      cursor.idleFor = 0;
      cursor.gen = this.run(cursor, task);
    }
    for (const cursor of [...this.cursors]) {
      if (cursor.follow) continue;
      cursor.press = Math.max(0, cursor.press - dt * 6);
      if (cursor.angle !== 0) cursor.angle = Math.abs(cursor.angle) < 0.5 ? 0 : cursor.angle * (1 - Math.min(1, dt * 10));
      if (!cursor.task) {
        cursor.idleFor += dt;
        const population = this.cursors.filter((item) => !item.leaving).length;
        if (!cursor.leaving && cursor.idleFor > 2.5 && population > MIN_AGENTS && !cursor.home) {
          cursor.leaving = true;
          cursor.gen = this.leave(cursor);
        }
        if (!cursor.gen) cursor.gen = this.idle(cursor);
      }
      if (cursor.gen && cursor.gen.next(dt).done) {
        if (cursor.task) {
          cursor.task.state = "done";
          cursor.task.doneAt = this.time;
          cursor.task = null;
          cursor.ov = null;
          if (cursor.sticky) {
            cursor.sticky = false;
            cursor.y += this.stick;
          }
          cursor.shape = "arrow";
        }
        cursor.gen = null;
        if (cursor.leaving) {
          if (cursor.worked) this.retiredWorkers += 1;
          this.cursors.splice(this.cursors.indexOf(cursor), 1);
        }
      }
    }
  }

  flockTarget(): Pt {
    if (this.mouse) return this.fromViewport(this.mouse.x, this.mouse.y);
    const t = this.time;
    return this.fromViewport(
      this.vp.vw * (0.5 + 0.28 * Math.sin(t * 0.37)),
      this.vp.vh * (0.5 + 0.25 * Math.sin(t * 0.53 + 1)),
    );
  }

  flock(dt: number) {
    this.spawnCooldown -= dt;
    if (this.cursors.length < FLOCK_MAX && this.spawnCooldown <= 0) {
      const fromLeft = Math.random() < 0.5;
      const spot = this.fromViewport(fromLeft ? -30 : this.vp.vw + 30, rand(0.1, 0.9) * this.vp.vh);
      const cursor = this.makeCursor(spot.x, spot.y);
      cursor.follow = true;
      this.cursors.push(cursor);
      this.spawnCooldown = 0.04;
    }
    this.follow(dt, this.cursors);
  }

  follow(dt: number, cursors: Agent[], target?: Pt, scale = 1) {
    const mouse = this.mouse ? this.fromViewport(this.mouse.x, this.mouse.y) : null;
    const origin = target ?? this.flockTarget();
    const t = this.time;
    if (mouse && this.lastT && dt > 0) {
      const k = Math.min(1, dt * 18);
      this.tv.x += ((mouse.x - this.lastT.x) / dt - this.tv.x) * k;
      this.tv.y += ((mouse.y - this.lastT.y) / dt - this.tv.y) * k;
    }
    this.lastT = mouse;
    const radius = 135 * scale * (1 + 0.18 * Math.sin(t * 0.55));
    const swirl = Math.tanh(Math.cos(t * 0.11) * 3);
    const accel: Pt[] = [];
    for (const cursor of cursors) {
      const dx = cursor.x - origin.x;
      const dy = cursor.y - origin.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const nx = dx / dist;
      const ny = dy / dist;
      const ang = Math.atan2(dy, dx);
      const orbit = radius * (1 + 0.3 * Math.sin(3 * ang + t * 0.7)) + (cursor.orbit - 120) * 0.55 * scale;
      const tangential = 300 * (0.7 + cursor.spin * 0.2) * swirl;
      const radial = clamp((orbit - dist) * 4, -2600, 1400);
      const edge = Math.min(1, Math.max(0, (dist - orbit) / 600));
      accel.push({
        x: -ny * tangential + nx * radial - ny * cursor.curl * 400 * edge,
        y: nx * tangential + ny * radial + nx * cursor.curl * 400 * edge,
      });
    }
    for (let i = 0; i < cursors.length; i++) {
      const cursor = cursors[i];
      let ax = 0;
      let ay = 0;
      let weight = 0;
      for (let j = 0; j < cursors.length; j++) {
        if (i === j) continue;
        const other = cursors[j];
        const dist = Math.hypot(other.x - cursor.x, other.y - cursor.y);
        if (dist > 90) continue;
        const influence = 1 - dist / 90;
        ax += other.vx * influence;
        ay += other.vy * influence;
        weight += influence;
      }
      let fx = accel[i].x;
      let fy = accel[i].y;
      if (weight > 0) {
        fx = fx * 0.7 + (ax / weight) * 0.3;
        fy = fy * 0.7 + (ay / weight) * 0.3;
      }
      const outside = Math.max(0, Math.hypot(cursor.x - origin.x, cursor.y - origin.y) - 180 * scale);
      const maxSpeed = cursor.speed * (1.3 + Math.min(3.2, outside / 90));
      const mag = Math.hypot(fx, fy);
      if (mag > maxSpeed) {
        fx *= maxSpeed / mag;
        fy *= maxSpeed / mag;
      }
      let ix = (fx - cursor.vx) * 6;
      let iy = (fy - cursor.vy) * 6;
      const maxForce = cursor.force * (1.4 + Math.min(5, outside / 50));
      const force = Math.hypot(ix, iy);
      if (force > maxForce) {
        ix *= maxForce / force;
        iy *= maxForce / force;
      }
      cursor.vx += ix * dt;
      cursor.vy += iy * dt;
      cursor.x += cursor.vx * dt;
      cursor.y += cursor.vy * dt;
    }
    let touched = false;
    if (mouse) {
      for (const cursor of cursors) {
        const dx = cursor.x - mouse.x;
        const dy = cursor.y - mouse.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= 48) continue;
        touched = true;
        const nx = dx / dist;
        const ny = dy / dist;
        cursor.x = mouse.x + nx * 48;
        cursor.y = mouse.y + ny * 48;
        const approach = (cursor.vx - this.tv.x) * nx + (cursor.vy - this.tv.y) * ny;
        if (approach < 0) {
          cursor.vx -= nx * approach * 1.6;
          cursor.vy -= ny * approach * 1.6;
        }
        cursor.vx += nx * 260;
        cursor.vy += ny * 260;
      }
    }
    for (const cursor of cursors) {
      if (Math.hypot(cursor.vx, cursor.vy) < 30) continue;
      const delta = ((Math.atan2(cursor.vy, cursor.vx) * 180) / Math.PI + 128 - cursor.angle + 540) % 360 - 180;
      cursor.angle += delta * Math.min(1, dt * 8);
      cursor.press = Math.max(0, cursor.press - dt * 6);
    }
    return touched;
  }

  available() {
    const ready: Task[] = [];
    for (const task of this.tasks) {
      if (task.state !== "wait" || task.y > this.frontier) continue;
      if (task.deps.every((id) => this.byTask.get(id)?.state === "done")) ready.push(task);
    }
    return ready;
  }

  pick(cursor: Agent, tasks: Task[]) {
    let best: Task | null = null;
    let score = Infinity;
    const top = this.viewTop - 40;
    const bot = this.viewBot;
    for (const task of tasks) {
      const band = task.y >= top && task.y <= bot ? 0 : task.y < top ? 1 : 2;
      const kind = task.spec.type === "text" || task.spec.type === "rect" || task.spec.type === "edit" ? 0 : 1;
      const value = band * 1e6 + kind * 1e4 + (band === 1 ? top - task.y : task.y) * 0.6 + Math.abs(task.y - cursor.y) * 0.4;
      if (value < score) {
        score = value;
        best = task;
      }
    }
    return best;
  }

  *wait(seconds: number): Generator<void, void, number> {
    let elapsed = 0;
    while (elapsed < seconds) elapsed += (yield) * this.tempo;
  }

  *moveTo(
    cursor: Agent,
    dest: Pt | (() => Pt),
    opts: { speed?: number; bend?: number; drag?: boolean; onStep?: () => void } = {},
  ): Generator<void, void, number> {
    const point = typeof dest === "function" ? dest : () => dest;
    const x0 = cursor.x;
    const y0 = cursor.y;
    const first = point();
    const distance = Math.hypot(first.x - x0, first.y - y0);
    if (distance < 0.5) {
      cursor.x = first.x;
      cursor.y = first.y;
      opts.onStep?.();
      return;
    }
    const duration = clamp(0.12 + Math.sqrt(distance) * 0.021, 0.14, 0.9) / (opts.speed ?? 1);
    const bend = (opts.bend ?? (Math.random() < 0.5 ? -1 : 1) * rand(0.04, 0.14)) * Math.min(distance, 600);
    let elapsed = 0;
    while (elapsed < duration) {
      elapsed += (yield) * this.tempo;
      const t = Math.min(1, elapsed / duration);
      const eased = opts.drag || t < 0.15 ? easeInOut(t) : easeOut(t);
      const next = point();
      const dx = next.x - x0;
      const dy = next.y - y0;
      const len = Math.hypot(dx, dy) || 1;
      const offset = Math.sin(Math.PI * eased) * bend;
      cursor.x = x0 + dx * eased + (-dy / len) * offset;
      cursor.y = y0 + dy * eased + (dx / len) * offset;
      opts.onStep?.();
    }
    const end = point();
    cursor.x = end.x;
    cursor.y = end.y;
    opts.onStep?.();
  }

  *click(cursor: Agent) {
    cursor.press = 1;
    yield* this.wait(0.07);
  }

  *type(el: TextEl, text: string, replace = false) {
    if (replace) el.shown = "";
    const size = Math.max(6, Math.ceil(text.length / 6));
    for (let i = 0; i < text.length; i += size) {
      el.shown += text.slice(i, i + size);
      el.selAll = false;
      bump(el);
      yield* this.wait(0.045);
    }
  }

  *idle(cursor: Agent): Generator<void, void, number> {
    if (!this.started && cursor.home) {
      const home = cursor.home;
      const phase = rand(0, 6);
      while (!this.started) {
        cursor.x = home.x + Math.sin(this.time * 1.3 + phase) * 3;
        cursor.y = home.y + Math.cos(this.time * 1.7 + phase) * 2.5;
        yield;
      }
    }
    for (;;) {
      const top = this.viewTop;
      const bot = this.viewBot;
      yield* this.moveTo(
        cursor,
        { x: rand(220, 1060), y: rand(top + (bot - top) * 0.2, top + (bot - top) * 0.8) },
        { speed: 0.35 },
      );
      let rest = rand(0.4, 1.4);
      while (rest > 0) {
        rest -= yield;
        if (cursor.y < this.viewTop || cursor.y > this.viewBot) break;
      }
    }
  }

  *leave(cursor: Agent) {
    const right = cursor.x > CANVAS_W / 2;
    yield* this.moveTo(cursor, () => this.fromViewport(right ? this.vp.vw + 60 : -60, (cursor.y - this.viewTop) * this.vp.s), {
      speed: 0.8,
    });
  }

  run(cursor: Agent, task: Task) {
    const spec = task.spec;
    switch (spec.type) {
      case "path":
        return this.drawPath(cursor, this.els.get(spec.el) as PathEl);
      case "rect":
        return this.drawRect(cursor, this.els.get(spec.el) as RectEl);
      case "text":
        return this.drawText(
          cursor,
          this.els.get(spec.el) as TextEl,
          spec.snap ? (this.els.get(spec.snap) as GuideEl) : null,
          Boolean(spec.grow),
        );
      case "guide":
        return this.dragGuide(cursor, this.els.get(spec.el) as GuideEl);
      case "dup":
        return this.duplicate(cursor, this.groups.get(spec.group)!, spec.k);
      case "edit":
        return this.editText(cursor, this.els.get(spec.el) as TextEl);
    }
  }

  anchor(pt: Pt): Pt | (() => Pt) {
    if (pt.x <= OFF_L) return () => ({ x: this.fromViewport(6, 0).x, y: pt.y });
    if (pt.x >= OFF_R) return () => ({ x: this.fromViewport(this.vp.vw - 6, 0).x, y: pt.y });
    return pt;
  }

  *drawPath(cursor: Agent, el: PathEl) {
    if (el.d) {
      yield* this.drawLogo(cursor, el);
      return;
    }
    cursor.shape = el.add ? "pen-add" : "pen";
    yield* this.moveTo(cursor, this.anchor(el.pts[0]));
    yield* this.click(cursor);
    el.vis = true;
    el.edit = true;
    el.placed = 1;
    el.owner = cursor.id;
    bump(el);
    cursor.shape = "pen";
    for (let i = 1; i < el.pts.length; i++) {
      yield* this.moveTo(cursor, this.anchor(el.pts[i]), { bend: rand(-0.03, 0.03) });
      yield* this.click(cursor);
      el.placed = i + 1;
      bump(el);
      yield* this.wait(rand(0.04, 0.12));
    }
    if (el.closed) {
      cursor.shape = "pen-close";
      yield* this.moveTo(cursor, el.pts[0], { bend: rand(-0.03, 0.03) });
      yield* this.click(cursor);
      el.shut = true;
      bump(el);
    }
    el.owner = null;
    bump(el);
    cursor.shape = "pen";
    yield* this.moveTo(cursor, { x: cursor.x + rand(14, 30), y: cursor.y + rand(10, 24) }, { speed: 1.4 });
    yield* this.wait(0.3);
    el.edit = false;
    if (el.fill) el.fillOn = true;
    bump(el);
  }

  *drawLogo(cursor: Agent, el: PathEl) {
    cursor.shape = "pen";
    yield* this.moveTo(cursor, this.anchor(el.pts[0]));
    el.vis = true;
    el.placed = 1;
    bump(el);
    for (let i = 1; i <= el.pts.length; i++) {
      yield* this.moveTo(cursor, el.pts[i % el.pts.length], { speed: 1.6 });
      el.placed = i + 1;
      bump(el);
    }
    el.shut = true;
    el.fillOn = true;
    bump(el);
    yield* this.moveTo(cursor, { x: cursor.x + rand(14, 30), y: cursor.y + rand(10, 24) }, { speed: 1.4 });
  }

  *drawRect(cursor: Agent, el: RectEl) {
    cursor.shape = "cross";
    yield* this.moveTo(cursor, { x: el.x, y: el.y });
    cursor.press = 1;
    el.vis = true;
    el.draw = { w: 0, h: 0 };
    bump(el);
    cursor.ov = () => [this.selection(el)];
    yield* this.moveTo(
      cursor,
      { x: el.x + el.w, y: el.y + el.h },
      {
        speed: 0.75,
        drag: true,
        bend: 0,
        onStep: () => {
          el.draw = { w: Math.max(0, cursor.x - el.x), h: Math.max(0, cursor.y - el.y) };
          bump(el);
        },
      },
    );
    el.draw = null;
    bump(el);
    cursor.shape = "arrow";
    yield* this.wait(rand(0.18, 0.3));
    el.styled = true;
    bump(el);
    yield* this.wait(0.35);
    cursor.ov = null;
  }

  *drawText(cursor: Agent, el: TextEl, guide: GuideEl | null, grow: boolean) {
    if (el.dyn) el.text = el.dyn();
    if (guide) {
      if (guide.axis === "x") {
        el.dx = rand(28, 64);
        el.dy = rand(-8, 8);
      } else {
        el.dx = rand(-8, 8);
        el.dy = rand(18, 34) * (Math.random() < 0.5 ? -1 : 1);
      }
    }
    if (grow) el.size = 18;
    const x = el.x + el.dx;
    const y = el.y + el.dy;
    cursor.shape = "cross";
    yield* this.moveTo(cursor, { x, y });
    if (el.w == null) {
      yield* this.click(cursor);
      el.vis = true;
      el.editing = true;
      bump(el);
    } else {
      cursor.press = 1;
      const ghost: RectEl = {
        kind: "rect",
        id: "",
        v: 0,
        vis: true,
        dx: 0,
        dy: 0,
        x,
        y,
        w: 0,
        h: 0,
        r: 0,
        fill: "",
        draw: null,
        styled: true,
      };
      const lh = lineHeight(el.st, el.size);
      cursor.ov = () => [this.selection(ghost)];
      yield* this.moveTo(
        cursor,
        { x: x + (el.w ?? 0), y: y + lh },
        {
          speed: 0.9,
          drag: true,
          bend: 0,
          onStep: () => {
            ghost.w = Math.max(0, cursor.x - x);
            ghost.h = Math.max(0, cursor.y - y);
          },
        },
      );
      el.vis = true;
      el.editing = true;
      bump(el);
    }
    cursor.shape = "ibeam";
    cursor.ov = () => [{ t: "box", b: this.bounds(el) }];
    yield* this.moveTo(cursor, { x: cursor.x + rand(-30, 10), y: cursor.y + rand(10, 30) }, { speed: 1.5 });
    yield* this.type(el, el.text);
    yield* this.wait(0.12);
    el.editing = false;
    bump(el);
    cursor.shape = "arrow";
    cursor.ov = () => [this.selection(el)];
    if (grow) {
      const steps = [24, 32, 40, 48, 56, 64, 72].filter((size) => size < el.st.size);
      for (const size of [...steps, el.st.size]) {
        yield* this.wait(0.06);
        el.size = size;
        bump(el);
      }
      yield* this.wait(0.15);
    }
    if (guide) {
      const guideTask = this.byTask.get(`g:${guide.id}`);
      while (guideTask && guideTask.state !== "done") yield;
      const box = this.bounds(el);
      const grab = { x: box.x + Math.min(box.w * 0.4, 60) + rand(-6, 6), y: box.y + Math.min(box.h * 0.5, 22) };
      yield* this.moveTo(cursor, grab);
      cursor.press = 1;
      const origin = { x: grab.x - el.dx, y: grab.y - el.dy };
      const snapped = {
        x: origin.x + (guide.axis === "x" ? -rand(2, 5) : rand(-6, 6)),
        y: origin.y + (guide.axis === "y" ? -rand(2, 5) : rand(-3, 3)),
      };
      const apply = () => {
        let dx = cursor.x - origin.x;
        let dy = cursor.y - origin.y;
        if (guide.axis === "x" && Math.abs(dx) < 9) {
          if (dx !== 0 && el.dx !== 0) guide.flash = 1;
          dx = 0;
        }
        if (guide.axis === "y" && Math.abs(dy) < 9) {
          if (dy !== 0 && el.dy !== 0) guide.flash = 1;
          dy = 0;
        }
        el.dx = dx;
        el.dy = dy;
        bump(el);
        bump(guide);
      };
      yield* this.moveTo(cursor, snapped, { speed: 0.6, drag: true, onStep: apply });
      yield* this.wait(0.1);
      yield* this.moveTo(cursor, origin, { speed: 2, onStep: apply });
      el.dx = 0;
      el.dy = 0;
      bump(el);
      yield* this.wait(0.25);
    } else yield* this.wait(0.2);
    cursor.ov = null;
  }

  *dragGuide(cursor: Agent, el: GuideEl) {
    this.rulers.want += 1;
    try {
      const jitter = rand(-0.15, 0.15);
      const spot = () =>
        el.axis === "x"
          ? this.fromViewport(10, this.vp.vh * (0.45 + jitter))
          : this.fromViewport(this.vp.left + (el.pos > 0 ? 400 : 300) * this.vp.s + jitter * 200, 10);
      cursor.shape = "arrow";
      yield* this.moveTo(cursor, spot);
      while (this.rulers.t < 0.95) yield;
      yield* this.moveTo(cursor, spot, { speed: 3 });
      cursor.press = 1;
      cursor.shape = el.axis === "x" ? "ew" : "ns";
      el.vis = true;
      el.dragging = true;
      el.op = 1;
      const track = () => {
        el.cur = el.axis === "x" ? cursor.x : cursor.y;
        bump(el);
      };
      track();
      const end = () => {
        const from = spot();
        return el.axis === "x" ? { x: el.pos, y: from.y + 40 } : { x: from.x + 30, y: el.pos };
      };
      yield* this.moveTo(cursor, end, { speed: 0.55, drag: true, onStep: track });
      el.cur = el.pos;
      el.dragging = false;
      bump(el);
      cursor.shape = "arrow";
      yield* this.wait(0.25);
    } finally {
      this.rulers.want -= 1;
    }
  }

  *duplicate(cursor: Agent, group: Group, index: number) {
    const copy = group.copies[index];
    const placed = [
      { dx: 0, dy: 0, ids: group.ids },
      ...group.copies.filter((_, i) => this.byTask.get(`d:${group.id}:${i}`)?.state === "done"),
    ];
    let source = placed[0];
    for (const item of placed) {
      if (Math.hypot(item.dx - copy.dx, item.dy - copy.dy) < Math.hypot(source.dx - copy.dx, source.dy - copy.dy)) source = item;
    }
    const from = this.unionBounds(source.ids);
    cursor.shape = "arrow";
    const grab = {
      x: from.x + Math.min(from.w * 0.45, 70) + rand(-8, 8),
      y: from.y + Math.min(from.h * 0.45, 30) + rand(-4, 4),
    };
    yield* this.moveTo(cursor, grab);
    yield* this.click(cursor);
    cursor.ov = () => [{ t: "box", b: from, handles: true, badge: `${Math.round(from.w)} × ${Math.round(from.h)}` }];
    yield* this.wait(rand(0.15, 0.3));
    cursor.shape = "dup";
    yield* this.wait(0.12);
    cursor.press = 1;
    const dx = source.dx - copy.dx;
    const dy = source.dy - copy.dy;
    const alreadyShown = (el: El) => el.kind === "text" && el.vis && el.shown === el.text;
    copy.ids.forEach((id, i) => {
      const el = this.els.get(id)!;
      const original = this.els.get(group.ids[i])!;
      if (alreadyShown(el)) return;
      el.vis = true;
      el.dx = dx;
      el.dy = dy;
      if (el.kind === "text" && original.kind === "text") el.shown = el.text;
      if (el.kind === "rect") el.styled = true;
      bump(el);
    });
    const drop = { x: grab.x - dx, y: grab.y - dy };
    cursor.ov = () => {
      const box = this.unionBounds(copy.ids);
      const items: OverlayItem[] = [
        { t: "box", b: from, color: "red" },
        { t: "box", b: box, color: "red" },
      ];
      const gap = this.spacing(from, box);
      if (gap) items.push(gap);
      return items;
    };
    yield* this.moveTo(cursor, drop, {
      speed: 0.6,
      drag: true,
      onStep: () => {
        for (const id of copy.ids) {
          const el = this.els.get(id)!;
          if (el.kind === "text" && el.shown === el.text && el.dx === 0 && el.dy === 0) continue;
          el.dx = cursor.x - drop.x;
          el.dy = cursor.y - drop.y;
          bump(el);
        }
      },
    });
    yield* this.wait(0.1);
    cursor.shape = "arrow";
    cursor.ov = () => {
      const box = this.unionBounds(copy.ids);
      return [{ t: "box", b: box, handles: true, badge: `${Math.round(box.w)} × ${Math.round(box.h)}` }];
    };
    yield* this.wait(0.35);
    cursor.ov = null;
  }

  spacing(a: Bounds, b: Bounds): OverlayItem | null {
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    if (overlapY > 0) {
      const y = Math.max(a.y, b.y) + overlapY / 2;
      const [left, right] = a.x < b.x ? [a, b] : [b, a];
      const gap = right.x - (left.x + left.w);
      if (gap > 0) return { t: "measure", a: { x: left.x + left.w, y }, b: { x: right.x, y }, label: String(Math.round(gap)) };
    } else if (overlapX > 0) {
      const x = Math.max(a.x, b.x) + overlapX / 2;
      const [top, bottom] = a.y < b.y ? [a, b] : [b, a];
      const gap = bottom.y - (top.y + top.h);
      if (gap > 0) return { t: "measure", a: { x, y: top.y + top.h }, b: { x, y: bottom.y }, label: String(Math.round(gap)) };
    }
    return null;
  }

  *editText(cursor: Agent, el: TextEl) {
    cursor.shape = "arrow";
    const box = this.bounds(el);
    const measured = measure(el.shown, el.st, el.size, el.w);
    const width = measured.lines[0] ?? box.w;
    const x = el.align === "center" && el.w ? box.x + (el.w - width) / 2 : box.x;
    yield* this.moveTo(cursor, {
      x: x + Math.min(width * 0.5, 50) + rand(-5, 5),
      y: box.y + lineHeight(el.st, el.size) * 0.55,
    });
    yield* this.click(cursor);
    yield* this.wait(0.08);
    yield* this.click(cursor);
    el.editing = true;
    el.selAll = true;
    bump(el);
    cursor.shape = "ibeam";
    cursor.ov = () => [{ t: "box", b: this.bounds(el) }];
    yield* this.wait(rand(0.2, 0.35));
    yield* this.type(el, el.text, true);
    yield* this.wait(0.12);
    el.editing = false;
    bump(el);
    cursor.shape = "arrow";
    cursor.ov = () => [this.selection(el)];
    yield* this.wait(0.3);
    cursor.ov = null;
  }
}

export { fontFamily, lineHeight, measure };
