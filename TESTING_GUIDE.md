# Testing Guide — BRTC Training Management System

## Table of Contents

- [Test Stack](#test-stack)
- [Running Tests](#running-tests)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [OCR Testing](#ocr-testing)
- [CI/CD Test Pipeline](#cicd-test-pipeline)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)

---

## Test Stack

| Layer | Tool | Configuration |
|-------|------|---------------|
| Backend | Django `TestCase` + `APIClient` | Built-in test runner (`python manage.py test`) |
| Frontend | Vitest + jsdom | Configured in `vite.config.js` |
| OCR | Django `TestCase` + sample images | Custom assertions for extraction |
| CI | GitHub Actions | `python manage.py test` + `npm run test` |

### Prerequisites for Testing

- PostgreSQL must be running (or use SQLite for unit tests — see settings note below)
- Redis must be running (for Celery-dependent tests)
- Tesseract OCR with Bengali language data (for OCR tests)

---

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
python manage.py test --noinput --verbosity=2

# Run specific app tests
python manage.py test apps.assessors
python manage.py test apps.applications.ocr

# Run a specific test class or method
python manage.py test apps.assessors.tests.AssessorTests.test_approve_assessor
python manage.py test apps.applications.ocr.tests.OcrUnitTests

# Run with fail-fast
python manage.py test --failfast

# Run with parallel execution (Django 4.2+)
python manage.py test --parallel
```

### Frontend Tests

```bash
cd frontend

# Run all tests once
npm run test

# Run tests in watch mode (re-runs on changes)
npm run test:watch

# Run a specific test file
npx vitest run src/utils/__tests__/dateFormatter.test.js

# Run tests with UI
npx vitest --ui

# Generate coverage report
npx vitest run --coverage
```

---

## Backend Testing

### Test Configuration

Tests use Django's built-in `TestCase` which creates a test database and rolls back changes after each test.

```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
```

The CI pipeline uses the production PostgreSQL database configuration. For local testing, you can either:

1. **Use PostgreSQL** (default — must be running)
2. **Override to use SQLite** (for faster local testing without DB setup):

```bash
# Temporarily override for testing
DB_NAME=:memory: DB_ENGINE=sqlite python manage.py test apps.assessors
```

*Note: SQLite may not support all PostgreSQL-specific features (e.g., ArrayField, Trigram).*

### Test Patterns

```python
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.centers.models import Center

User = get_user_model()

class FeatureTests(TestCase):
    """Test feature description"""

    def setUp(self):
        """Create test data shared across tests"""
        self.client = APIClient()

        # Create test users
        self.admin = User.objects.create_user(
            email='admin@test.com',
            password='test123',
            user_type='head_office',
            full_name_bn='টেস্ট অ্যাডমিন',
            full_name_en='Test Admin',
            phone='01700000999',
            nid='9999999999',
        )
        self.center = Center.objects.create(
            code='TEST_TCU',
            name_bn='টেস্ট সেন্টার',
            name_en='Test Center',
            address='Test Address',
            phone='01700000998',
        )

    def _auth(self, user):
        """Helper: authenticate client with JWT"""
        self.client.force_authenticate(user=user)

    def test_success_scenario(self):
        """Test successful creation"""
        self._auth(self.admin)
        response = self.client.post('/api/ho/centers/', {
            'code': 'NEW_TCU',
            'name_bn': 'নতুন সেন্টার',
            'name_en': 'New Center',
            'address': 'New Address',
            'phone': '01700000997',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'NEW_TCU')

    def test_unauthorized_access(self):
        """Test that unauthenticated requests are rejected"""
        response = self.client.get('/api/ho/centers/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_forbidden_for_wrong_role(self):
        """Test that non-HO users cannot access HO endpoints"""
        user = User.objects.create_user(
            email='center@test.com', password='test123',
            user_type='center_admin',
            full_name_bn='সেন্টার অ্যাডমিন', full_name_en='Center Admin',
            phone='01700000996', nid='9999999998',
        )
        self._auth(user)
        response = self.client.get('/api/ho/centers/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_validation_error(self):
        """Test validation rejects invalid data"""
        self._auth(self.admin)
        response = self.client.post('/api/ho/centers/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

### Existing Tests

| Test File | Coverage | Type |
|-----------|----------|------|
| `apps/applications/ocr/tests.py` | All OCR extraction functions + integration | Unit + Integration |
| `apps/assessors/tests.py` | Assessor CRUD, conversion, batch assessment | Unit + Integration |

#### Assessor Tests (`apps/assessors/tests.py`)

File: `backend/apps/assessors/tests.py` (248 lines)

Tests cover:
- **HO Assessor ViewSet**: list, create, update, toggle_status, reset_password
- **Trainer-to-Assessor conversion**: convert endpoint with validation
- **Batch assessment endpoints**: mark_assessment, competency evaluation
- **Permission checks**: unauthenticated, wrong role, missing data

**11 unit tests, 11 integration tests** — all passing.

#### OCR Tests (`apps/applications/ocr/tests.py`)

File: `backend/apps/applications/ocr/tests.py` (247 lines)

Tests cover:
- **Unit tests**: each regex extraction function with known input
  - `extract_nid_number()` — valid 10-digit, 17-digit with formatting, invalid
  - `extract_bangla_name()` — pure Bangla, mixed Bangla-English, empty
  - `extract_father_name()` — with "পিতা:" prefix, line-only, absent
  - `extract_mother_name()` — with "মাতা:" prefix, line-only, absent
  - `extract_date_of_birth()` — multiple date formats, Bangla digits
  - `extract_address()` — single/multi-line addresses
  - `calculate_confidence()` — scoring logic boundary conditions
- **Integration tests**: full extraction pipeline with sample NID images (if available)

---

## Frontend Testing

### Test Configuration

Vitest is configured in `vite.config.js`:

```javascript
test: {
  environment: 'jsdom',   // Browser-like DOM environment
  globals: true,          // Vitest globals (describe, it, expect)
}
```

### Test Patterns

```javascript
import { describe, it, expect } from 'vitest';

describe('functionName', () => {
  it('returns expected output for valid input', () => {
    expect(functionName('input')).toBe('expected');
  });

  it('handles null gracefully', () => {
    expect(functionName(null)).toBe('');
  });

  it('handles undefined gracefully', () => {
    expect(functionName(undefined)).toBe('');
  });
});
```

### Existing Tests

| Test File | Coverage |
|-----------|----------|
| `src/utils/__tests__/dateFormatter.test.js` | All date formatting functions |
| `src/utils/__tests__/numberFormatter.test.js` | Bangla digit conversion, currency, percentage |

#### Date Formatter Tests (`dateFormatter.test.js`)

- `formatDate()` — handles Date objects, ISO strings, timestamps; returns empty string for null/undefined
- `formatTime()` — time in 12h format
- `formatDateRange()` — start-end date range formatting

#### Number Formatter Tests (`numberFormatter.test.js`)

- `formatNumber()` — integer formatting with Bangla digits
- `convertToBanglaDigits()` — digit-by-digit conversion
- `formatPercentage()` — percentage with Bangla digits
- `formatCurrency()` — currency formatting, large number abbreviation

---

## OCR Testing

### OCR Diagnostic Command

The `test_ocr` management command checks the OCR setup and can process test images:

```bash
cd backend

# Full diagnostic (checks Tesseract, Bengali data, runs sample images)
python manage.py test_ocr

# Process a specific image
python manage.py test_ocr --image=media/test_nid.jpg

# Verbose output
python manage.py test_ocr --verbosity=3
```

The command reports:
- Tesseract installation path and version
- Bengali language data availability
- Sample extraction results (with confidence scores)

### Manual OCR Admin Test

1. Go to `/admin/ocr-status/` to verify Tesseract is configured
2. Click the test upload form to process a sample NID image
3. Check the extracted fields and confidence score

### Generating Test Images

Synthetic NID images can be generated for testing:

```bash
cd backend
python apps/applications/ocr/generate_test_images_v2.py
```

This creates sample old-format and new-format NID images in the `media/` directory. Generated images:
- `media/test_old_nid_v2.jpg` — Old format NID with basic fields
- `media/test_new_nid_v2.jpg` — New format NID
- `media/test_old_nid_with_parents.jpg` — Old format with parent names
- `media/test_new_nid_front_with_parents.jpg` — New format with parent names

### OCR Test Coverage Requirements

When writing OCR tests, cover:

1. **Each regex function** with at least 3 cases: valid match, no match, edge case
2. **Confidence scoring** with boundary cases (SUCCESS, LOW_CONFIDENCE, FAILED thresholds)
3. **Integration** with at least one sample image (if available)
4. **Error handling** — missing fields, malformed text, empty output from Tesseract
5. **Audit logging** — verify `OcrAuditLog` entries are created

---

## CI/CD Test Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs tests in two jobs:

### Backend Test Job

```yaml
test-backend:
  services:
    postgres:
      image: postgres:16-alpine
      env: POSTGRES_DB: brtc_test, POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres
    redis:
      image: redis:7-alpine

  steps:
    - apt: tesseract-ocr, tesseract-ocr-ben, libpq-dev, libpango-1.0-0, libcairo2
    - pip install -r requirements.txt
    - python manage.py migrate
    - python manage.py test --noinput --verbosity=2
```

### Frontend Test Job

```yaml
test-frontend:
  steps:
    - npm ci
    - npm run lint
    - npm run build        # Verifies production build
    - npm run test         # Runs Vitest
```

### Pipeline Flow

```
Push → test-backend → test-frontend → (if main/tag) build-and-push → deploy → notify
```

All test jobs must pass before build and deploy stages run.

---

## Writing Tests

### Backend Test Checklist

- [ ] Test the "happy path" (expected success)
- [ ] Test authentication: unauthenticated = 401
- [ ] Test authorization: wrong role = 403
- [ ] Test validation: invalid data = 400
- [ ] Test edge cases: empty input, boundary values
- [ ] Test idempotency: same operation twice
- [ ] Test audit logging (if applicable)

### Frontend Test Checklist

- [ ] Test with valid input
- [ ] Test with null/undefined
- [ ] Test with empty string
- [ ] Test with edge case values (large numbers, special characters)
- [ ] Test Bengali digit conversion
- [ ] Test English digit passthrough

### Adding New Tests

**Backend — add to existing app test file or create `tests.py`:**

```python
# backend/apps/<app>/tests.py
from django.test import TestCase
from rest_framework.test import APIClient

class NewFeatureTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_feature_works(self):
        self.assertEqual(1 + 1, 2)
```

**Frontend — add to `src/utils/__tests__/`:**

```javascript
// frontend/src/utils/__tests__/newFormatter.test.js
import { describe, it, expect } from 'vitest';
import { newFunction } from '../newFormatter';

describe('newFunction', () => {
  it('works correctly', () => {
    expect(newFunction('test')).toBe('expected');
  });
});
```

### Best Practices

1. **Test behavior, not implementation** — focus on inputs and outputs
2. **Use descriptive test names** — `test_rejects_invalid_email` not `test_bad_input`
3. **One assertion per test** — test one thing, name it clearly
4. **Use setUp for shared data** — avoid duplicating object creation
5. **Clean up after tests** — TestCase handles rollback automatically
6. **Don't test Django/DRF internals** — test YOUR code, not framework behavior
7. **Mock external services** — avoid real HTTP calls in unit tests

---

## Test Coverage

### Current Coverage Status

| Area | Test Files | Coverage Level |
|------|-----------|----------------|
| Backend: Assessors | 1 file, 22 tests | Good |
| Backend: OCR | 1 file, extensive tests | Good |
| Backend: Other 14 apps | None | ❌ Missing |
| Frontend: Utilities | 2 files | Good |
| Frontend: Components | None | ❌ Missing |
| Frontend: Pages | None | ❌ Missing |
| Frontend: Services | None | ❌ Missing |

### Adding Coverage Reporting

**Backend (recommended — install `coverage.py`):**

```bash
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html    # Generates htmlcov/ directory
```

**Frontend (already available via Vitest):**

```bash
npx vitest run --coverage
```

### Priority Areas for New Tests

1. **Authentication & authorization** — login, logout, token refresh, permission checks
2. **Center admin dashboard** — summary, charts, alerts endpoints
3. **Batch management** — create/update batches, week plans, enrollment
4. **Certificate generation** — PDF creation, QR code, verification flow
5. **Financial workflow** — budget CRUD, voucher maker-checker-approver flow
6. **Frontend API services** — each service module
7. **Frontend page components** — at least render tests for key pages
