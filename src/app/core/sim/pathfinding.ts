import { Vec2, World, edgeKey } from './world';

const TURN_PENALTY = 160;
const MAIN_ROAD_FACTOR = 0.82;

interface Attachment {
  /** Point where the leg from the off-road point meets the road. */
  road: Vec2;
  /** Candidate graph nodes reachable along that road segment, with the distance to each. */
  nodes: { i: number; j: number; cost: number; edge: string }[];
  /** Segment the attachment lies on, so two attachments on the same segment can connect directly. */
  segment: string;
}

/** Finds the nearest street to a point inside a block and the two intersections it connects. */
function attach(world: World, p: Vec2): Attachment {
  const { xs, ys } = world;
  let i = xs.findIndex((x, k) => k < xs.length - 1 && p.x >= x && p.x <= xs[k + 1]);
  let j = ys.findIndex((y, k) => k < ys.length - 1 && p.y >= y && p.y <= ys[k + 1]);
  if (i < 0) i = p.x < 0 ? 0 : xs.length - 2;
  if (j < 0) j = p.y < 0 ? 0 : ys.length - 2;

  const options = [
    { d: Math.abs(p.y - ys[j]), kind: 'top' },
    { d: Math.abs(ys[j + 1] - p.y), kind: 'bottom' },
    { d: Math.abs(p.x - xs[i]), kind: 'left' },
    { d: Math.abs(xs[i + 1] - p.x), kind: 'right' },
  ].sort((a, b) => a.d - b.d);

  const kind = options[0].kind;
  if (kind === 'top' || kind === 'bottom') {
    const jj = kind === 'top' ? j : j + 1;
    const road = { x: p.x, y: ys[jj] };
    const edge = edgeKey(i, jj, i + 1, jj);
    return {
      road,
      segment: edge,
      nodes: [
        { i, j: jj, cost: road.x - xs[i], edge },
        { i: i + 1, j: jj, cost: xs[i + 1] - road.x, edge },
      ],
    };
  }
  const ii = kind === 'left' ? i : i + 1;
  const road = { x: xs[ii], y: p.y };
  const edge = edgeKey(ii, j, ii, j + 1);
  return {
    road,
    segment: edge,
    nodes: [
      { i: ii, j, cost: road.y - ys[j], edge },
      { i: ii, j: j + 1, cost: ys[j + 1] - road.y, edge },
    ],
  };
}

interface State {
  i: number;
  j: number;
  dir: number;
  cost: number;
  prev: State | null;
}

/**
 * Orthogonal street-following route between two points, avoiding blocked
 * street segments (active no-fly zones). Dijkstra over (node, heading) states
 * with a turn penalty so routes read like the long straight legs of real
 * delivery corridors instead of staircases.
 */
export function findRoute(world: World, from: Vec2, to: Vec2, blocked: Set<string>): Vec2[] {
  const { xs, ys } = world;
  const a = attach(world, from);
  const b = attach(world, to);

  if (a.segment === b.segment && !blocked.has(a.segment)) {
    return simplify([from, a.road, b.road, to]);
  }

  const mainX = new Set(world.roads.filter((r) => r.axis === 'x' && r.main).map((r) => r.at));
  const mainY = new Set(world.roads.filter((r) => r.axis === 'y' && r.main).map((r) => r.at));

  const best = new Map<string, number>();
  const open: State[] = [];
  const push = (s: State) => {
    const key = `${s.i},${s.j},${s.dir}`;
    if ((best.get(key) ?? Infinity) <= s.cost) return;
    best.set(key, s.cost);
    open.push(s);
  };

  for (const n of a.nodes) {
    const penalty = blocked.has(n.edge) ? 5000 : 0;
    push({ i: n.i, j: n.j, dir: -1, cost: n.cost + penalty, prev: null });
  }

  const goals = new Map(b.nodes.map((n) => [`${n.i},${n.j}`, n]));
  let bestGoal: { state: State; total: number } | null = null;

  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];

  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (open[k].cost < open[bi].cost) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (bestGoal && cur.cost >= bestGoal.total) break;

    const goal = goals.get(`${cur.i},${cur.j}`);
    if (goal) {
      const total = cur.cost + goal.cost + (blocked.has(goal.edge) ? 5000 : 0);
      if (!bestGoal || total < bestGoal.total) bestGoal = { state: cur, total };
    }

    dirs.forEach(([di, dj], d) => {
      const ni = cur.i + di;
      const nj = cur.j + dj;
      if (ni < 0 || nj < 0 || ni >= xs.length || nj >= ys.length) return;
      const key = edgeKey(cur.i, cur.j, ni, nj);
      if (blocked.has(key)) return;
      let len = Math.abs(xs[ni] - xs[cur.i]) + Math.abs(ys[nj] - ys[cur.j]);
      const onMain = di !== 0 ? mainY.has(ys[cur.j]) : mainX.has(xs[cur.i]);
      if (onMain) len *= MAIN_ROAD_FACTOR;
      const turn = cur.dir >= 0 && cur.dir !== d ? TURN_PENALTY : 0;
      push({ i: ni, j: nj, dir: d, cost: cur.cost + len + turn, prev: cur });
    });
  }

  if (!bestGoal) return [from, to];

  const nodes: Vec2[] = [];
  for (let s: State | null = bestGoal.state; s; s = s.prev) nodes.unshift({ x: xs[s.i], y: ys[s.j] });
  return simplify([from, a.road, ...nodes, b.road, to]);
}

/** Drops duplicate and collinear points. */
export function simplify(points: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      const b = out[out.length - 1];
      const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      const dot = (b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y);
      if (Math.abs(cross) < 0.01 && dot >= 0) {
        out[out.length - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

export function pathLength(path: Vec2[]) {
  let len = 0;
  for (let k = 1; k < path.length; k++) len += Math.hypot(path[k].x - path[k - 1].x, path[k].y - path[k - 1].y);
  return len;
}

/** Point and heading (radians, 0 = east, clockwise because y points south) at a distance along a path. */
export function pointAt(path: Vec2[], distance: number): { p: Vec2; heading: number; segment: number } {
  let remaining = Math.max(0, distance);
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1];
    const b = path[k];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= len || k === path.length - 1) {
      const t = len === 0 ? 1 : Math.min(1, remaining / len);
      return {
        p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        heading: Math.atan2(b.y - a.y, b.x - a.x),
        segment: k,
      };
    }
    remaining -= len;
  }
  const last = path[path.length - 1];
  return { p: { ...last }, heading: 0, segment: path.length - 1 };
}

/** Splits a path at a distance into [travelled, remaining] polylines sharing the split point. */
export function splitPath(path: Vec2[], distance: number): [Vec2[], Vec2[]] {
  const { p, segment } = pointAt(path, distance);
  return [
    [...path.slice(0, segment), p],
    [p, ...path.slice(segment)],
  ];
}
