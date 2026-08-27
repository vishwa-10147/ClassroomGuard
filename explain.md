# ClassroomGuard - Project Explanation

## What Is This Project?

ClassroomGuard is an AI-powered surveillance system designed for educational institutions. It uses computer vision to monitor classrooms in real-time and detect signs of cheating or academic dishonesty. The system runs on a local machine with an NVIDIA GPU, processes video from multiple cameras, and presents findings through a web-based dashboard.

---

## System Architecture

The project has three independent layers that communicate over HTTP and WebSocket:

```
+-------------------+     HTTP/WS      +-------------------+
|                   | <--------------> |                   |
|   React Frontend  |                  |   FastAPI Backend |
|   (Port 3000)     |                  |   (Port 8000)     |
|                   |                  |                   |
+-------------------+                  +-------------------+
                                              |
                                              | SQL
                                              v
                                       +-------------------+
                                       |    PostgreSQL     |
                                       |    Database       |
                                       +-------------------+

+-------------------+
|                   |
|   AI Pipeline     |  <-- Processes camera feeds independently
|   (Python)        |  <-- Sends alerts to backend via HTTP
|   (Port 8080)     |  <-- Also has its own Flask dashboard
|                   |
+-------------------+
```

**Frontend** is a React single-page application that users interact with in their browser.

**Backend** is a FastAPI REST API that handles authentication, user management, and CRUD operations for cameras, classrooms, and alerts. It stores data in PostgreSQL.

**AI Pipeline** is a standalone Python process that captures video from cameras, runs YOLOv8 deep learning models on each frame, analyzes student posture, applies cheating detection rules, and generates alerts. It has its own lightweight Flask dashboard for direct monitoring.

---

## Frontend Deep Dive

### Technology Choices

- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with a custom design token system (`cg-*` prefix) for a dark monitoring aesthetic
- **Zustand** for lightweight global state (4 stores)
- **React Router v6** with lazy-loaded routes for code splitting
- **Axios** for HTTP requests with JWT interceptors
- **Native WebSocket** for real-time updates

### Routing

All routes except `/login` are wrapped in `AppShell` (sidebar + header layout). Feature pages are lazy-loaded with `React.lazy()` and show a skeleton loader while loading.

```
/login          -> LoginPage (standalone, no sidebar)
/dashboard      -> DashboardPage (default redirect from /)
/live           -> LiveMonitoringPage (camera grid view)
/cameras        -> CamerasPage (camera management)
/classrooms     -> ClassroomsPage (classroom list)
/classrooms/:id -> ClassroomDetailPage (single classroom)
/events         -> EventsPage (detection events)
/alerts         -> AlertsPage (alert management)
/incidents      -> IncidentsPage (incident reports)
/recordings     -> RecordingsPage (video recordings)
/reports        -> ReportsPage (analytics reports)
/users          -> UsersPage (user management)
/roles          -> RolesPage (role management)
/audit-logs     -> AuditLogsPage (system audit trail)
/settings       -> SettingsPage (system settings)
```

### Component Architecture

```
components/
  layout/          Structural components (sidebar, header, page wrapper)
    AppShell       Main layout with sidebar + content area
    Sidebar        Desktop navigation (collapsible)
    Header         Top bar with search, notifications, user info
    BottomNav      Mobile bottom tab bar
    MobileDrawer   Mobile slide-out navigation

  ui/              Pure presentational primitives (no domain logic)
    Button         4 variants, 3 sizes, loading state
    Badge          Severity/status/processing color coding
    Input          Text input, search input, select, toggle
    Modal          Centered dialog with backdrop
    Drawer         Slide-in panel
    Tabs           Tab bar with active indicator
    Skeleton       Loading placeholder with shimmer
    Avatar         Image or color-hashed initials
    Toast          Auto-dismissing notifications

  shared/          Domain-specific reusable widgets
    CameraCard     Camera preview with status overlay
    EventCard      Detection event with severity coloring
    FilterBar      Responsive filter controls
    MetricCard     KPI card with progress bar
    Timeline       Vertical event timeline
    AlertBanner    Dismissible alert banner
```

### State Management

Four Zustand stores handle cross-cutting concerns. Feature pages manage their own data locally.

| Store | Purpose |
|-------|---------|
| `authStore` | Login/logout, JWT token, user profile |
| `systemStore` | AI status, camera counts, alert counts, WS connection |
| `uiStore` | Sidebar expand/collapse, mobile drawer, theme |
| `notificationStore` | Toast notification queue |

### API Communication

The Axios client (`services/api/client.ts`) attaches the JWT token to every request. On 401 responses, it auto-logs out and redirects to `/login`. Each domain has its own service module (cameraService, alertService, etc.) that wraps the API calls.

The WebSocket client (`services/websocket/wsClient.ts`) connects to the backend for real-time events. It handles reconnection with exponential backoff (1s, 2s, 4s, 8s, 30s max). Message types include `detection.new`, `alert.new`, `camera.status`, and `system.health`.

### Design System

The CSS uses a dark theme built on Tailwind with custom tokens:

- **Backgrounds**: `cg-bg-primary` (#0A0E14) through `cg-bg-surface` (#212B3D)
- **Text**: `cg-text-primary` (#E8ECF2) through `cg-text-tertiary` (#5A6478)
- **Severity**: `cg-severity-critical` (red), `cg-severity-high` (orange), `cg-severity-medium` (yellow), `cg-severity-low` (blue)
- **AI Vision**: `cg-vision-person` (cyan), `cg-vision-phone` (yellow), `cg-vision-threat` (red)

---

## Backend Deep Dive

### Technology Choices

- **FastAPI** for async REST API with automatic OpenAPI docs
- **SQLAlchemy 2.0** with async PostgreSQL driver (`asyncpg`)
- **Pydantic v2** for request/response validation
- **python-jose** for JWT token handling (HS256)
- **passlib** with bcrypt for password hashing

### Database Schema (7 tables)

```
users            Classroom staff accounts with roles
classrooms       Physical classroom definitions
cameras          Camera hardware tied to classrooms
detection_events Individual AI detection instances
alerts           Active/resolved alert records
incidents        Investigated incident reports
recordings       Uploaded video files and processing state
```

All tables use UUID primary keys and have `created_at`/`updated_at` timestamps with timezone-aware UTC datetimes.

### Authentication Flow

1. User POSTs `{ email, password }` to `/api/v1/auth/login`
2. Backend verifies bcrypt password hash
3. Backend generates JWT with `{ sub: user_id, role, exp }`
4. Frontend stores token in `localStorage`
5. Every subsequent request includes `Authorization: Bearer <token>`
6. Backend middleware decodes JWT, loads user from DB, checks role permissions

### RBAC Permission Model

Five roles with descending privilege:

```
super_admin  ->  Can manage users, all CRUD, delete anything
admin        ->  Can manage classrooms/cameras, view users
faculty      ->  Can view classrooms and cameras
security     ->  Can view classrooms and cameras
viewer       ->  Read-only access to classrooms and cameras
```

The `require_roles()` dependency factory enforces access control at the route level.

### API Endpoints

18 endpoints across 5 routers:

- **Auth** (2): login, current user profile
- **Users** (5): list, get, create, update, delete
- **Classrooms** (5): list, get, create, update, delete
- **Cameras** (6): list, get, create, update, test connection, delete
- **RBAC Test** (4): permission verification endpoints

---

## AI Detection Pipeline Deep Dive

### Model Selection

| Model | Purpose | Speed (RTX 4070) |
|-------|---------|-------------------|
| YOLOv8m | Object detection (person, phone, calculator) | ~150 FPS |
| YOLOv8m-pose | Human pose estimation (17 keypoints) | ~130 FPS |
| TensorRT FP16 | Optimized inference engine | ~300+ FPS |

YOLOv8m was chosen over YOLOv8n (too inaccurate) and YOLOv8l (too slow for real-time on 2 cameras). TensorRT FP16 export provides 2-4x speedup by optimizing layers for the specific GPU.

### Detection Pipeline (Per Frame)

The pipeline runs in `main.py` inside `ClassroomGuard._main_loop()`:

```
Step 1: Camera Frame Capture
  CameraManager reads latest frame from each camera (threaded)

Step 2: Object Detection (YOLOv8m)
  detector.detect(frame)
  -> Returns: persons, phones, calculators, cheat sheets, earbuds
  -> Each with: bbox, confidence, class_name

Step 3: Student Tracking (IoU-based)
  tracker.update(persons)
  -> Matches new detections to existing tracks via IoU
  -> Creates new tracks for unmatched persons
  -> Removes tracks that disappear for 60+ frames
  -> Each track maintains: position history, head direction history, posture history

Step 4: Pose Estimation (YOLOv8m-pose)
  pose_analyzer.full_analysis(frame)
  -> For each person: 17 COCO keypoints
  -> analyze_head_direction(): yaw/pitch angles -> forward/left/right/down
  -> analyze_posture(): sitting/standing, shoulder tilt
  -> analyze_hand_position(): hands_up, hands_close

Step 5: Match Poses to Tracks
  For each track, find the pose analysis with best IoU overlap (>0.3)
  Update track's head_direction_history and posture_history

Step 6: Cheating Rule Evaluation
  cheating_engine.evaluate(track, pose, objects, camera_id)
  -> Checks 5 rule groups per student per frame
  -> Applies cooldown (10s between same alert type per student)

Step 7: Alert Processing
  alert_system.process_alert(alert, frame)
  -> Saves JPEG snapshot
  -> Writes JSONL log entry
  -> Pushes to Flask dashboard via SocketIO
  -> Prints colored console output

Step 8: Display
  Annotate frame with detection boxes, pose overlays, track IDs, FPS
  Push to dashboard as MJPEG stream
```

### Cheating Detection Rules

| Rule | What It Detects | How | Severity |
|------|----------------|-----|----------|
| Phone Usage | Student using phone | Phone detected within 150px of student for 5+ consecutive frames | HIGH |
| Calculator Usage | Unauthorized calculator | Calculator detected near student for 3+ frames | MEDIUM |
| Head Turning | Looking at neighbor's paper | Head turned left/right for 3+ seconds continuously | MEDIUM |
| Looking Down | Hidden materials in lap | Head pointed down for 2+ seconds continuously | LOW |
| Hands Up + Phone | Texting under desk with raised hand | Simultaneous phone detection + raised hands | HIGH |

### Pose Analysis Details

The pose analyzer uses 17 COCO keypoints to compute:

**Head Direction:**
- Computes yaw (horizontal turn) from nose offset relative to eye center, normalized by eye distance
- Computes pitch (vertical tilt) from nose-to-eye distance
- Thresholds: 25 degrees for yaw, 30 degrees for pitch

**Posture:**
- Shoulder tilt angle from left-right shoulder Y difference
- Sitting vs standing from hip-to-nose distance relative to torso length
- Flags suspicious if shoulder tilt > 15 degrees or person is standing

**Hand Position:**
- Hands up: wrist average Y > shoulder center Y minus 30px
- Hands close: left-right wrist distance < 80px (possible passing notes)

### TensorRT Export

TensorRT converts the PyTorch model to an optimized GPU inference engine:

1. PyTorch model -> ONNX representation (via Ultralytics)
2. ONNX -> TensorRT engine with FP16 precision
3. Layer fusion and memory optimization for RTX 4070
4. Output: `.engine` file that YOLO auto-detects at runtime

Export command: `python export_tensorrt.py --task both`

### Custom Model Training

The training pipeline fine-tunes YOLOv8m on 5 classroom-specific classes:

**Dataset format:** YOLO (images + normalized bounding box labels)

**Classes:**
1. `person` (COCO class 0)
2. `cell_phone` (COCO class 67)
3. `calculator` (custom)
4. `cheat_sheet` (custom)
5. `earbuds` (custom)

**Training configuration:**
- Base model: `yolov8m.pt` (COCO pretrained)
- Epochs: 100 with early stopping (patience 20)
- Batch size: 16
- Input size: 640x640
- Augmentation: HSV jitter, rotation, translation, scale, flips, mosaic, mixup, copy-paste
- Output: `models/yolov8m_custom.pt`

---

## How the Pieces Connect

### Development Mode

```
Browser -> localhost:3000 (Vite dev server)
  -> /api/* proxied to localhost:8000 (FastAPI)
  -> /ws proxied to localhost:8000 (WebSocket)

AI Pipeline runs independently on localhost:8080
  -> Reads from cameras directly
  -> Posts alerts to FastAPI backend
  -> Also has its own Flask dashboard
```

### Production Mode

```
Browser -> Nginx serves built React app
  -> /api/* proxied to FastAPI (port 8000)
  -> /ws proxied to FastAPI WebSocket

AI Pipeline runs as a systemd service
  -> Posts detection events to FastAPI API
  -> FastAPI pushes alerts to frontend via WebSocket
```

### Data Flow: Detection to Dashboard

```
Camera Frame
    |
    v
AI Pipeline (YOLOv8 + Pose + Cheating Rules)
    |
    v
Alert Generated (phone_usage_detected, severity: high)
    |
    +--> Saved to PostgreSQL via FastAPI API
    +--> Snapshot saved to storage/evidence/
    +--> WebSocket broadcast to connected browsers
    +--> Frontend receives alert.new message
    +--> AlertStore updates -> UI re-renders with new alert
```

---

## Current State and Remaining Work

### Completed

- Full React frontend with 14 feature pages, design system, routing, state management
- FastAPI backend with auth, RBAC, CRUD for users/classrooms/cameras
- Complete AI detection pipeline (YOLOv8, pose, tracker, cheating rules, alerts)
- TensorRT export script
- Custom model training pipeline

### Not Yet Connected

1. **AI Pipeline <-> Backend API**: The AI pipeline currently logs alerts to files but does not post them to the FastAPI backend. This needs an HTTP client in the alert system.

2. **Backend <-> Frontend WebSocket**: The FastAPI backend does not yet have WebSocket endpoints. The frontend's `wsClient.ts` expects a WS server at `/ws` that does not exist yet.

3. **Frontend Mock Data**: All frontend pages use hardcoded mock data. The service layer (`services/api/`) is built but pages need to be updated to call services instead of importing from `mocks/`.

4. **Missing CRUD Endpoints**: The backend has no API routes for alerts, detection events, incidents, or recordings (models exist, schemas do not).

5. **Database Migrations**: Alembic is listed as a dependency but no migration configuration exists yet.

6. **Tests**: No test suite for either backend or frontend.
