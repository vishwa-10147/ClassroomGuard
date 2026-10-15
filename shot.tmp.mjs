import { chromium } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:3010/login');
await p.getByPlaceholder('admin@university.edu').fill('exam.cell@college.edu');
await p.getByPlaceholder('Enter your password').fill('Exam-Cell-Admin-2026');
await p.locator('button[type="submit"]').click(); await p.waitForURL(/dashboard/);
for (const name of ['reports','events','classrooms','live','users']) {
  await p.goto('http://localhost:3010/' + name); await p.waitForLoadState('networkidle'); await p.waitForTimeout(3000);
  await p.screenshot({ path: out + '/' + name + '.png' });
}
await b.close();
