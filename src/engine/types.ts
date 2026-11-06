export const CANVAS_W = 1280;
export const MARGIN = 80;
export const RIGHT = 1200;
export const CONTENT_X = MARGIN + 36;
export const OFF_L = -10000;
export const OFF_R = 10000;

export type FontStyle = {
  font: "sans" | "mono";
  size: number;
  weight: number;
  lh: number;
  color: string;
  ls?: number;
  code?: boolean;
  pre?: boolean;
  upper?: boolean;
};

export type Pt = { x: number; y: number };

export type Bounds = { x: number; y: number; w: number; h: number };

export type OverlayItem =
  | {
      t: "box";
      b: Bounds;
      handles?: boolean;
      badge?: string;
      color?: "red" | "blue";
      rulerLines?: boolean;
      underline?: { x: number; y: number; w: number; h: number };
    }
  | { t: "measure"; a: Pt; b: Pt; label: string };

export type BaseEl = {
  id: string;
  v: number;
  vis: boolean;
  dx: number;
  dy: number;
  sticky?: boolean;
  href?: string;
};

export type TextEl = BaseEl & {
  kind: "text";
  x: number;
  y: number;
  w?: number;
  align: "left" | "center";
  text: string;
  shown: string;
  st: FontStyle;
  size: number;
  editing: boolean;
  selAll: boolean;
  dyn?: () => string;
  tag?: "h1" | "h2" | "h3" | "p";
};

export type RectEl = BaseEl & {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  fill: string;
  stroke?: string;
  draw: { w: number; h: number } | null;
  styled: boolean;
};

export type PathEl = BaseEl & {
  kind: "path";
  pts: Pt[];
  closed: boolean;
  stroke: string;
  sw: number;
  fill?: string;
  d?: string;
  tf?: { x: number; y: number; s: number };
  add: boolean;
  placed: number;
  shut: boolean;
  edit: boolean;
  owner: number | null;
  fillOn: boolean;
};

export type GuideEl = BaseEl & {
  kind: "guide";
  axis: "x" | "y";
  pos: number;
  cur: number;
  op: number;
  flash: number;
  dragging: boolean;
};

export type El = TextEl | RectEl | PathEl | GuideEl;

export type TaskSpec =
  | { type: "path"; el: string }
  | { type: "rect"; el: string }
  | { type: "text"; el: string; snap?: string; grow?: boolean }
  | { type: "guide"; el: string }
  | { type: "dup"; group: string; k: number }
  | { type: "edit"; el: string };

export type Task = {
  id: string;
  y: number;
  spec: TaskSpec;
  deps: string[];
  state: "wait" | "active" | "done";
  doneAt: number;
};

export type Group = {
  id: string;
  ids: string[];
  copies: { dx: number; dy: number; ids: string[] }[];
};

export type CursorShape =
  | "arrow"
  | "dup"
  | "pen"
  | "pen-add"
  | "pen-close"
  | "cross"
  | "ibeam"
  | "ew"
  | "ns";

export type Agent = {
  id: number;
  x: number;
  y: number;
  home: Pt | null;
  name: string;
  color: string;
  shape: CursorShape;
  press: number;
  task: Task | null;
  gen: Generator<void, void, number> | null;
  ov: (() => OverlayItem[]) | null;
  idleFor: number;
  leaving: boolean;
  worked: boolean;
  sticky: boolean;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  force: number;
  spin: number;
  curl: number;
  ph: number;
  orbit: number;
  follow: boolean;
};

export type Scene = {
  els: El[];
  tasks: Omit<Task, "state" | "doneAt">[];
  groups: Group[];
  height: number;
  anchors: Record<string, number>;
};
