// Illustrated overhead view of an exam hall, used for the demo's evidence frames, the still
// image the seat zones are drawn on, and the uploaded "recording". It is a drawing, labelled as
// such on every frame: the demo has no real CCTV footage.

export const W = 1600;
export const H = 900;

export const ROWS = ['A', 'B', 'C', 'D'];
export const COLS = [1, 2, 3, 4, 5, 6];
const colX = (c) => 250 + (c - 1) * 220;
const rowY = (r) => 330 + ROWS.indexOf(r) * 145;

/** Invigilator's desk area at the front of the hall (an ignore zone in the demo). */
export const INVIGILATOR_ZONE = { x: 600, y: 40, w: 400, h: 190 };

/** Seat zone for a desk, in 0-1 image fractions (what the web app stores). */
export function seatZone(seat) {
  const r = seat[0];
  const c = Number(seat.slice(1));
  const x = colX(c) - 100;
  const y = rowY(r) - 62;
  return {
    id: `seat-${seat}`,
    type: 'seat',
    label: seat,
    x: +(x / W).toFixed(4),
    y: +(y / H).toFixed(4),
    w: +(200 / W).toFixed(4),
    h: +(132 / H).toFixed(4),
  };
}

/** Pixel box of a desk's seat zone, for drawing it with the mouse in the demo. */
export function seatPixels(seat) {
  const z = seatZone(seat);
  return { x: z.x * W, y: z.y * H, w: z.w * W, h: z.h * H };
}

const SKIN = ['#C68B59', '#8D5524', '#E0AC69', '#A0673A', '#F1C27D', '#7A4A2A'];
const SHIRT = ['#3B5B8C', '#7A3B3B', '#3E6B4F', '#5B4A7A', '#6B6B6B', '#2F5F6F', '#8C6B3B'];

function student(seat, i, { empty = false } = {}) {
  const cx = colX(Number(seat.slice(1)));
  const cy = rowY(seat[0]);
  const desk = `<rect x="${cx - 78}" y="${cy - 40}" width="156" height="42" rx="4" fill="#8A6A48" stroke="#5E4630"/>
    <rect x="${cx - 40}" y="${cy - 33}" width="58" height="28" rx="2" fill="#ECECE4"/>
    <line x1="${cx - 34}" y1="${cy - 25}" x2="${cx + 10}" y2="${cy - 25}" stroke="#9A9A92" stroke-width="2"/>
    <line x1="${cx - 34}" y1="${cy - 17}" x2="${cx + 4}" y2="${cy - 17}" stroke="#9A9A92" stroke-width="2"/>`;
  if (empty) return desk;
  return `${desk}
    <ellipse cx="${cx}" cy="${cy + 44}" rx="48" ry="24" fill="${SHIRT[i % SHIRT.length]}"/>
    <circle cx="${cx}" cy="${cy + 30}" r="19" fill="${SKIN[i % SKIN.length]}"/>
    <path d="M${cx - 19} ${cy + 27} a19 19 0 0 1 38 0 q-19 -9 -38 0z" fill="#1E1A17"/>`;
}

function phone(x, y) {
  return `<rect x="${x}" y="${y}" width="16" height="28" rx="3" fill="#15171C" stroke="#4A4F5A"/>
    <rect x="${x + 2}" y="${y + 3}" width="12" height="20" rx="1" fill="#6FA8FF" opacity="0.85"/>`;
}

function calculator(x, y) {
  return `<rect x="${x}" y="${y}" width="24" height="32" rx="3" fill="#3A3D44" stroke="#22252A"/>
    <rect x="${x + 3}" y="${y + 3}" width="18" height="7" fill="#B9C8A4"/>
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${x + 3 + c * 6.5}" y="${y + 13 + r * 6}" width="4.5" height="4" fill="#9AA0AA"/>`).join('')).join('')}`;
}

function box(x, y, w, h, color, label, below = false) {
  const tw = label.length * 8.6 + 12;
  const ly = below ? y + h : y - 24;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="3"/>
    <rect x="${x - 1.5}" y="${ly}" width="${tw}" height="24" fill="${color}"/>
    <text x="${x + 5}" y="${ly + 17}" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#0B0D12" font-weight="700">${label}</text>`;
}

/**
 * The hall, optionally with an object at a seat and the AI's detection boxes drawn on it.
 * object: { seat, kind: 'phone' | 'calculator', inHand }
 */
export function sceneSvg({ hall = 'EXAM HALL A', cam = 'CAM 1', time = '2026-10-26 10:42:17', object = null, boxes = false, absent = [] } = {}) {
  let i = 0;
  const seats = ROWS.flatMap((r) => COLS.map((c) => `${r}${c}`));
  const people = seats.map((s) => student(s, i++, { empty: absent.includes(s) })).join('');

  let obj = '';
  let det = '';
  if (object) {
    const cx = colX(Number(object.seat.slice(1)));
    const cy = rowY(object.seat[0]);
    const [ox, oy] = object.kind === 'phone'
      ? (object.inHand ? [cx + 22, cy + 24] : [cx + 34, cy - 36])
      : [cx + 30, cy - 38];
    obj = object.kind === 'phone' ? phone(ox, oy) : calculator(ox, oy);
    if (boxes) {
      const ow = object.kind === 'phone' ? 16 : 24;
      const oh = object.kind === 'phone' ? 28 : 32;
      det = box(cx - 62, cy + 2, 124, 76, '#4ADE80', `person 0.94  ${object.seat}`)
        + box(ox - 6, oy - 6, ow + 12, oh + 12, '#FB923C', `${object.kind === 'phone' ? 'cell phone' : 'calculator'} ${object.kind === 'phone' ? '0.91' : '0.87'}`, true);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <pattern id="tiles" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect width="80" height="80" fill="#4C4F55"/>
      <path d="M80 0 H0 V80" fill="none" stroke="#575A61" stroke-width="2"/>
    </pattern>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#tiles)"/>
  <rect x="0" y="0" width="${W}" height="30" fill="#2E3036"/>
  <rect x="560" y="8" width="480" height="16" rx="3" fill="#2B4A3A"/>
  <!-- invigilator -->
  <rect x="660" y="125" width="280" height="56" rx="5" fill="#6E5338" stroke="#4A3826"/>
  <rect x="700" y="137" width="70" height="34" fill="#ECECE4"/>
  <ellipse cx="800" cy="98" rx="52" ry="26" fill="#2C3E50"/>
  <circle cx="800" cy="86" r="21" fill="#B07A4A"/>
  <path d="M779 84 a21 21 0 0 1 42 0 q-21 -8 -42 0z" fill="#3A2C22"/>
  ${phone(848, 140)}
  ${people}
  ${obj}
  ${det}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  <g font-family="DejaVu Sans Mono, monospace" font-weight="700">
    <circle cx="44" cy="66" r="9" fill="#EF4444"/>
    <text x="62" y="73" font-size="22" fill="#FFFFFF" stroke="#000" stroke-width="0.6">${hall} · ${cam}</text>
    <text x="${W - 30}" y="73" font-size="22" fill="#FFFFFF" text-anchor="end" stroke="#000" stroke-width="0.6">${time}</text>
  </g>
  <text x="${W - 24}" y="${H - 22}" font-family="DejaVu Sans, sans-serif" font-size="17" fill="#FFFFFF" fill-opacity="0.75" text-anchor="end">Demo illustration - not real footage</text>
</svg>`;
}
