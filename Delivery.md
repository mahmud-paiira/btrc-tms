# BRTC Training Management System — Delivery Report

**Project:** BRTC Training Management System (TMS)
**Client:** Bangladesh Railway Training Centre (BRTC)
**Repository:** https://github.com/dream71project/brtc-training
**Production URL:** https://training.brtc.gov.bd
**Report Date:** 18 July 2026

---

## 1. Executive Summary

The BRTC Training Management System is a full-stack web application built to digitize and streamline the operations of **27 BRTC training centres** across Bangladesh. The system covers the complete training lifecycle — from circular publication and public trainee registration to attendance tracking, assessment, certificate generation, and job placement.

The project comprises **142 commits**, **309 files changed**, and approximately **32,600 lines of code** across a Django REST Framework backend and a React (Vite) frontend, deployed via Docker on a production server.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Django 6.0, Django REST Framework 3.15 |
| **Frontend** | React 18, Vite, React Router, Bootstrap 5 |
| **Database** | PostgreSQL 16 |
| **Task Queue** | Celery + Redis (django-celery-beat) |
| **Web Server** | Nginx (reverse proxy) + Gunicorn |
| **Containerization** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions (build & push to GHCR) |
| **OCR** | Tesseract OCR (Bangla NID extraction) |
| **PDF Generation** | WeasyPrint + SutonnyMJ font |
| **API Docs** | drf-yasg (Swagger/ReDoc) |

---

## 3. Modules Delivered

### 3.1 Authentication & User Management
- Role-based access: **Head Office Admin**, **Center Admin**, **Trainer**, **Assessor**, **Accountant**, **Trainee**
- JWT authentication (SimpleJWT)
- Admin login (`/auth/login/`), Trainee login (`/trainee/login/`), Public login with OTP (`/public/auth/`)
- User CRUD with bulk delete, bulk user creation from HO
- Password reset with auto-generated passwords
- Center-level data isolation (center admins see only their center's data)

### 3.2 Center Management
- Full CRUD for 27 training centres with Bengali/English names
- Bulk import from Excel (with auto center code zero-padding)
- Auto-creation of center admin user on center create/import
- Center code format: 4-digit zero-padded (e.g., `0001`, `0025`)
- Bulk delete with confirmation

### 3.3 Course Management
- Course catalog with code, name (BN/EN), duration, fees
- Role-based access: Head Office can create/edit/delete; center admins are read-only
- Detail view page for all user roles
- Bulk delete, import/export via Excel
- Trainer-based seat capacity calculation

### 3.4 Circular Management
- Circular creation with course linking, capacity, dates, fee structure
- Circular publishing/unpublishing with action logs
- Public circular listing with Bengali date formatting
- Government-style PDF generation with SutonnyMJ font
- Routing weight fields hidden; buffer percentage (default 15%)

### 3.5 Trainee Management
- **Registration number format:** `BRTC-{3-letter-prefix}-{YEAR}-{5-digit}` (e.g., `BRTC-BAR-2026-00001`)
  - Prefix derived from center name with manual overrides for collisions (Chittagong→CTG, Chittagonj→CTN, Narayanganj→NYG, Narsingdi→NSD)
- Full CRUD from HO with center and batch assignment
- Bulk import from Excel with NID, phone, center code validation
- Bulk batch assignment with confirmation modal
- Trainee edit and detail pages (center-admin)
- Bengali digit conversion for phone/NID inputs
- NID validation: accepts 10, 13, or 17 digits

### 3.6 Trainer Management
- Trainer CRUD with center-course mapping
- Bulk import from Excel with auto user creation (default password: `trainer@123`)
- Center column always visible in HO list
- Center name displayed in trainer dashboard
- FilterSet-based center filtering on HO list

### 3.7 Assessor Management
- Assessor CRUD with assessment capabilities
- Bulk import with Bengali digit conversion
- Center-level filtering

### 3.8 Attendance Tracking
- Daily attendance recording per batch session
- Center-level attendance isolation
- DRF router with `basename` for proper routing

### 3.9 Batch Management
- Batch creation with center, course, schedule, capacity
- Batch enrollment with auto Trainee.batch sync via Django signals
- Week plan generation
- Card-based and table-based UI views

### 3.10 Assessment System
- Trainer-created assessments with scoring
- Batch-assessor mapping
- Assessment records with final grade calculation

### 3.11 Certificate Generation
- PDF certificate generation with WeasyPrint
- Official BRTC logo embedded
- SutonnyMJ font for Bengali text in PDFs
- Certificate template with trainee details
- Public certificate verification endpoint

### 3.12 Application & Enrollment
- Public registration with OTP phone verification
- Account creation → OTP verification → login → apply flow
- Registration success message in OTP modal
- Multi-step application form (personal, educational, experience)
- Application status tracking for trainees
- Age validation (minimum 21 years)
- DOB picker with day/month/year dropdowns
- Bengali input component (`BanglaInput`)

### 3.13 Public-Facing Pages
- Public circular listing
- Certificate verification
- Registration and application flow
- Trainee login portal

### 3.14 Finance & Allowance
- Allowance tier management
- Financial tracking per center/batch

### 3.15 Job Placement
- Job placement tracking for graduated trainees

### 3.16 Notifications
- In-app notification system

### 3.17 Reports & Analytics
- Dashboard with statistics
- Reporting endpoints for HO

### 3.18 System Configuration
- System-wide settings (HO)
- Health check endpoint (`/api/health/`)

---

## 4. Key Features & Improvements

| Feature | Description |
|---|---|
| **Government-Style UI** | Navy blue/BRTC green theme with double-border forms, official styling |
| **Bengali Digit Conversion** | Server-side conversion of Bengali/Arabic-Indic digits to English across all import, registration, OTP, and NID flows |
| **Center-Level Data Isolation** | Center admins, trainers, and assessors can only view their own center's data |
| **Bulk Operations** | Bulk delete, bulk import (trainees, trainers, assessors, centers, courses), bulk batch assignment |
| **Excel Import/Export** | Templates with sample data for all major entities |
| **PDF Certificate Generation** | Official BRTC certificates with WeasyPrint and SutonnyMJ font |
| **NID OCR** | Tesseract OCR integration for Bengali NID extraction |
| **OTP Registration** | Phone-based OTP verification for public trainee registration |
| **CI/CD Pipeline** | GitHub Actions workflow building Docker images to GHCR on `deploy` branch push |
| **Database Backup** | PostgreSQL backup at `brtc_tms_backup.sql` |
| **Admin Recovery** | `ensure_admin` management command for recovering deleted admin users |

---

## 5. Default Credentials

| Role | Email/Phone | Password |
|---|---|---|
| Head Office Admin | `admin@brtc.gov.bd` | `admin123` |
| Center Admin | `center{code}@brtc.gov.bd` | `center@123` |
| Trainer | — | `trainer@123` |
| Trainee | — | `trainee123` |

---

## 6. Deployment Architecture

```
Internet → Nginx (SSL/HTTPS) → Frontend (React SPA, port 80)
                              → Backend (Django + Gunicorn, port 8000)
                                    ↓
                              PostgreSQL (port 5432)
                              Redis (port 6379)
```

- **Docker images:** Published to `ghcr.io/dream71project/backend:latest` and `ghcr.io/dream71project/frontend:latest`
- **Server:** Deployed behind VPN at `training.brtc.gov.bd`
- **Compose files:** `docker-compose.yml` (dev), `docker-compose.prod.yml` (production), `docker-compose.server.yml` (server)

---

## 7. Project Statistics

| Metric | Value |
|---|---|
| Total Commits | 142 |
| Files Changed | 309 |
| Lines Added | 32,604 |
| Lines Deleted | 4,912 |
| Net Lines of Code | ~27,700 |
| Backend Django Apps | 19 |
| Frontend Page Directories | 23 |

---

## 8. Documentation Provided

| File | Description |
|---|---|
| `DEPLOYMENT_GUIDE.md` | Server deployment instructions |
| `DEVELOPER_GUIDE.md` | Local development setup guide |
| `TESTING_GUIDE.md` | Testing procedures and test data |
| `User Manual/` | End-user manual with screenshots |
| `.env.example` | Environment variable template |

---

## 9. Known Issues & Future Work

1. **Production Login 500 Error:** Investigated Bengali digit conversion import issue — resolved with unicode escapes in `apps/common/utils.py`
2. **Docker Build Caching:** GHA workflow uses build cache; new modules may require cache invalidation
3. **Server Behind VPN:** No direct SSH access from development machine; deployment requires on-site intervention or GHCR image pull
4. **Celery Workers:** Currently commented out in `docker-compose.server.yml`; can be enabled for background task processing
5. **CKEditor 4 Deprecation:** Using CKEditor 4.22.1 which is EOL; migration to CKEditor 5 recommended

---

*Prepared by the development team for BRTC.*
