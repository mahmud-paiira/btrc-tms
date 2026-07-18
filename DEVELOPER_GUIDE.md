# Developer Guide — BRTC Training Management System

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [OCR Module](#ocr-module)
- [Utility Modules](#utility-modules)
- [Deployment](#deployment)
- [Coding Standards](#coding-standards)
- [Common Workflows](#common-workflows)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | Django 4.2.16 + Django REST Framework 3.15.2 |
| Frontend | React 18 + Vite 5 |
| Database | PostgreSQL 15+ |
| Cache | Redis 7 (fallback: LocMemCache) |
| Task Queue | Celery 5.4 + Redis broker |
| Auth | JWT (SimpleJWT) — 2h access, 7d refresh |
| OCR | Tesseract 5 + pytesseract + OpenCV |
| PDF | WeasyPrint + QRCode + SutonnyMJ font |
| Rich Text | CKEditor 4 |
| Excel | openpyxl |
| API Docs | drf-yasg (Swagger / ReDoc) |
| WSGI | Gunicorn |
| Reverse Proxy | Nginx 1.25 |
| Container | Docker + Docker Compose |

---

## Project Structure

```
Project/
├── backend/                      # Django application
│   ├── brtc_tms/                 # Project configuration
│   │   ├── settings.py           # All settings (DB, cache, OCR, etc.)
│   │   ├── urls.py               # Root URL routing
│   │   ├── celery.py             # Celery app config
│   │   └── wsgi.py / asgi.py     # WSGI/ASGI entry points
│   ├── apps/                     # 19 Django apps + 1 utility module
│   │   ├── accounts/             # User model, JWT auth, roles, public auth
│   │   ├── allowance/            # Allowance tiers & finance
│   │   ├── applications/         # Trainee applications + OCR
│   │   │   └── ocr/              # NID OCR extraction module
│   │   ├── assessments/          # Trainee competency evaluation
│   │   ├── assessors/            # Assessor management
│   │   ├── attendance/           # Session attendance, QR check-in
│   │   ├── batches/              # Training batches, week plans
│   │   ├── centers/              # Training center profiles + HO views
│   │   ├── certificates/         # Certificate generation & PDF
│   │   ├── circulars/            # Admission circulars + HO views
│   │   ├── common/               # Shared utilities (NOT a Django app)
│   │   │   └── utils.py          # to_english_digits() converter
│   │   ├── courses/              # Course definitions + HO views
│   │   ├── finance/              # Budget & voucher workflow
│   │   ├── jobplacement/         # Employment tracking
│   │   ├── notifications/        # In-app alerts
│   │   ├── reports/              # Report generation engine
│   │   ├── system_config/        # System-wide settings + public endpoints
│   │   ├── trainees/             # Trainee profiles, import/export, bulk ops
│   │   └── trainers/             # Trainer management + HO views
│   ├── templates/                # Django HTML templates
│   ├── static/                   # Static source files (fonts, images)
│   │   ├── fonts/SutonnyMJ.ttf   # Bengali font for PDF generation
│   │   └── images/BRTC_official_logo.png
│   ├── media/                    # User-uploaded files
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile / Dockerfile.prod
│   └── .env
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── assets/               # SCSS, images (BRTC logo)
│   │   ├── components/           # Reusable UI components
│   │   │   ├── common/           # OCRUpload, BanglaInput, etc.
│   │   │   └── layout/           # Layout, HoLayout, TraineeLayout, Sidebar
│   │   ├── contexts/             # React contexts (Auth, Language)
│   │   ├── hooks/                # Custom hooks (useTranslation)
│   │   ├── locales/              # Translation JSON (en.json)
│   │   ├── pages/                # Route-level page components (23 dirs)
│   │   ├── services/             # Axios API service modules (16 files)
│   │   ├── store/                # Zustand global state
│   │   └── utils/                # Formatters (numberFormatter), permissions
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile / Dockerfile.prod
├── nginx/
│   ├── default.conf              # Dev reverse proxy config
│   └── prod.conf                 # Production SSL config
├── scripts/
│   └── backup.sh                 # PostgreSQL backup script
├── docker-compose.yml            # Dev environment
├── docker-compose.prod.yml       # Production environment
├── docker-compose.server.yml     # Server (GHCR pull) config
├── brtc_tms_backup.sql           # Database backup
├── Data_Entry/                   # Import templates (Excel)
├── .env.example                  # Environment variable template
├── .github/workflows/deploy.yml  # CI/CD pipeline
├── DEVELOPER_GUIDE.md            # This file
├── DEPLOYMENT_GUIDE.md           # Server deployment guide
├── TESTING_GUIDE.md              # Testing procedures
└── User Manual/                  # End-user documentation
```

### Backend Apps Overview

| App | Purpose | Key Models |
|-----|---------|------------|
| `accounts` | Auth, users, roles, public OTP auth | `User`, `UserProfile`, `LoginLog` |
| `allowance` | Allowance tiers & finance | `AllowanceCategory`, `AllowanceTier` |
| `applications` | Trainee applications + NID OCR | `Application`, `OcrAuditLog` |
| `assessments` | Competency evaluation | `Assessment`, `BatchAssessor` |
| `assessors` | Assessor profiles | `Assessor`, `AssessorMapping` |
| `attendance` | Session tracking & QR check-in | `Attendance`, `AttendanceSummary` |
| `batches` | Training batches & schedules | `Batch`, `BatchWeekPlan`, `BatchEnrollment` |
| `centers` | Training center management | `Center`, `Infrastructure`, `Employee` |
| `certificates` | Certificate PDF & QR generation | `Certificate` |
| `circulars` | Admission circulars | `Circular` |
| `common` | Shared utilities (not a Django app) | — |
| `courses` | Course definitions | `Course`, `CourseChapter`, `UnitOfCompetency` |
| `finance` | Budget & voucher workflow | `Budget`, `Voucher`, `VoucherItem` |
| `jobplacement` | Employment tracking | `JobPlacement` |
| `notifications` | In-app alerts | `Notification` |
| `reports` | Report generation engine | `Report`, `ScheduledReport` |
| `system_config` | System-wide settings | `SystemSetting`, `EmailTemplate`, `SmsTemplate` |
| `trainees` | Trainee profiles, import/export | `Trainee` |
| `trainers` | Trainer management | `Trainer`, `TrainerMapping` |

> **Note:** The `common` module at `apps/common/utils.py` is a shared utility package, not a Django app. It is **not** registered in `INSTALLED_APPS`.

### Frontend Services Overview

| Service File | Purpose |
|-------------|---------|
| `api.js` | Base Axios instance with JWT interceptors |
| `allowanceService.js` | Allowance tier management |
| `applicationService.js` | Application CRUD |
| `assessmentService.js` | Assessment operations |
| `assessorService.js` | Assessor management |
| `attendanceService.js` | Attendance tracking |
| `batchService.js` | Batch CRUD |
| `certificateService.js` | Certificate operations |
| `centerDashboardService.js` | Center admin dashboard data |
| `circularService.js` | Circular management |
| `dashboardService.js` | Dashboard statistics |
| `hoService.js` | Head Office operations |
| `jobService.js` | Job placement |
| `ocrService.js` | NID OCR extraction |
| `publicService.js` | Public registration, OTP, login |
| `traineeService.js` | Trainee portal operations |

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Tesseract OCR 5 (with Bengali language data)
- Docker (optional, for containerized setup)

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=brtc_tms
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Tesseract (Windows default path)
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
TESSERACT_LANG=ben+eng
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create admin user
python manage.py ensure_admin

# Start development server
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`. The Vite dev server proxies `/api` requests to the Django backend (configured in `vite.config.js`).

### 4. Celery (Optional — for async tasks)

```bash
cd backend
celery -A brtc_tms worker -l info
celery -A brtc_tms beat -l info    # For scheduled tasks
```

### 5. Docker Setup (Alternative)

```bash
docker compose up -d
```

This starts all services: PostgreSQL, Redis, backend (Gunicorn), frontend (Vite), Celery worker, and Nginx reverse proxy.

### 6. Verify Installation

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api`
- Swagger docs: `http://localhost:8000/swagger/`
- ReDoc: `http://localhost:8000/redoc/`
- Django admin: `http://localhost:8000/admin/`
- Health check: `http://localhost:8000/api/health/`

Default credentials after setup:

| Role | Email | Password |
|------|-------|----------|
| Head Office Admin | admin@brtc.gov.bd | admin123 |
| Center Admin | center{code}@brtc.gov.bd | center@123 |
| Trainer | (created via import) | trainer@123 |
| Trainee | (created via registration) | trainee123 |

> **Note:** Center admin users are auto-created when a new center is created or imported. The default password is `center@123` and email follows the pattern `center{code}@brtc.gov.bd` (e.g., `center0001@brtc.gov.bd`).

---

## Backend Architecture

### Authentication & Authorization

- **JWT tokens** via `djangorestframework-simplejwt`
- Access token: 2 hours, Refresh token: 7 days (with rotation)
- User types: `head_office`, `center_admin`, `accountant`, `trainer`, `assessor`, `trainee`
- Permission classes check `user.user_type` for portal access
- Head Office views use `IsHeadOfficeOrSuperuser` permission on separate ViewSets
- Login supports both email and phone number

### URL Structure

```
/api/auth/           → Login, logout, me, user CRUD, password reset
/api/centers/        → Center CRUD, import/export
/api/courses/        → Course CRUD (read for all, write for HO only)
/api/trainers/       → Trainer management
/api/assessors/      → Assessor management
/api/circulars/      → Circular management
/api/applications/   → Application management
/api/batches/        → Batch management
/api/attendance/     → Attendance tracking
/api/assessments/    → Assessment scoring
/api/certificates/   → Certificate generation
/api/trainees/       → Trainee profiles, import/export
/api/trainee/        → Trainee portal (dashboard, schedule, etc.)
/api/jobplacement/   → Job placement tracking
/api/reports/        → Report generation
/api/notifications/  → Notification system
/api/allowance/      → Allowance tiers
/api/center/         → Center-admin dashboard endpoints
/api/center/attendance/  → Center attendance
/api/assessor/       → Assessor portal
/api/ho/             → Head Office admin endpoints
/api/ho/system/      → System settings, health
/api/public/         → Public circulars, certificate verify
/api/public/auth/    → Public registration, OTP, login
```

### Center-Level Data Isolation

The system enforces center-level data isolation:

- **Center admins** can only see/train/manage data for their own center
- **Trainers** see only their own center's data
- **Assessors** see only their own center's data
- **Head Office / Superuser** sees all centers

Implementation:

```python
# In views.py — get_queryset() filters by request.user.center
def get_queryset(self):
    qs = super().get_queryset()
    if self.request.user.user_type == 'head_office':
        return qs  # Head office sees everything
    if self.request.user.center:
        return qs.filter(center=self.request.user.center)
    return qs.none()
```

### Permission Classes

```python
# apps/courses/views.py — Read for all, write for HO only
def get_permissions(self):
    if self.action in ('list', 'retrieve', 'export', 'download_template'):
        return [permissions.IsAuthenticated()]
    return [permissions.IsAuthenticated(), IsHeadOfficeOrSuperuser()]
```

### Registration Number Format

Trainee registration numbers follow the format:

```
BRTC-{CENTER_PREFIX}-{YEAR}-{5-digit sequence}
```

Examples:
- `BRTC-BAR-2026-00001` (Barisal)
- `BRTC-CTG-2026-00003` (Chittagong)
- `BRTC-DHK-2026-00010` (Dhaka)

Center prefix rules:
- Derived from the center name (first 3 letters of the romanized name)
- Manual overrides for collision avoidance:
  | Center | Prefix |
  |--------|--------|
  | Chittagong | CTG |
  | Chittagonj | CTN |
  | Narayanganj | NYG |
  | Narsingdi | NSD |

### Bengali Digit Conversion

The system converts Bengali/Arabic-Indic digits (০-৯) to English digits (0-9) across all input flows. This ensures phone numbers and NIDs entered in Bengali script are stored correctly.

```python
# apps/common/utils.py
BANGLA_DIGITS = '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef'

def to_english_digits(value):
    """Convert Bengali/Arabic-Indic digits to English digits."""
    if not isinstance(value, str):
        value = str(value)
    for i, bd in enumerate(BANGLA_DIGITS):
        value = value.replace(bd, str(i))
    return value
```

Applied in:
- Admin login serializer (`accounts/serializers.py`)
- Public registration, OTP, and login serializers (`accounts/serializers_public.py`)
- Trainee import (`trainees/views.py`, `trainees/views_ho.py`)
- Trainer import (`trainers/views.py`, `trainers/views_ho.py`)
- Assessor import (`assessors/views.py`)
- Application validators (`applications/serializers.py`, `applications/serializers_public.py`)
- NID verification (`applications/views_public.py`)

### NID Validation

NID numbers are validated to accept **10, 13, or 17 digits** (covers old, new, and smart card formats).

### Maker-Checker-Approver Workflow (Finance)

1. **Maker** creates a voucher draft (auto-generates `voucher_no`)
2. **Checker** verifies the voucher → status becomes `verified`
3. **Approver** approves → voucher becomes immutable (`approved`)
4. The `MakerCheckerApprover` model tracks each step with timestamps

### Key Patterns

- All HO views use separate ViewSets in `views_ho.py` with `IsHeadOfficeOrSuperuser` permission
- All API endpoints log to `ActionLog` for audit trail
- System configuration changes are audit-logged
- Bangla `verbose_name` on all model fields
- Config values are typed (string, integer, boolean, float) in key-value store
- DRF router `basename` must be specified when using `get_queryset()` instead of `queryset`
- Action methods on ViewSets should not be named `settings` (shadows `self.settings`)

---

## Frontend Architecture

### Routing

Routes in `App.jsx` are organized by portal:

| Prefix | Layout | Purpose |
|--------|--------|---------|
| `/` | `Layout.jsx` | Center admin, trainer, assessor, accountant |
| `/ho/*` | `HoLayout.jsx` | Head Office admin (with sidebar) |
| `/trainee/*` | `TraineeLayout.jsx` | Trainee portal |
| `/login` | — | Admin login page |
| `/ho/login` | — | Head Office login |
| `/trainee/login` | — | Trainee login |
| `/register-and-apply` | — | Public registration + application |
| `/circulars` | — | Public circular listing |
| `/verify/certificate/:certNo` | — | Public certificate verification |

### Role-Based Routing

The `RootRedirect` component handles post-login routing based on `user_type`:

| Role | Redirect To |
|------|------------|
| `head_office` | `/ho/dashboard` |
| `center_admin` | `/center-admin/batches` |
| `accountant` | `/center-admin/allowances` |
| `trainer` | `/trainer/dashboard` |
| `assessor` | `/assessor/dashboard` |
| `trainee` | `/trainee/dashboard` |

### Center Admin Pages

| Route | Page |
|-------|------|
| `/center-admin/applications` | Application review list |
| `/center-admin/applications/:id` | Application detail |
| `/center-admin/batches` | Batch list |
| `/center-admin/batches/create` | Batch creation |
| `/center-admin/batches/:id` | Batch detail |
| `/center-admin/attendance/batch/:id` | Attendance calendar |
| `/center-admin/certificates/issue` | Certificate issuance |
| `/center-admin/trainees` | Trainee list with bulk batch assign |
| `/center-admin/trainees/:id` | Trainee detail |
| `/center-admin/trainees/:id/edit` | Trainee edit |
| `/center-admin/trainers` | Trainer list |
| `/center-admin/courses` | Course list (read-only) |
| `/center-admin/courses/:id` | Course detail |

### Head Office Pages

| Route | Page |
|-------|------|
| `/ho/dashboard` | Main dashboard |
| `/ho/centers` | Center management |
| `/ho/courses` | Course management |
| `/ho/users` | User management with bulk delete |
| `/ho/trainers` | Trainer management with import/export |
| `/ho/trainees` | Trainee management with center/batch filters |
| `/ho/assessors` | Assessor management |
| `/ho/circulars` | Circular management |
| `/ho/finance` | Financial dashboard |
| `/ho/reports` | Reports |
| `/ho/system` | System settings |
| `/ho/system/health` | System health check |

### Global State (Zustand)

`store/useStore.js` manages:
- `sidebarOpen` — sidebar toggle state
- `notifications` — real-time notification feed with unread badge
- `pendingApprovals` — pending approval count
- `selectedCenter` — active center filter

### Translation System

- Bengali is the primary language, English fallback
- `useTranslation()` hook returns `t(key, fallbackBn)` function
- Translation keys in `locales/en.json`
- Bengali font: `Noto Sans Bengali` (browser), `SutonnyMJ` (PDF generation)

### API Layer

- Axios instance with interceptor in `services/api.js`
- Automatic token injection from localStorage
- 401 response triggers token refresh; if refresh fails, redirects to login
- 16 app-specific service modules (e.g., `traineeService.js`, `hoService.js`)

### Permission System

`utils/permissions.js` provides:
- `hasPermission(user, permission)` — check specific permission
- `canViewModule(user, module)` — check module access
- `canAction(user, action)` — check action-level access
- `MODULE_PERMISSIONS` — 8 categories with 32 sub-permissions
- Superuser and `head_office` type bypass checks

---

## OCR Module

### Overview

The OCR module extracts data from Bangladeshi NID (National ID) card images using Tesseract OCR with Bengali language support. It runs during the trainee application process to auto-fill applicant details.

### Flow

```
User uploads NID image → OCRUpload.jsx → POST /api/public/ocr/extract/
  → NIDUploadSerializer validates images
  → extract_nid_data() in ocr/utils.py
    → preprocess_image() (grayscale → Otsu threshold → median blur)
    → pytesseract.image_to_string() with --oem 3 --psm 6 -l ben+eng
    → Regex extraction per field
  → Confidence scoring (NID=50, Name=30, Father=10, Mother=10)
  → OcrAuditLog entry created
  → Return extracted data to frontend
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/applications/ocr/utils.py` | Image preprocessing, Tesseract call, regex extraction, confidence scoring |
| `apps/applications/ocr/views.py` | `ocr_extract` (POST), `OCRStatusView` (GET), `OCRTestView` (POST) |
| `apps/applications/ocr/tests.py` | Unit and integration tests |
| `apps/applications/serializers_public.py` | `NIDUploadSerializer` |
| `apps/applications/management/commands/test_ocr.py` | OCR diagnostic command |
| `frontend/src/services/ocrService.js` | Frontend API calls |
| `frontend/src/components/common/OCRUpload.jsx` | NID upload component |

### Extracted Fields

| Field | Source | Regex Pattern |
|-------|--------|---------------|
| NID Number | Front image | 10, 13, or 17 digits |
| Name (Bengali) | Front image | Bengali characters |
| Father's Name | Front image | Bengali text after "পিতা" |
| Mother's Name | Front image | Bengali text after "মাতা" |
| Date of Birth | Front image | Multiple format support |
| Address | Back image | Multi-line Bengali address |
| MRZ Data | Back image | Machine Readable Zone parsing |

### Confidence Levels

| Score | Result | Action |
|-------|--------|--------|
| ≥ 60 + has NID + has Name | `SUCCESS` | Auto-fill form |
| ≥ 30 | `LOW_CONFIDENCE` | Manual review needed |
| < 30 | `FAILED` | Manual entry required |

### Tesseract Configuration

```python
# From settings.py
TESSERACT_PATH = os.getenv('TESSERACT_PATH', r'C:\Program Files\Tesseract-OCR\tesseract.exe')
TESSERACT_LANG = os.getenv('TESSERACT_LANG', 'ben+eng')
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
```

- OCR Engine Mode: `--oem 3` (default LSTM-based engine)
- Page Segmentation: `--psm 6` (treat image as uniform text block)

### Installing Bengali Tesseract Data

**Windows:**
1. Download `ben.traineddata` from [tesseract-ocr/tessdata](https://github.com/tesseract-ocr/tessdata/blob/main/ben.traineddata)
2. Place in `C:\Program Files\Tesseract-OCR\tessdata\ben.traineddata`
3. Or use the admin endpoint: `POST /api/admin/download-ben-data/`

**Linux (Docker):**
```dockerfile
RUN apt-get install -y tesseract-ocr tesseract-ocr-ben
```

### Testing OCR

```bash
# Check OCR status (Tesseract path, Bengali data)
python manage.py test_ocr

# Run OCR on a sample image
python manage.py test_ocr --image=path/to/nid.jpg

# Generate synthetic test NID images
python apps/applications/ocr/generate_test_images_v2.py
```

### OCR Admin Pages

- `/admin/ocr-status/` — View Tesseract status, version, Bengali data availability
- `/admin/ocr-test/` — Upload an NID image and test OCR extraction
- OcrAuditLog entries visible in Django admin

---

## Utility Modules

### Bengali Digit Converter (`apps/common/utils.py`)

A shared utility module for converting Bengali/Arabic-Indic digits to English digits. Used across all import, registration, and validation flows.

```python
BANGLA_DIGITS = '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef'

def to_english_digits(value):
    """Convert Bengali/Arabic-Indic digits to English digits."""
    if not isinstance(value, str):
        value = str(value)
    for i, bd in enumerate(BANGLA_DIGITS):
        value = value.replace(bd, str(i))
    return value
```

> **Important:** This module uses Unicode escape sequences (`\u09e6`–`\u09ef`) instead of literal Bengali characters to avoid encoding issues in Docker/server environments.

### Frontend Number Formatter (`utils/numberFormatter.js`)

Provides `convertToBanglaDigits()` and `toEnglishDigits()` for frontend display and input handling.

---

## Deployment

### CI/CD Pipeline

The project uses GitHub Actions for CI/CD:

- **Trigger:** Push to `deploy` branch on `dream71project/brtc-training`
- **What it does:** Builds Docker images for backend and frontend, pushes to GitHub Container Registry (GHCR)
- **Images:** `ghcr.io/dream71project/backend:latest` and `ghcr.io/dream71project/frontend:latest`
- **What it does NOT do:** Does not auto-deploy to the server (server is behind VPN)

### Docker Images

**Backend (`backend/Dockerfile.prod`):**
- Multi-stage build: Python 3.11-slim
- Installs: libpq, pango (WeasyPrint), tesseract-ocr + tesseract-ocr-ben, OpenCV deps
- Runs as non-root `django` user
- Collects static files during build
- Serves via Gunicorn (4 workers, 120s timeout)
- Health check: `/api/health/` every 30s

**Frontend (`frontend/Dockerfile.prod`):**
- Multi-stage build: Node 18-alpine → Nginx 1.25-alpine
- Timezone set to Asia/Dhaka
- Serves built SPA via Nginx

### Server Deployment

The server uses `docker-compose.server.yml` which pulls pre-built images from GHCR:

```bash
# On the server:
cd /path/to/docker
docker compose -f docker-compose.server.yml pull
docker compose -f docker-compose.server.yml up -d
```

The backend container connects to:
- PostgreSQL (external, on `db` host)
- Redis (external, on `redis` host)
- Shared Docker network: `btrc_network`

### Database Backup

```bash
# Manual backup
pg_dump -U postgres brtc_tms > brtc_tms_backup.sql

# Restore
psql -U postgres brtc_tms < brtc_tms_backup.sql
```

### Management Commands

```bash
# Ensure admin user exists (run after migrations)
python manage.py ensure_admin

# Force password reset for admin
python manage.py ensure_admin --force
```

---

## Coding Standards

### Python (Backend)

- Follow Django best practices: fat models, thin views, business logic in services
- Use `@action` decorators for ViewSet custom endpoints
- All model fields must have `verbose_name` in Bengali
- Write API views in `views_ho.py` for Head Office endpoints
- Audit-log all mutations via `ActionLog`
- **Do not** name action methods `settings` (conflicts with DRF's `self.settings`)
- Use `basename=` in `router.register()` when ViewSet uses `get_queryset()` instead of `queryset`
- Use Unicode escape sequences for Bengali characters in utility modules to avoid encoding issues

### JavaScript/React (Frontend)

- ESLint configured for JS/JSX (run `npm run lint`)
- Use functional components with hooks
- Import pattern: React → libraries → contexts → components → services → utils
- All user-facing strings use Bengali text (primary language is Bengali)
- Keep state management in Zustand store for global state; local state via `useState`
- Service modules encapsulate all API calls

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Python files | `snake_case` | `views_ho.py`, `urls_trainee.py` |
| Python classes | `PascalCase` | `TraineePortalViewSet` |
| JSX files | `PascalCase` | `TraineeDashboard.jsx` |
| JS service files | `camelCase` | `traineeService.js` |
| URL routes | `kebab-case` | `/center-admin/applications` |
| API endpoints | `snake_case` | `/api/trainee/me/attendance/` |
| Git commits | Present tense, descriptive | `Add trainee schedule page` |
| Center codes | 4-digit zero-padded | `0001`, `0025` |
| Registration no. | `BRTC-{PREFIX}-{YEAR}-{SEQ}` | `BRTC-BAR-2026-00001` |

---

## Common Workflows

### Adding a New Model

1. Create model in `apps/<app>/models.py` with Bengali `verbose_name`
2. Create serializer in `apps/<app>/serializers.py`
3. Create/update ViewSet in `apps/<app>/views.py` or `views_ho.py`
4. Add URL routes in `urls.py`
5. Run `python manage.py makemigrations && python manage.py migrate`
6. Create frontend service in `frontend/src/services/<name>Service.js`
7. Create/update page component in `frontend/src/pages/`
8. Add route in `frontend/src/App.jsx`
9. Add permission checks in `frontend/src/utils/permissions.js` if needed

### Adding a New API Endpoint

```python
# Backend: views_ho.py
class HOSomeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsHeadOfficeOrSuperuser]
    queryset = SomeModel.objects.all()
    serializer_class = SomeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.user_type == 'head_office':
            return qs
        if self.request.user.center:
            return qs.filter(center=self.request.user.center)
        return qs.none()

    @action(detail=True, methods=['post'])
    def custom_action(self, request, pk=None):
        obj = self.get_object()
        # business logic
        return Response({'status': 'ok'})
```

```python
# urls_ho.py
router = DefaultRouter()
router.register(r'some-model', HOSomeViewSet, basename='ho-some-model')
urlpatterns = router.urls
```

### Adding a Frontend Page

```jsx
// pages/ho/SomePage.jsx
import { useState, useEffect } from 'react';
import hoService from '../../services/hoService';

export default function SomePage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    hoService.getSomething().then(res => setData(res.data));
  }, []);

  return <div>{/* JSX */}</div>;
}
```

```jsx
// App.jsx — add route under HoLayout
<Route path="some-path" element={<SomePage />} />
```

### Importing Data via Excel

```python
# Backend: add import action to ViewSet
@action(detail=False, methods=['post'])
def import_list(self, request):
    file = request.FILES.get('file')
    wb = load_workbook(file)
    ws = wb.active
    # Parse rows, validate, create objects
    return Response({'imported': count, 'errors': errors})
```

```bash
# Download template
GET /api/ho/<resource>/import_template/

# Upload and import
POST /api/ho/<resource>/import_list/
```

### Seeding Data

```bash
# Ensure admin user exists
python manage.py ensure_admin
```

The `ensure_admin` command is idempotent and safe to run multiple times. It creates the admin user if missing, or resets the password with `--force`.

### Running Celery Tasks

```python
# tasks.py
from celery import shared_task

@shared_task
def generate_report(report_id):
    # Task logic
    return result
```

```bash
# Start worker
celery -A brtc_tms worker -l info

# Trigger task from code
generate_report.delay(report_id)
```

### Bulk Operations

The system supports bulk operations across most entities:

- **Bulk Delete:** Checkbox selection + confirmation modal (centers, users, trainees, courses, batches, circulars)
- **Bulk Import:** Excel file upload with template download
- **Bulk Batch Assignment:** Select trainees + choose target batch

### Bengali Input Handling

The system provides two components for Bengali text input:

1. **`BanglaInput`** (`components/common/BanglaInput.jsx`) — Phonetic Bengali input with Avro phonetic conversion
2. **`numberFormatter`** (`utils/numberFormatter.js`) — Converts Bengali digits to/from English for display

All phone and NID inputs apply `to_english_digits()` server-side to normalize Bengali digit input.
