import { createRng, Rng } from './rng';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type BlockKind = 'residential' | 'apartments' | 'park' | 'industrial' | 'warehouse';
export type RoofKind = 'hip' | 'flat';

export interface Building {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  roof: RoofKind;
  roofH: number;
}

export interface Tree {
  x: number;
  y: number;
  r: number;
}

export interface Block {
  i: number;
  j: number;
  rect: Rect;
  kind: BlockKind;
  /** Parcel / path lines inside the block as flat [x1, y1, x2, y2] tuples. */
  lines: number[];
}

export interface RoadLine {
  axis: 'x' | 'y';
  /** Fixed coordinate of the road (x for vertical roads, y for horizontal). */
  at: number;
  width: number;
  main: boolean;
  name: string;
}

export interface Warehouse {
  id: string;
  name: string;
  block: Rect;
  pad: Vec2;
  /** Parking spots where idle / charging drones sit. */
  spots: Vec2[];
  chargePad: string;
}

export interface NoFlyZone {
  id: string;
  rect: Rect;
  center: Vec2;
  edges: string[];
  /** Temporary zones are toggled by the simulation to force re-routing. */
  temporary: boolean;
}

export interface Address {
  label: string;
  pos: Vec2;
}

export interface World {
  width: number;
  height: number;
  xs: number[];
  ys: number[];
  roads: RoadLine[];
  diagonal: { a: Vec2; b: Vec2; width: number; name: string };
  blocks: Block[];
  buildings: Building[];
  trees: Tree[];
  warehouses: Warehouse[];
  zones: NoFlyZone[];
  addresses: Address[];
}

const XS = [0, 210, 400, 620, 800, 1010, 1190, 1400, 1600, 1790, 2000, 2200, 2400];
const YS = [0, 180, 360, 560, 730, 920, 1100, 1290, 1460, 1600];
const MAIN_X = new Set([620, 1400, 2000]);
const MAIN_Y = new Set([560, 1100]);

const X_NAMES = [
  'Ajiniyaz St',
  'Tolepbergen St',
  'Aydos Biy St',
  'Berdaq Ave',
  'Kunxoja St',
  'Allayar St',
  'Qaraqalpaqstan St',
  'Mustaqillik Ave',
  'I. Yusupov St',
  'Jiyen Jiraw St',
  'Amir Temur Ave',
  'Nawayi St',
  'Ulugbek St',
];
const Y_NAMES = [
  'Shimbay Rd',
  'Ernazar Alakoz St',
  'Qizketken St',
  'Doslyq Ave',
  'Aral St',
  'Gulistan St',
  'Amu Darya Ave',
  'Bozataw St',
  'Taxtakopir St',
  'Kegeyli Rd',
];

export const edgeKey = (i1: number, j1: number, i2: number, j2: number) =>
  i1 < i2 || (i1 === i2 && j1 < j2) ? `${i1},${j1}|${i2},${j2}` : `${i2},${j2}|${i1},${j1}`;

export function roadWidthX(x: number) {
  return MAIN_X.has(x) ? 26 : 14;
}
export function roadWidthY(y: number) {
  return MAIN_Y.has(y) ? 26 : 14;
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function generateWorld(seed = 7): World {
  const rng = createRng(seed);
  const width = XS[XS.length - 1];
  const height = YS[YS.length - 1];

  const roads: RoadLine[] = [
    ...XS.map((x, i) => ({
      axis: 'x' as const,
      at: x,
      width: roadWidthX(x),
      main: MAIN_X.has(x),
      name: X_NAMES[i],
    })),
    ...YS.map((y, j) => ({
      axis: 'y' as const,
      at: y,
      width: roadWidthY(y),
      main: MAIN_Y.has(y),
      name: Y_NAMES[j],
    })),
  ];

  const diagonal = { a: { x: 0, y: 1440 }, b: { x: 1010, y: 380 }, width: 20, name: 'Berdaq Ave' };
  const onDiagonal = (p: Vec2, margin: number) =>
    distToSegment(p, diagonal.a, diagonal.b) < diagonal.width / 2 + margin;

  const warehouseCells: Record<string, { id: string; name: string; pad: string }> = {
    '5,0': { id: 'WH-01', name: 'North', pad: 'CP-01' },
    '1,6': { id: 'WH-02', name: 'Riverside', pad: 'CP-02' },
    '8,4': { id: 'WH-03', name: 'Downtown', pad: 'CP-03' },
  };
  const parkCells = new Set(['3,3', '10,6', '6,7', '2,1']);

  const blocks: Block[] = [];
  const buildings: Building[] = [];
  const trees: Tree[] = [];
  const warehouses: Warehouse[] = [];
  const addressCandidates: Address[] = [];

  for (let i = 0; i < XS.length - 1; i++) {
    for (let j = 0; j < YS.length - 1; j++) {
      const x0 = XS[i] + roadWidthX(XS[i]) / 2 + 3;
      const x1 = XS[i + 1] - roadWidthX(XS[i + 1]) / 2 - 3;
      const y0 = YS[j] + roadWidthY(YS[j]) / 2 + 3;
      const y1 = YS[j + 1] - roadWidthY(YS[j + 1]) / 2 - 3;
      const rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      const key = `${i},${j}`;

      const cx = (x0 + x1) / 2 - width / 2;
      const cy = (y0 + y1) / 2 - height / 2;
      const central = Math.hypot(cx / width, cy / height) < 0.28;

      let kind: BlockKind = 'residential';
      if (warehouseCells[key]) kind = 'warehouse';
      else if (parkCells.has(key)) kind = 'park';
      else if (central && rng.chance(0.55)) kind = 'apartments';
      else if (rng.chance(0.08)) kind = 'industrial';
      else if (rng.chance(0.07)) kind = 'apartments';

      const block: Block = { i, j, rect, kind, lines: [] };
      blocks.push(block);

      const keep = (b: Building) =>
        !onDiagonal({ x: b.x, y: b.y }, Math.max(b.w, b.d) / 2 + 4) && b.w > 5 && b.d > 5;

      if (kind === 'residential') {
        fillResidential(rng, block, buildings, trees, addressCandidates, keep, onDiagonal);
      } else if (kind === 'apartments') {
        fillApartments(rng, block, buildings, trees, keep, onDiagonal);
      } else if (kind === 'park') {
        fillPark(rng, block, trees, onDiagonal);
      } else if (kind === 'industrial') {
        fillIndustrial(rng, block, buildings, keep);
      } else {
        const meta = warehouseCells[key];
        const hall = {
          x: x0 + rect.w * 0.32,
          y: y0 + rect.h * 0.5,
          w: rect.w * 0.5,
          d: rect.h * 0.62,
          h: 13,
          roof: 'flat' as const,
          roofH: 0,
        };
        buildings.push(hall);
        const pad = { x: x0 + rect.w * 0.78, y: y0 + rect.h * 0.5 };
        const spots: Vec2[] = [];
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 3; c++) {
            spots.push({ x: x0 + rect.w * (0.66 + c * 0.1), y: y0 + rect.h * (0.2 + r * 0.2) });
          }
        }
        warehouses.push({
          id: meta.id,
          name: meta.name,
          block: rect,
          pad,
          spots,
          chargePad: meta.pad,
        });
        block.lines.push(x0 + rect.w * 0.6, y0 + 6, x0 + rect.w * 0.6, y1 - 6);
      }
    }
  }

  const zones: NoFlyZone[] = [
    makeZone('Zone 1B', 'y', 3, 4, 6, false),
    makeZone('Zone 2C', 'x', 9, 1, 3, false),
    makeZone('Zone 3A', 'y', 7, 5, 7, false),
    makeZone('Zone 4A', 'x', 6, 5, 7, true),
    makeZone('Zone 5D', 'y', 5, 9, 11, true),
  ];

  const addresses: Address[] = [];
  const used = new Set<string>();
  while (addresses.length < 48 && addressCandidates.length) {
    const cand = addressCandidates.splice(rng.int(0, addressCandidates.length - 1), 1)[0];
    if (used.has(cand.label)) continue;
    used.add(cand.label);
    addresses.push(cand);
  }

  return {
    width,
    height,
    xs: XS,
    ys: YS,
    roads,
    diagonal,
    blocks,
    buildings,
    trees,
    warehouses,
    zones,
    addresses,
  };
}

function makeZone(
  id: string,
  axis: 'x' | 'y',
  fixedIndex: number,
  from: number,
  to: number,
  temporary: boolean,
): NoFlyZone {
  const edges: string[] = [];
  let rect: Rect;
  if (axis === 'y') {
    const y = YS[fixedIndex];
    const x0 = XS[from];
    const x1 = XS[to];
    for (let i = from; i < to; i++) edges.push(edgeKey(i, fixedIndex, i + 1, fixedIndex));
    rect = { x: x0 + 40, y: y - 22, w: x1 - x0 - 80, h: 44 };
  } else {
    const x = XS[fixedIndex];
    const y0 = YS[from];
    const y1 = YS[to];
    for (let j = from; j < to; j++) edges.push(edgeKey(fixedIndex, j, fixedIndex, j + 1));
    rect = { x: x - 22, y: y0 + 40, w: 44, h: y1 - y0 - 80 };
  }
  return {
    id,
    rect,
    center: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
    edges,
    temporary,
  };
}

function fillResidential(
  rng: Rng,
  block: Block,
  buildings: Building[],
  trees: Tree[],
  addresses: Address[],
  keep: (b: Building) => boolean,
  onDiagonal: (p: Vec2, m: number) => boolean,
) {
  const { rect } = block;
  const horizontal = rect.w >= rect.h;
  const long = horizontal ? rect.w : rect.h;
  const short = horizontal ? rect.h : rect.w;
  const rowDepth = short / 2;

  // back-fence line between the two rows
  if (horizontal) block.lines.push(rect.x, rect.y + rowDepth, rect.x + rect.w, rect.y + rowDepth);
  else block.lines.push(rect.x + rowDepth, rect.y, rect.x + rowDepth, rect.y + rect.h);

  for (let row = 0; row < 2; row++) {
    let t = 0;
    while (t < long - 12) {
      const lotW = Math.min(rng.range(19, 27), long - t);
      const lotMid = t + lotW / 2;

      // lot divider
      const tEnd = t + lotW;
      if (tEnd < long - 4) {
        if (horizontal) {
          const ya = row === 0 ? rect.y : rect.y + rowDepth;
          block.lines.push(rect.x + tEnd, ya, rect.x + tEnd, ya + rowDepth);
        } else {
          const xa = row === 0 ? rect.x : rect.x + rowDepth;
          block.lines.push(xa, rect.y + tEnd, xa + rowDepth, rect.y + tEnd);
        }
      }

      const bw = lotW * rng.range(0.55, 0.72);
      const bd = Math.min(rowDepth * rng.range(0.42, 0.55), 15);
      const setback = rng.range(4, 7);
      const across = row === 0 ? setback + bd / 2 : short - setback - bd / 2;
      const b: Building = horizontal
        ? {
            x: rect.x + lotMid,
            y: rect.y + across,
            w: bw,
            d: bd,
            h: rng.range(5.5, 8.5),
            roof: 'hip',
            roofH: rng.range(3, 4.6),
          }
        : {
            x: rect.x + across,
            y: rect.y + lotMid,
            w: bd,
            d: bw,
            h: rng.range(5.5, 8.5),
            roof: 'hip',
            roofH: rng.range(3, 4.6),
          };

      if (keep(b)) {
        buildings.push(b);
        const facingStreet = horizontal
          ? row === 0
            ? YS[block.j]
            : YS[block.j + 1]
          : row === 0
            ? XS[block.i]
            : XS[block.i + 1];
        const streetName = horizontal
          ? Y_NAMES[row === 0 ? block.j : block.j + 1]
          : X_NAMES[row === 0 ? block.i : block.i + 1];
        const number = Math.round((horizontal ? b.x : b.y) / 9) + 1;
        if (facingStreet > 0 && facingStreet < (horizontal ? YS[YS.length - 1] : XS[XS.length - 1])) {
          addresses.push({ label: `${number} ${streetName}`, pos: { x: b.x, y: b.y } });
        }
      }

      // back-yard trees
      if (rng.chance(0.62)) {
        const inner = row === 0 ? rowDepth * rng.range(0.7, 0.92) : short - rowDepth * rng.range(0.7, 0.92);
        const p = horizontal
          ? { x: rect.x + lotMid + rng.range(-lotW / 3, lotW / 3), y: rect.y + inner }
          : { x: rect.x + inner, y: rect.y + lotMid + rng.range(-lotW / 3, lotW / 3) };
        if (!onDiagonal(p, 6)) trees.push({ ...p, r: rng.range(3.2, 5.2) });
      }
      t += lotW;
    }
  }
}

function fillApartments(
  rng: Rng,
  block: Block,
  buildings: Building[],
  trees: Tree[],
  keep: (b: Building) => boolean,
  onDiagonal: (p: Vec2, m: number) => boolean,
) {
  const { rect } = block;
  const cols = rect.w > 150 ? 2 : 1;
  const rows = rect.h > 150 ? 2 : 1;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cw = rect.w / cols;
      const ch = rect.h / rows;
      const b: Building = {
        x: rect.x + cw * (c + 0.5),
        y: rect.y + ch * (r + 0.5),
        w: cw * rng.range(0.5, 0.7),
        d: ch * rng.range(0.3, 0.45),
        h: rng.range(16, 34),
        roof: 'flat',
        roofH: 0,
      };
      if (keep(b)) buildings.push(b);
    }
  }
  const count = Math.round((rect.w * rect.h) / 1400);
  for (let k = 0; k < count; k++) {
    const p = { x: rect.x + rng.range(6, rect.w - 6), y: rect.y + rng.range(6, rect.h - 6) };
    const inside = buildings.some(
      (b) => Math.abs(b.x - p.x) < b.w / 2 + 5 && Math.abs(b.y - p.y) < b.d / 2 + 5,
    );
    if (!inside && !onDiagonal(p, 6)) trees.push({ ...p, r: rng.range(3, 4.6) });
  }
}

function fillPark(rng: Rng, block: Block, trees: Tree[], onDiagonal: (p: Vec2, m: number) => boolean) {
  const { rect } = block;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  block.lines.push(rect.x, cy, rect.x + rect.w, cy, cx, rect.y, cx, rect.y + rect.h);
  const count = Math.round((rect.w * rect.h) / 320);
  for (let k = 0; k < count; k++) {
    const p = { x: rect.x + rng.range(5, rect.w - 5), y: rect.y + rng.range(5, rect.h - 5) };
    if (Math.abs(p.x - cx) < 7 || Math.abs(p.y - cy) < 7 || onDiagonal(p, 6)) continue;
    trees.push({ ...p, r: rng.range(3.6, 6.2) });
  }
}

function fillIndustrial(rng: Rng, block: Block, buildings: Building[], keep: (b: Building) => boolean) {
  const { rect } = block;
  const b: Building = {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
    w: rect.w * rng.range(0.55, 0.75),
    d: rect.h * rng.range(0.45, 0.65),
    h: rng.range(9, 14),
    roof: 'flat',
    roofH: 0,
  };
  if (keep(b)) buildings.push(b);
}

/** Maps world meters to approximate GPS around central Nukus. */
export function toLatLng(p: Vec2, world: World) {
  const lat = 42.4612 - (p.y - world.height / 2) / 111_000;
  const lng = 59.6103 + (p.x - world.width / 2) / 81_900;
  return { lat, lng };
}
