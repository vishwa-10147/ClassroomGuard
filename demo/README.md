# Product walkthrough video

`sh demo/run.sh` records a captioned walkthrough of ClassroomGuard (about 3 minutes) to
`demo/output/ClassroomGuard-demo.mp4`, for showing the product to colleges and colleagues.

It creates a separate `classroomguard_demo` database with exam-hall demo data
(`seed_demo.py`), starts the API and the web app, and drives the real app in Chromium with
Playwright (`record-demo.mjs`): sign-in, dashboard, a live phone alert with its evidence and
seat, escalation to an incident, the seat-map editor, analysis of uploaded footage, reports and
users.

The AI engine is stood in for: its detections are posted through the same API endpoints the
engine uses, and the camera frames are illustrations drawn by `scene.mjs`, labelled
"Demo illustration - not real footage". Say so when you show the video.

Requirements: PostgreSQL (`DEMO_DB_ADMIN_URL`, `DEMO_DATABASE_URL`), Python with the backend
requirements (`PYTHON`), `npm ci`, Playwright's Chromium (or `PW_CHROMIUM=/path/to/chrome`) and
ffmpeg with libx264. `DEMO_PACE=0.3` makes a quick dry run.
