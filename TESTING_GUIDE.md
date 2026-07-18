# Testing Guide — BRTC Training Management System

## Table of Contents

- [Test Stack](#test-stack)
- [Running Tests](#running-tests)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [OCR Testing](#ocr-testing)
- [Test Data & Seeding](#test-data--seeding)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)

---

## Test Stack

| Layer | Tool | Configuration |
|-------|------|---------------|
| Backend | Django `TestCase` + `APIClient` | Built-in test runner (`python manage.py test`) |
| Frontend | Vitest 4.1 + jsdom | Configured in `vite.config.js` |
| Frontend Libraries | Testing Library (React, jest-dom, user-event) | Installed but no component tests yet |
| OCR | Django `TestCase` + sample images | Custom assertions for extraction |
| CI/CD | GitHub Actions | Build & push only — **no automated tests in pipeline** |

### Prerequisites for Testing

- PostgreSQL must be running (or use SQLite for unit tests — see settings note below)
- Redis must be running (for Celery-dependent tests)
- Tesseract OCR with Bengali language data (for OCR tests)
- Node.js 18+ (for frontend tests)

### Test Dependencies

**Backend (`requirements.txt`):**
No dedicated test packages installed. Tests use Django's built-in `TestCase` runner. `coverage.py`, `pytest`, `factory-boy` are **not** included.

**Frontend (`package.json`):**

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^4.1.5 | Test runner |
| `@testing-library/jest-dom` | ^6.9.1 | DOM assertion matchers |
| `@testing-library/react` | ^16.3.2 | React component testing utilities |
| `@testing-library/user-event` | ^14.6.1 | User interaction simulation |
| `jsdom` | ^29.1.1 | Browser environment simulation |

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
python manage.py test apps.assessors.tests.HOAssessorConversionTests.test_convert_trainer_to_assessor
python manage.py test apps.applications.ocr.tests.ExtractNidNumberTests

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
npx vitest run src/utils/__tests__/numberFormatter.test.js

# Run tests with coverage
npx vitest run --coverage
```

### Running Tests in Docker

```bash
# Backend tests in Docker
docker compose exec backend python manage.py test --noinput

# Or for specific apps
docker compose exec backend python manage.py test apps.assessors apps.applications.ocr
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

The test runner uses the PostgreSQL database configuration from `.env`. For local testing, you can either:

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
            code='TEST',
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
            'code': 'NEW_CTR',
            'name_bn': 'নতুন সেন্টার',
            'name_en': 'New Center',
            'address': 'New Address',
            'phone': '01700000997',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'NEW_CTR')

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

### Existing Backend Tests

| Test File | Classes | Tests | Coverage |
|-----------|---------|-------|----------|
| `apps/applications/ocr/tests.py` | 9 | **40** | Unit + integration |
| `apps/assessors/tests.py` | 2 | **12** | Unit + integration |
| **Total** | **11** | **52** | |

#### OCR Tests (`apps/applications/ocr/tests.py` — 40 tests)

| Class | Tests | What's Tested |
|-------|-------|---------------|
| `ExtractNidNumberTests` | 10 | NID number extraction from various formats (10-digit, 17-digit, formatted, invalid) |
| `CleanBanglaNameTests` | 4 | Bangla name cleaning utility |
| `ExtractBanglaNameTests` | 7 | Name extraction with various label formats |
| `ExtractFatherNameTests` | 6 | Father name extraction (Bangla & English labels) |
| `ExtractMotherNameTests` | 5 | Mother name extraction (Bangla & English labels) |
| `NormalizeDateTests` | 8 | Date normalization (English, Bangla, digit formats) |
| `ExtractDateOfBirthTests` | 6 | DOB extraction from NID text |
| `ExtractAddressTests` | 3 | Address extraction (single/multi-line) |
| `IntegrationTests` | 3 | End-to-end OCR with sample images (skipped if images not found) |

#### Assessor Tests (`apps/assessors/tests.py` — 12 tests)

| Class | Tests | What's Tested |
|-------|-------|---------------|
| `HOAssessorConversionTests` | 7 | Trainer-to-assessor conversion, duplicate prevention, permission checks |
| `HOAssessorBatchAssessmentTests` | 5 | Batch/assessment endpoints with data and empty states |

---

## Frontend Testing

### Test Configuration

Vitest is configured in `vite.config.js`:

```javascript
test: {
  environment: 'jsdom',   // Browser-like DOM environment
  globals: true,          // Vitest globals (describe, it, expect)
},
```

Additional aliases in `vite.config.js`:
- `@` → `src/`

### Test Patterns

```javascript
import { describe, it, expect } from 'vitest';
import { functionName } from '../myModule';

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

### Existing Frontend Tests

| Test File | Lines | Tests | Coverage |
|-----------|-------|-------|----------|
| `src/utils/__tests__/numberFormatter.test.js` | 109 | **15** | Digit conversion, formatting, currency, percentage |
| `src/utils/__tests__/dateFormatter.test.js` | 107 | **14** | Date formatting, Bangla months/weekdays, datetime |
| **Total** | **216** | **29** | |

#### Number Formatter Tests (`numberFormatter.test.js` — 15 tests)

| Function | Tests | What's Tested |
|----------|-------|---------------|
| `convertToBanglaDigits` | 4 | Digit conversion, string input, non-digit passthrough, null handling |
| `toEnglishDigits` | 3 | Bangla-to-English conversion, preservation, null handling |
| `formatNumber` | 5 | Indian-style commas, Bangla formatting, zero, null, string numbers |
| `formatCurrency` | 3 | BDT symbol, Bangla currency, null handling |
| `formatPercentage` | 3 | English %, Bangla %, null handling |

#### Date Formatter Tests (`dateFormatter.test.js` — 14 tests)

| Function | Tests | What's Tested |
|----------|-------|---------------|
| `getBanglaMonthName` | 2 | Correct month mapping, invalid month |
| `getBanglaWeekday` | 3 | Long name, short name, invalid day |
| `formatDate` | 5 | Bangla format, English format, string input, null, invalid dates |
| `formatDateTime` | 2 | Bangla datetime, English datetime, null |
| `formatDateShort` | 3 | Bangla digits, English, string input, null |

### Frontend Test Gaps

Despite having `@testing-library/react` and `@testing-library/user-event` installed, there are **no component tests** — only utility function tests exist. The following are untested:

- React components (no `.test.jsx` files)
- Page components
- API service modules
- React contexts (AuthContext, etc.)
- Custom hooks

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

## Test Data & Seeding

The project includes 6 management commands for seeding test data:

### Seed Commands

| Command | Purpose | Dependencies |
|---------|---------|-------------|
| `ensure_admin` | Creates/resets admin user | None |
| `seed_data` | Basic: 1 center, 1 course, 5 users | None |
| `seed_sample_data` | Comprehensive: 4 centers, 5 courses, 12 trainees, 4 trainers, 3 assessors, 5 circulars, applications, batches, budgets, roles, infrastructure | None |
| `seed_test_data` | Feature data: accountant users, shifts, week plans, attendance, allowance categories/tiers, assessment records, trainer-batch assignments | `seed_sample_data` first |
| `seed_trainers_assessors` | Destructive re-seed: deletes all trainers/assessors, creates 2 per center | `seed_sample_data` first |
| `seed_master_data` | Master data: 3 genders, 12 education levels, 8 divisions, 64 districts | None |
| `seed_system_settings` | 12 default system settings | None |

### Usage

```bash
# Basic setup (admin + minimal data)
python manage.py ensure_admin
python manage.py seed_data

# Full test dataset
python manage.py seed_sample_data
python manage.py seed_test_data
python manage.py seed_trainers_assessors
python manage.py seed_master_data
python manage.py seed_system_settings

# Destructive re-seed (deletes existing trainers/assessors first)
python manage.py seed_trainers_assessors
```

### Seed Data Details

**`seed_data`** — Basic (5 users):
| Type | Count | Email Pattern |
|------|-------|---------------|
| Head Office Admin | 1 | admin@brtc.gov.bd |
| Center Admin | 1 | center@brtc.gov.bd |
| Trainer | 1 | trainer@brtc.gov.bd |
| Assessor | 1 | assessor@brtc.gov.bd |
| Trainee | 1 | trainee@brtc.gov.bd |

**`seed_sample_data`** — Comprehensive:
| Entity | Count |
|--------|-------|
| Centers | 4 (Dhaka, Chittagong, Rajshahi, Khulna) |
| Courses | 5 |
| Trainees | 12 |
| Trainers | 4 |
| Assessors | 3 |
| Circulars | 5 |
| Applications | Multiple |
| Batches | Multiple |
| Budgets | Multiple |

**`seed_test_data`** — Feature-specific:
| Entity | Count |
|--------|-------|
| Accountant users | 2 |
| Batch shifts | Multiple |
| Week plans | Multiple |
| Calendar days | Multiple |
| Attendance records | Multiple |
| Allowance categories | 3+ |
| Allowance tiers | Multiple |
| Trainee allowances | Multiple |
| Assessment records | Multiple |

### Seed Script Properties

- All seed scripts are **idempotent** (use `get_or_create`) and can be run multiple times
- `seed_trainers_assessors` is **destructive** — deletes all existing trainers/assessors before seeding
- `seed_test_data` requires `seed_sample_data` to be run first (depends on existing centers, courses, trainees)

### Default Credentials (After Seeding)

| Role | Email | Password |
|------|-------|----------|
| Head Office Admin | admin@brtc.gov.bd | admin123 |
| Center Admin | center{code}@brtc.gov.bd | center@123 |
| Trainer | (created via seed/import) | trainer@123 |
| Trainee | (created via registration/seed) | trainee123 |

---

## Writing Tests

### Backend Test Checklist

- [ ] Test the "happy path" (expected success)
- [ ] Test authentication: unauthenticated = 401
- [ ] Test authorization: wrong role = 403
- [ ] Test validation: invalid data = 400
- [ ] Test center-level data isolation: center admin sees only own data
- [ ] Test Bengali digit conversion: Bengali digits converted to English
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
from django.contrib.auth import get_user_model

User = get_user_model()

class NewFeatureTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@test.com', password='test123',
            user_type='head_office',
            full_name_bn='টেস্ট', full_name_en='Test',
            phone='01700000999', nid='9999999999',
        )

    def test_feature_works(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/some-endpoint/')
        self.assertEqual(response.status_code, 200)
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

  it('handles null', () => {
    expect(newFunction(null)).toBe('');
  });
});
```

**Frontend — component test (using Testing Library):**

```jsx
// frontend/src/components/__tests__/MyComponent.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
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
8. **Test center-level isolation** — verify center admins can't see other centers' data
9. **Test Bengali digit conversion** — verify all input flows handle Bengali digits

---

## Test Coverage

### Current Coverage Summary

| Area | Files | Tests | Level |
|------|-------|-------|-------|
| Backend: OCR | 1 | 40 | Good |
| Backend: Assessors | 1 | 12 | Good |
| Backend: Other 17 apps | 0 | 0 | Missing |
| Frontend: numberFormatter | 1 | 15 | Good |
| Frontend: dateFormatter | 1 | 14 | Good |
| Frontend: Components | 0 | 0 | Missing |
| Frontend: Pages | 0 | 0 | Missing |
| Frontend: Services | 0 | 0 | Missing |
| **Total** | **4** | **81** | |

### Coverage Reporting

**Backend (install `coverage.py` first):**

```bash
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html    # Generates htmlcov/ directory
```

**Frontend (via Vitest):**

```bash
npx vitest run --coverage
```

### Priority Areas for New Tests

1. **Authentication & authorization** — login, logout, token refresh, permission checks
2. **Center-level data isolation** — verify `get_queryset()` filtering across all ViewSets
3. **Bengali digit conversion** — verify `to_english_digits()` in all import/registration flows
4. **Batch management** — create/update batches, week plans, enrollment
5. **Trainee import/export** — bulk operations, center code validation, registration number generation
6. **Certificate generation** — PDF creation, QR code, verification flow
7. **Financial workflow** — budget CRUD, voucher maker-checker-approver flow
8. **Circular publishing** — create, publish, unpublish, public listing
9. **Frontend components** — at least render tests for key pages (using `@testing-library/react`)
10. **Frontend API services** — each service module

### Uncovered Backend Apps

| App | Priority | Notes |
|-----|----------|-------|
| `accounts` | High | Auth, user CRUD, permissions |
| `centers` | High | Center CRUD, import, admin auto-creation |
| `courses` | High | Read-only for center admin, write for HO |
| `trainees` | High | Bulk import, registration number generation |
| `trainers` | High | Bulk import, center mapping |
| `batches` | Medium | Batch CRUD, enrollment |
| `attendance` | Medium | Session tracking, center isolation |
| `circulars` | Medium | Publish/unpublish workflow |
| `certificates` | Medium | PDF generation |
| `applications` | Medium | Application workflow |
| `finance` | Low | Maker-checker-approver flow |
| `allowance` | Low | Tier management |
| `reports` | Low | Report generation |
| `notifications` | Low | In-app alerts |
| `jobplacement` | Low | Employment tracking |
| `system_config` | Low | System settings |
