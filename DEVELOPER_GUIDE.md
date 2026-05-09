# Developer Guide — BRTC Training Management System

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [OCR Module](#ocr-module)
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
| PDF | WeasyPrint + QRCode |
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
│   ├── apps/                     # 16 Django apps
│   │   ├── accounts/             # User model, JWT auth, roles
│   │   ├── applications/         # Trainee applications + OCR
│   │   │   └── ocr/              # NID OCR extraction module
│   │   ├── assessments/          # Trainee competency evaluation
│   │   ├── assessors/            # Assessor management
│   │   ├── attendance/           # Session attendance, QR check-in
│   │   ├── batches/              # Training batches, week plans
│   │   ├── centers/              # Training center profiles
│   │   ├── certificates/         # Certificate generation & PDF
│   │   ├── circulars/            # Admission circulars
│   │   ├── courses/              # Course definitions
│   │   ├── finance/              # Budget & voucher management
│   │   ├── jobplacement/         # Employment tracking
│   │   ├── notifications/        # SMS, email, in-app alerts
│   │   ├── reports/              # Report generation engine
│   │   ├── system_config/        # System-wide settings
│   │   └── trainees/             # Trainee profiles & portal
│   ├── templates/                # Django HTML templates
│   ├── static/                   # Static source files
│   ├── media/                    # User-uploaded files
│   ├── requirements.txt
│   ├── Dockerfile / Dockerfile.prod
│   └── manage.py
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── contexts/             # React contexts (Auth, Language)
│   │   ├── hooks/                # Custom hooks (useTranslation)
│   │   ├── locales/              # Translation JSON (en.json)
│   │   ├── pages/                # Route-level page components
│   │   ├── services/             # Axios API service modules
│   │   ├── store/                # Zustand global state
│   │   └── utils/                # Formatters, permissions helpers
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
├── .env.example                  # Environment variable template
└── .github/workflows/deploy.yml  # CI/CD pipeline
```

### Backend Apps Overview

| App | Purpose | Key Models |
|-----|---------|------------|
| `accounts` | Auth, users, roles | `User`, `Role`, `LoginLog`, `UserProfile` |
| `applications` | Trainee applications + NID OCR | `Application`, `OcrAuditLog` |
| `assessments` | Competency evaluation | `Assessment` |
| `assessors` | Assessor profiles | `Assessor`, `AssessorMapping` |
| `attendance` | Session tracking & QR check-in | `Attendance`, `AttendanceSummary` |
| `batches` | Training batches & schedules | `Batch`, `BatchWeekPlan`, `BatchEnrollment` |
| `centers` | Training center management | `Center`, `Infrastructure`, `Employee` |
| `certificates` | Certificate PDF & QR generation | `Certificate` |
| `circulars` | Admission circulars | `Circular` |
| `courses` | Course definitions | `Course`, `CourseChapter`, `UnitOfCompetency` |
| `finance` | Budget & voucher workflow | `Budget`, `Voucher`, `VoucherItem` |
| `jobplacement` | Employment tracking | `JobPlacement` |
| `notifications` | Multi-channel alerts | `Notification` |
| `reports` | Report generation engine | `Report`, `ScheduledReport` |
| `system_config` | System configuration | `SystemSetting`, `EmailTemplate`, `SmsTemplate` |
| `trainees` | Trainee profiles | `Trainee` |

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

# Seed test data
python manage.py seed_data
python manage.py seed_sample_data

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

Default login credentials after seeding:

| Role | Email | Password |
|------|-------|----------|
| Head Office | admin@brtc.gov.bd | admin123 |
| Center Admin (Dhaka) | center@brtc.gov.bd | center123 |
| Center Admin (CTG) | ctgadmin@brtc.gov.bd | ctg123 |
| Center Admin (Khulna) | khladmin@brtc.gov.bd | khl123 |
| Center Admin (Rajshahi) | rshadmin@brtc.gov.bd | rsh123 |
| Trainer | trainer@brtc.gov.bd | trainer123 |
| Assessor | assessor@brtc.gov.bd | assessor123 |
| Trainee | trainee@brtc.gov.bd | trainee123 |

---

## Backend Architecture

### Authentication & Authorization

- **JWT tokens** via `djangorestframework-simplejwt`
- Access token: 2 hours, Refresh token: 7 days (with rotation)
- User types: `head_office`, `center_admin`, `trainer`, `assessor`, `trainee`
- Permission classes check `user.user_type` for portal access
- Head Office views use `IsHeadOffice` permission on separate ViewSets

### URL Structure

```
/api/auth/           → Login, logout, me, password reset
/api/center/         → Center-admin dashboard endpoints
/api/ho/             → Head Office admin endpoints
/api/public/         → Public endpoints (circulars, apply, verify)
/api/trainee/me/     → Trainee portal (dashboard, schedule, etc.)
/api/trainers/       → Trainer management
/api/assessors/      → Assessor management
```

### Maker-Checker-Approver Workflow (Finance)

1. **Maker** creates a voucher draft (auto-generates `voucher_no`)
2. **Checker** verifies the voucher → status becomes `verified`
3. **Approver** approves → voucher becomes immutable (`approved`)
4. The `MakerCheckerApprover` model tracks each step with timestamps

### Key Patterns

- All HO views use separate ViewSets in `views_ho.py` with `IsHeadOffice` permission
- All API endpoints log to `ActionLog` for audit trail
- System configuration changes are audit-logged
- Bangla `verbose_name` on all model fields
- Config values are typed (string, integer, boolean, float) in key-value store

---

## Frontend Architecture

### Routing

Routes in `App.jsx` are organized by portal:

| Prefix | Layout | Purpose |
|--------|--------|---------|
| `/` | `Layout.jsx` | Center admin, trainer, assessor |
| `/ho/*` | `HoLayout.jsx` | Head Office admin (with sidebar) |
| `/trainee/*` | `TraineeLayout.jsx` | Trainee portal |
| `/login` | — | Login page |
| `/public/*` | — | Public circulars, certificate verification |

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
- Bangla font: `NikoshBAN`, sized at 20px (vs 16px English)

### API Layer

- Axios instance with interceptor in `services/api.js`
- Automatic token injection from localStorage
- 401 response triggers token refresh; if refresh fails, redirects to login
- App-specific service modules (e.g., `traineeService.js`, `hoService.js`)

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
| NID Number | Front image | 10, 11, 13, or 17 digits |
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

## Coding Standards

### Python (Backend)

- **No linter/formatter currently configured** — it's recommended to add `ruff`:
  ```bash
  pip install ruff
  ruff check .
  ```
- Follow Django best practices: fat models, thin views, business logic in services
- Use `@action` decorators for ViewSet custom endpoints
- All model fields must have `verbose_name` in Bengali
- Write API views in `views_ho.py` for Head Office endpoints
- Audit-log all mutations via `ActionLog`

### JavaScript/React (Frontend)

- ESLint configured for JS/JSX (run `npm run lint`)
- Use functional components with hooks
- Import pattern: React → libraries → contexts → components → services → utils
- All user-facing strings use `t(key, bnFallback)` for Bengali/English support
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
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    queryset = SomeModel.objects.all()
    serializer_class = SomeSerializer

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
import { useTranslation } from '../../hooks/useTranslation';
import hoService from '../../services/hoService';

export default function SomePage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    hoService.getSomething().then(res => setData(res.data));
  }, []);

  return <div>{/* JSX */}</div>;
}
```

```jsx
// App.jsx — add route
<Route path="some-path" element={<SomePage />} />
```

### Seeding Data

```bash
# Basic 5 users (admin, center, trainer, assessor, trainee)
python manage.py seed_data

# Comprehensive sample data (4 centers, 5 courses, 12 trainees, etc.)
python manage.py seed_sample_data
```

Seed scripts are idempotent (use `get_or_create`) and can be run multiple times.

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
