// Records a captioned walkthrough of ClassroomGuard for showing to others.
//
//   sh demo/run.sh            (sets up a demo database and servers, then runs this)
//
// The app runs for real against the API; only the AI engine is stood in for: its detections
// are posted through the same API endpoints the engine uses (X-Service-Token), with illustrated
// evidence frames from demo/scene.mjs. Output: demo/output/ClassroomGuard-demo.webm

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { H, INVIGILATOR_ZONE, W, sceneSvg, seatPixels } from './scene.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'output');
const STORAGE = process.env.DEMO_STORAGE ?? path.join(OUT, 'storage');
const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:3000';
const API = process.env.DEMO_API_URL ?? 'http://127.0.0.1:8000';
const SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN;
const EMAIL = 'admin.admin@classguard.dev'; // Dr. Sarah Chen, admin (demo account)
const PASSWORD = 'Admin@12345';
const PACE = Number(process.env.DEMO_PACE ?? 1); // <1 for a quick dry run

if (!SERVICE_TOKEN) throw new Error('Set AI_SERVICE_TOKEN (the same value as the API)');
fs.mkdirSync(path.join(STORAGE, 'evidence'), { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });

// ── 1. Illustrations: evidence frames, a still for the seat map, a short "recording" ──────
async function render(svg, file) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.screenshot({ path: file, type: file.endsWith('.png') ? 'png' : 'jpeg', quality: file.endsWith('.png') ? undefined : 88 });
  await page.close();
}
const ev = (name) => path.join(STORAGE, 'evidence', name);
await render(sceneSvg({ time: '2026-10-26 10:42:17', object: { seat: 'B4', kind: 'phone', inHand: true }, boxes: true }), ev('demo-live-hall-a-phone-b4.jpg'));
await render(sceneSvg({ hall: 'EXAM HALL B', time: '2026-10-26 09:31:05', object: { seat: 'C2', kind: 'calculator' }, boxes: true }), ev('demo-hall-b-calculator-c2.jpg'));
await render(sceneSvg({ time: '2026-10-25 11:12:40', object: { seat: 'A5', kind: 'phone', inHand: true }, boxes: true }), ev('demo-hall-a-phone-a5.jpg'));
await render(sceneSvg({ hall: 'EXAM HALL B', time: '2026-10-22 10:41:12', object: { seat: 'D3', kind: 'phone', inHand: true }, boxes: true }), ev('demo-hall-b-phone-d3.jpg'));
await render(sceneSvg({ hall: 'EXAM HALL B', time: '2026-10-22 11:07:45', object: { seat: 'A1', kind: 'phone' }, boxes: true }), ev('demo-hall-b-phone-a1.jpg'));
await render(sceneSvg({ time: '2026-10-24 14:00:38', object: { seat: 'C5', kind: 'phone', inHand: true }, boxes: true, absent: ['D6'] }), ev('demo-endterm-phone-c5.jpg'));
await render(sceneSvg({ time: '2026-10-24 14:01:33', object: { seat: 'A2', kind: 'calculator' }, boxes: true, absent: ['D6'] }), ev('demo-endterm-calculator-a2.jpg'));
const STILL = path.join(OUT, 'still-hall-a.jpg');
await render(sceneSvg({ time: '2026-10-26 09:58:02', absent: ['D6'] }), STILL);
const CLIP_FRAME = path.join(OUT, 'clip-frame.png');
const CLIP = path.join(OUT, 'hall-a-end-term.mp4');
await render(sceneSvg({ time: '2026-10-24 14:00:00', absent: ['D6'] }), CLIP_FRAME);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', CLIP_FRAME, '-t', '120', '-r', '1',
  '-vf', 'scale=960:540', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', CLIP]);

// ── 2. The AI engine stand-in (same endpoints and service token as ai/) ──────────────────
const ai = async (method, url, body) => {
  const res = await fetch(`${API}/api/v1${url}`, {
    method,
    headers: { 'X-Service-Token': SERVICE_TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) throw new Error(`${method} ${url}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};
const heartbeat = () => ai('POST', '/ai/heartbeat', {
  engine: 'ai-block-3',
  cameras: 4,
  fps: 19.4,
  camera_status: [
    { id: 'HA-CAM1', online: true, fps: 20 }, { id: 'HA-CAM2', online: true, fps: 19.8 },
    { id: 'HB-CAM1', online: true, fps: 20 }, { id: 'HB-CAM2', online: false, fps: 0 },
    { id: 'DH-CAM1', online: true, fps: 14.9 },
  ],
}).catch(() => undefined);
await heartbeat();
const beat = setInterval(heartbeat, 25_000);

// ── 3. Recording ─────────────────────────────────────────────────────────────────────────
const OVERLAY = `
(() => {
  const css = \`
    #demo-caption{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:2147483647;
      max-width:1180px;width:max-content;pointer-events:none;font-family:Inter,system-ui,sans-serif;
      background:rgba(8,12,20,.92);border:1px solid rgba(96,165,250,.45);border-radius:14px;
      box-shadow:0 12px 40px rgba(0,0,0,.45);padding:14px 22px;color:#F1F5F9;transition:opacity .35s}
    #demo-caption .t{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#60A5FA;margin-bottom:4px}
    #demo-caption .x{font-size:21px;line-height:1.4}
    #demo-cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;
      transform:translate(-3px,-2px);transition:transform .05s}
    #demo-cursor.down{transform:translate(-3px,-2px) scale(.82)}
    .demo-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;
      border:3px solid #60A5FA;z-index:2147483646;pointer-events:none;animation:demo-r .5s ease-out forwards}
    @keyframes demo-r{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(1.6)}}\`;
  function mount() {
    if (document.getElementById('demo-caption')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const cap = document.createElement('div'); cap.id = 'demo-caption'; cap.style.opacity = '0';
    cap.innerHTML = '<div class="t"></div><div class="x"></div>';
    document.body.appendChild(cap);
    const cur = document.createElement('div'); cur.id = 'demo-cursor';
    cur.innerHTML = '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M2 1 L2 18 L6.5 13.8 L9.6 20.6 L12.6 19.3 L9.6 12.6 L15.8 12.6 Z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cur);
    let pos = null;
    try { pos = JSON.parse(sessionStorage.getItem('demoCursor') || 'null'); } catch {}
    if (pos) cur.style.left = pos[0] + 'px', cur.style.top = pos[1] + 'px';
    document.addEventListener('mousemove', (e) => {
      cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
      try { sessionStorage.setItem('demoCursor', JSON.stringify([e.clientX, e.clientY])); } catch {}
    }, true);
    document.addEventListener('mousedown', (e) => {
      cur.classList.add('down');
      const r = document.createElement('div'); r.className = 'demo-ripple';
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.body.appendChild(r); setTimeout(() => r.remove(), 600);
    }, true);
    document.addEventListener('mouseup', () => cur.classList.remove('down'), true);
    try {
      const saved = JSON.parse(sessionStorage.getItem('demoCaption') || 'null');
      if (saved) window.__demoCaption(saved[0], saved[1]);
    } catch {}
  }
  window.__demoCaption = (title, text) => {
    const cap = document.getElementById('demo-caption');
    try { sessionStorage.setItem('demoCaption', JSON.stringify(text ? [title, text] : null)); } catch {}
    if (!cap) return;
    if (!text) { cap.style.opacity = '0'; return; }
    cap.querySelector('.t').textContent = title;
    cap.querySelector('.x').textContent = text;
    cap.style.opacity = '1';
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();`;

const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: OUT, size: { width: W, height: H } },
  colorScheme: 'dark',
});
await context.addInitScript(OVERLAY);
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms * PACE);

async function say(title, text, ms = 5500) {
  await page.evaluate(([t, x]) => window.__demoCaption?.(t, x), [title, text]);
  if (ms) await wait(ms);
}
async function moveTo(locator) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 22 });
  await wait(250);
}
async function click(locator) {
  await moveTo(locator);
  await locator.click();
  await wait(500);
}
async function type(locator, text) {
  await click(locator);
  await locator.pressSequentially(text, { delay: 38 * PACE });
}
async function nav(name) {
  await click(page.locator('aside').getByRole('link', { name, exact: true }).first());
  await page.waitForLoadState('networkidle');
}
async function drag(surface, box) {
  const s = await surface.boundingBox();
  const sx = s.width / W;
  const sy = s.height / H;
  await page.mouse.move(s.x + box.x * sx, s.y + box.y * sy, { steps: 20 });
  await wait(300);
  await page.mouse.down();
  await page.mouse.move(s.x + (box.x + box.w) * sx, s.y + (box.y + box.h) * sy, { steps: 30 });
  await page.mouse.up();
  await wait(600);
}

const logo = fs.readFileSync(path.join(ROOT, 'docs/assets/logo.svg'), 'utf8').replace(/<\?xml[^>]*>/, '');
const card = (inner) => `<!doctype html><html><body style="margin:0;height:100vh;display:flex;align-items:center;
  justify-content:center;background:radial-gradient(circle at 50% 35%,#16233F 0%,#0A0E14 70%);
  font-family:Inter,system-ui,sans-serif;color:#E8ECF2">${inner}</body></html>`;

try {
  // Title
  await page.setContent(card(`<div style="text-align:center">
    <div style="width:150px;height:150px;margin:0 auto 28px">${logo.replace('width="128" height="128"', 'width="150" height="150"')}</div>
    <div style="font-size:64px;font-weight:800;letter-spacing:-.02em">ClassroomGuard</div>
    <div style="font-size:28px;color:#93A4BF;margin-top:12px">AI-assisted exam-hall monitoring</div>
    <div style="font-size:20px;color:#5A6478;margin-top:46px">Product walkthrough</div></div>`));
  await wait(5000);
  await page.setContent(card(`<div style="max-width:1000px">
    <div style="font-size:22px;color:#60A5FA;font-weight:700;letter-spacing:.1em;text-transform:uppercase">The problem</div>
    <div style="font-size:40px;font-weight:700;line-height:1.3;margin-top:14px">Phones in exam halls are small, quick and easy to miss. One invigilator watches 50 students.</div>
    <div style="font-size:26px;color:#93A4BF;line-height:1.5;margin-top:30px">ClassroomGuard watches the hall's CCTV cameras, spots phones and unpermitted calculators,
    and tells invigilators immediately, with the evidence and the seat.</div></div>`));
  await wait(8000);

  // Sign in
  await page.goto(`${BASE}/login`);
  await say('Sign in', 'Every member of staff has their own account. This is Dr. Sarah Chen from the exam cell.', 0);
  await type(page.getByPlaceholder('admin@university.edu'), EMAIL);
  await type(page.getByPlaceholder('Enter your password'), PASSWORD);
  await click(page.locator('button[type="submit"]'));
  await page.waitForURL(/\/dashboard/);
  await page.waitForLoadState('networkidle');

  // Dashboard
  await say('Dashboard', 'One screen for every exam hall: cameras online, the AI engine\'s status, and today\'s alerts.', 3500);
  await moveTo(page.locator('section[aria-label="System Status"]'));
  await wait(3500);

  // Live detection
  await say('10:42 · Exam Hall A', 'The AI engine on the Hall A camera sees a phone in a student\'s hand at seat B4.', 2500);
  await ai('POST', '/events', {
    eventType: 'PHONE_USAGE', severity: 'high', cameraId: 'HA-CAM1', seatId: 'B4', trackerId: 14, confidence: 0.91,
    boundingBox: { x: 832, y: 455, w: 160, h: 98 },
    metadata: { message: 'Cell phone in hand for 1.2s', evidence_path: 'storage/evidence/demo-live-hall-a-phone-b4.jpg' },
  });
  await wait(2500);
  await say('Real-time alert', 'The alert appears on every open screen at once, with no refresh. Invigilators\' phones get a push notification too.', 2000);
  await click(page.getByRole('button', { name: /^Notifications/ }));
  await wait(4000);
  await click(page.getByRole('button', { name: 'View all alerts' }));
  await page.waitForURL(/\/alerts/);
  await page.waitForLoadState('networkidle');

  // Alerts
  await say('Alerts', 'HIGH means a phone in the hand; MEDIUM means a phone or calculator on the desk. Repeat alerts for the same desk are held back for 2 minutes.', 2500);
  const first = page.locator('main').getByRole('heading', { level: 3 }).first();
  await moveTo(first);
  await wait(4000);
  await click(page.getByRole('button', { name: 'Investigate' }).first());
  await page.waitForURL(/\/events\//);
  await page.waitForLoadState('networkidle');

  // Evidence
  await say('Evidence', 'Investigate opens the evidence: the camera frame the AI saved, with the phone and the student marked.', 3000);
  await moveTo(page.getByAltText('Annotated evidence frame'));
  await wait(3500);
  await say('Seat-level', 'The seat (B4) comes from the hall\'s seat map, so the invigilator walks straight to the right desk.', 2000);
  await moveTo(page.getByText('B4', { exact: true }).last());
  await wait(3500);

  // Escalate to an incident
  await nav('Alerts');
  await say('Escalate', 'The invigilator confirms it. Escalating turns the alert into a formal incident with the evidence attached.', 1500);
  const phoneAlert = page.locator('main div.rounded-lg', { hasText: 'Mobile phone detected - Exam Hall A' }).first();
  await click(phoneAlert.getByRole('button', { name: 'Escalate' }));
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What happened').fill('');
  await type(dialog.getByLabel('What happened'), 'Phone found in the student\'s hand at seat B4 during the Maths end-term paper.');
  await dialog.getByLabel('Assign to').selectOption({ label: 'Mark Rodriguez' });
  await wait(1200);
  await click(dialog.getByRole('button', { name: 'Create incident' }));
  await page.waitForURL(/\/incidents\/.+/);
  await page.waitForLoadState('networkidle');

  // Incident
  await say('Incident record', 'The incident keeps everything in one place: evidence, notes, who is handling it, and the outcome.', 3500);
  await type(page.getByLabel('Add a note'), 'Phone confiscated. Student allowed to finish under observation; case referred to the exam committee.');
  await click(page.getByRole('button', { name: 'Add Note' }));
  await wait(1500);
  await click(page.getByRole('button', { name: 'Mark as Resolved' }));
  await say('Audit trail', 'Every step is recorded with who did it and when, ready for the exam committee.', 4500);

  // Seat map and ignore zone
  await nav('Cameras');
  await say('Seat maps', 'Seat maps are set up once per camera: staff draw a box around each desk on the camera\'s picture.', 2000);
  await click(page.getByRole('button', { name: 'Actions for Hall A - Front' }));
  await click(page.getByRole('button', { name: /Seats & zones/ }));
  const editor = page.getByRole('dialog');
  await editor.locator('input[type="file"]').setInputFiles(STILL);
  await wait(2500);
  await say('Draw a seat', 'Desk D6 has no seat yet. Drag a box around it and it gets the next label automatically.', 1500);
  await drag(editor.getByLabel('Zone drawing area'), seatPixels('D6'));
  await wait(2500);
  await say('Ignore zone', 'An ignore zone over the invigilator\'s desk: their own phone there will never raise an alert.', 1200);
  await click(editor.getByRole('button', { name: 'Ignore zone' }));
  await drag(editor.getByLabel('Zone drawing area'), INVIGILATOR_ZONE);
  await wait(3000);
  await click(editor.getByRole('button', { name: 'Save zones' }));
  await wait(1500);

  // Recorded footage
  await nav('Recordings');
  await say('Recorded footage', 'Footage recorded during an exam can be uploaded and analysed afterwards, with exactly the same rules.', 2000);
  await click(page.getByRole('button', { name: 'Upload Video' }));
  const upload = page.getByRole('dialog');
  await upload.getByLabel(/Video file/).setInputFiles(CLIP);
  await upload.getByLabel('Camera that recorded it').selectOption({ label: 'Hall A - Front (Exam Hall A)' });
  await upload.getByLabel('Name').fill('');
  await type(upload.getByLabel('Name'), 'Maths end-term - Hall A (24 Oct)');
  await click(upload.getByRole('button', { name: 'Upload', exact: true }));
  await wait(1500);

  // The AI worker picks it up (stand-in: the same job endpoints recording_worker.py uses)
  const job = await ai('POST', '/recordings/claim');
  await say('Analysis', 'The AI worker analyses the video in the background. Progress updates live; staff can cancel at any time.', 0);
  const total = 2400;
  const found = [
    { at: 0.35, t: 38, seat: 'C5', kind: 'PHONE_USAGE', sev: 'high', img: 'demo-endterm-phone-c5.jpg', msg: 'Cell phone in hand for 1.3s at 00:38 in the recording' },
    { at: 0.8, t: 93, seat: 'A2', kind: 'CALCULATOR_USAGE', sev: 'medium', img: 'demo-endterm-calculator-a2.jpg', msg: 'Calculator at desk for 1.8s at 01:33 in the recording' },
  ];
  for (let i = 1; i <= 12; i++) {
    const frac = i / 12;
    for (const f of found.filter((x) => !x.done && x.at <= frac)) {
      f.done = true;
      await ai('POST', '/events', {
        eventType: f.kind, severity: f.sev, cameraId: job.cameraCode, seatId: f.seat, recordingId: job.id,
        confidence: f.kind === 'PHONE_USAGE' ? 0.9 : 0.86, trackerId: 3,
        metadata: { message: f.msg, evidence_path: `storage/evidence/${f.img}`, video_time_s: f.t },
      });
    }
    await ai('POST', `/recordings/${job.id}/progress`, {
      currentFrame: Math.round(total * frac), totalFrames: total, duration: 120, phase: 'analysing', detectionCount: Math.round(9 * frac),
    });
    await wait(900);
  }
  await ai('POST', `/recordings/${job.id}/complete`, { state: 'completed', detectionCount: 9 });
  await wait(2500);
  await say('Results', 'Two cheating cues found. Each one is listed with the exact moment in the video.', 1500);
  await click(page.getByRole('link', { name: /2 detections/ }).first());
  await page.waitForLoadState('networkidle');
  await wait(2500);
  await click(page.locator('main').getByRole('button', { name: /Calculator usage/ }).first());
  await wait(4500);

  // Reports and roles
  await nav('Reports');
  await say('Reports', 'Summaries per hall and per day, exported to PDF or CSV for the exam committee.', 2500);
  await moveTo(page.getByRole('button', { name: 'PDF' }));
  await wait(3000);
  await nav('Users');
  await say('Access control', 'Every member of staff has a role, from administrator to view-only, that decides what they can see and do.', 5500);

  // Closing
  await say('', '', 0);
  await page.setContent(card(`<div style="display:flex;gap:56px;align-items:center;max-width:1240px">
    <div style="width:180px;flex:none">${logo.replace('width="128" height="128"', 'width="180" height="180"')}</div>
    <div><div style="font-size:52px;font-weight:800">ClassroomGuard</div>
    <ul style="font-size:25px;line-height:1.75;color:#C9D3E3;margin:18px 0 0;padding-left:26px">
      <li>Real-time phone and calculator alerts, with the evidence and the seat</li>
      <li>Incidents with notes, assignment and a full audit trail</li>
      <li>Analysis of recorded exam footage</li>
      <li>Runs on the college's own server, with its existing CCTV cameras</li></ul>
    <div style="font-size:21px;color:#60A5FA;margin-top:30px">Alerts support invigilators. A person always makes the decision.</div></div></div>`));
  await wait(8000);
} catch (err) {
  await page.screenshot({ path: path.join(OUT, 'failure.png') }).catch(() => undefined);
  console.error(`Recording stopped at ${page.url()}: ${err.message}`);
  process.exitCode = 1;
} finally {
  clearInterval(beat);
  const video = page.video();
  await context.close();
  const dest = path.join(OUT, 'ClassroomGuard-demo.webm');
  await video.saveAs(dest);
  await video.delete();
  await browser.close();
  console.log(`video: ${dest}`);
}
