// Generates the AXION OS pixel-CPU logo set from code: run `npm run logo`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'brand');
fs.mkdirSync(OUT, { recursive: true });

const C = {
  pin: '#b8c2dc', pinHi: '#eef2ff', body: '#151a33', edge: '#3dd9ff', edgeDk: '#1e7fa8',
  die: '#0a0d1d', gold: '#ffc23d', mark: '#8dff4a', markDk: '#4fae1f', dot: '#ff4fd8', trace: '#2b3466',
};

// 24×24 chip: pins on 4 sides, cyan bevel, gold die ring, pixel "A" glyph, magenta orientation dot.
function chipGrid() {
  const N = 24, g = Array.from({ length: N }, () => Array(N).fill(null));
  const pinIdx = [5, 7, 9, 11, 13, 15, 17];
  for (const i of pinIdx) for (let t = 0; t < 3; t++) {
    const col = t === 0 ? C.pinHi : C.pin;
    g[t][i] = col; g[N - 1 - t][i] = col; g[i][t] = col; g[i][N - 1 - t] = col;
  }
  for (let y = 3; y <= 20; y++) for (let x = 3; x <= 20; x++) {
    const edge = y === 3 || y === 20 || x === 3 || x === 20;
    g[y][x] = edge ? (y === 20 || x === 20 ? C.edgeDk : C.edge) : C.body;
  }
  // traces from die to pins
  for (const i of pinIdx) { g[4][i] = C.trace; g[19][i] = C.trace; g[i][4] = C.trace; g[i][19] = C.trace; }
  for (let y = 6; y <= 17; y++) for (let x = 6; x <= 17; x++) {
    const ring = y === 6 || y === 17 || x === 6 || x === 17;
    g[y][x] = ring ? C.gold : C.die;
  }
  const A = ['...##...', '..####..', '.##..##.', '.##..##.', '.######.', '.##..##.', '.##..##.', '........'];
  A.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') g[8 + r][8 + c] = r >= 5 ? C.markDk : C.mark; }));
  g[5][5] = C.dot;
  return g;
}

const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

function rects(grid, ox = 0, oy = 0, s = 1) {
  let out = '';
  grid.forEach((row, y) => row.forEach((col, x) => {
    if (col) out += `<rect x="${ox + x * s}" y="${oy + y * s}" width="${s}" height="${s}" fill="${col}"/>`;
  }));
  return out;
}

function textGrid(str, color, shadow) {
  const rows = 7, glyphs = [...str].map((ch) => FONT[ch]);
  const w = glyphs.length * 6 - 1;
  const g = Array.from({ length: rows + 1 }, () => Array(w + 1).fill(null));
  glyphs.forEach((gl, i) => gl.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '#') { g[y + 1][i * 6 + x + 1] ??= shadow; g[y][i * 6 + x] = color; }
  })));
  return g;
}

const svg = (w, h, inner, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 8}" height="${h * 8}" shape-rendering="crispEdges">` +
  (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '') + inner + '</svg>\n';

const chip = chipGrid();
fs.writeFileSync(path.join(OUT, 'logo.svg'), svg(24, 24, rects(chip)));
fs.writeFileSync(path.join(OUT, 'favicon.svg'), svg(24, 24, rects(chip), '#0a0b14'));

// Horizontal lockup: chip + "AXION OS" wordmark (2× pixel scale for the text).
const word = textGrid('AXION OS', '#e8ecff', '#3a3f66');
const wordW = word[0].length * 2;
const W = 24 + 6 + wordW + 2, Hh = 24;
const lock = rects(chip) + rects(word, 30, 4, 2) + `<rect x="30" y="22" width="${wordW - 2}" height="1" fill="${C.edge}"/>`;
fs.writeFileSync(path.join(OUT, 'logo-full.svg'), svg(W, Hh, lock));

// Social card 1200×630 (as SVG; 150×79 pixel canvas scaled 8×).
const sw = 150, sh = 79;
let card = `<rect width="${sw}" height="${sh}" fill="#0a0b14"/>`;
for (let i = 0; i < 90; i++) {
  const x = (i * 37) % sw, y = (i * 53) % 40;
  card += `<rect x="${x}" y="${y}" width="1" height="1" fill="${i % 7 ? '#3a3f66' : '#e8ecff'}"/>`;
}
for (let x = 0; x < sw; x++) {
  const h = 6 + Math.round(4 * Math.sin(x * 0.17) + 3 * Math.sin(x * 0.05 + 1));
  card += `<rect x="${x}" y="${sh - h}" width="1" height="${h}" fill="#151a33"/>`;
  if (x % 9 === 0) card += `<rect x="${x}" y="${sh - h - 6}" width="4" height="6" fill="#11142a"/><rect x="${x + 1}" y="${sh - h - 4}" width="1" height="1" fill="#ffc23d"/>`;
}
card += rects(chip, 12, 20, 1.6);
card += rects(textGrid('AXION OS', '#e8ecff', '#3a3f66'), 58, 26, 1.6);
card += `<rect x="58" y="44" width="76" height="1" fill="${C.edge}"/>`;
fs.writeFileSync(path.join(OUT, 'social.svg'), svg(sw, sh, card).replace(`width="${sw * 8}" height="${sh * 8}"`, 'width="1200" height="632"'));

console.log('logo set written to', OUT);
