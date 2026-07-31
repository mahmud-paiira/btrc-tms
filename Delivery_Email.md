# Delivery Email — BRTC Training Management System

---

**To:** BRTC Project Team
**From:** Development Team
**Date:** 18 July 2026
**Subject:** Delivery — BRTC Training Management System (v1.0)

---

Dear Sir/Madam,

Assalamu Alaikum,

With reference to the BRTC Training Management System project, we are pleased to inform you that the system has been developed, tested, and deployed to the production server. This email provides a summary of the deliverables included in this handover.

---

## 1. System Overview

The **BRTC Training Management System** is a full-stack web application built to digitize and streamline the operations of **27 BRTC training centres** across Bangladesh. The system covers the complete training lifecycle — from circular publication and public trainee registration to attendance tracking, assessment, certificate generation, and job placement.

**Production URL:** https://training.brtc.gov.bd

---

## 2. Modules Delivered

| # | Module | Description |
|---|--------|-------------|
| 1 | **Authentication & User Management** | Role-based access (HO Admin, Center Admin, Trainer, Assessor, Accountant, Trainee), JWT login, password reset, bulk user operations |
| 2 | **Center Management** | Full CRUD for 27 training centres, bulk import/export, auto center admin creation |
| 3 | **Course Management** | Course catalog with code, name (BN/EN), duration, fees. Role-based access control |
| 4 | **Circular Management** | Create, publish, close, extend, unpublish. Public URL generation for trainee applications |
| 5 | **Application & Enrollment** | Public registration with OTP verification, multi-step application form, auto-screening, approval workflow |
| 6 | **Seat Distribution** | Trainer-based capacity calculation, buffer percentage, automatic seat allocation to centres |
| 7 | **Trainee Management** | Registration number generation, bulk import, batch assignment, edit/detail pages |
| 8 | **Trainer Management** | Trainer CRUD, bulk import, center-course mapping, approval workflow |
| 9 | **Assessor Management** | Assessor CRUD, bulk import, batch-assessor mapping |
| 10 | **Batch Management** | Batch generation (25 seats/batch), enrollment, week plan, trainer/assessor assignment |
| 11 | **Attendance Tracking** | Daily attendance (Present/Absent/Late), center-level isolation, calendar view |
| 12 | **Assessment System** | Scoring, batch-assessor mapping, final grade calculation |
| 13 | **Certificate Generation** | PDF certificates with BRTC logo, SutonnyMJ Bengali font, public verification |
| 14 | **Finance & Allowance** | Allowance approval, disbursement (bKash/Nagad/Bank/Cash), transaction ID tracking |
| 15 | **Job Placement** | Placement tracking for graduated trainees |
| 16 | **Notifications** | In-app notification system |
| 17 | **Reports & Analytics** | Dashboard statistics, 11 report types, Excel/CSV export |
| 18 | **System Configuration** | System-wide settings, health check endpoint |

---

## 3. Access Credentials

| Role | Email | Password |
|------|-------|----------|
| Head Office Admin | `admin@brtc.gov.bd` | `admin123` |
| Center Admin | `center{code}@brtc.gov.bd` (e.g., `center0001@brtc.gov.bd`) | `center@123` |
| Trainer | `trainer@brtc.gov.bd` – `trainer4@brtc.gov.bd` | `trainer@123` |
| Trainee | `trainee@brtc.gov.bd` – `trainee12@brtc.gov.bd` | `trainee123` |
| Assessor | `assessor@brtc.gov.bd` | `assessor@123` |
| Accountant | `accountant_{code}@brtc.gov.bd` | `accountant@123` |

---

## 4. Deliverables

### 4.1 Source Code
- **Repository:** https://github.com/dream71project/brtc-training
- **Branch:** `deploy` (production-ready)
- **Total Commits:** 142
- **Lines of Code:** ~27,700

### 4.2 Documentation

| File | Purpose |
|------|---------|
| `DEPLOYMENT_GUIDE.md` | Server deployment and Docker setup instructions |
| `DEVELOPER_GUIDE.md` | Local development environment setup |
| `TESTING_GUIDE.md` | Testing procedures, seed data, test credentials |
| `User Manual/index.html` | End-user manual with annotated wireframe mockups |
| `User Manual/BRTC_User_Manual.pdf` | PDF version of the user manual |
| `Delivery.md` | Full technical delivery report |
| `.env.example` | Environment variable template |

### 4.3 Database
- **Backup file:** `brtc_tms_backup.sql` (~1.15 MB)
- **Database:** PostgreSQL 16, DB name `brtc_tms`

### 4.4 Docker Images (GHCR)
- Backend: `ghcr.io/dream71project/backend:latest`
- Frontend: `ghcr.io/dream71project/frontend:latest`

---

## 5. User Manual

A comprehensive **end-user manual** has been prepared with:
- **9 annotated wireframe mockups** covering all major screens
- Numbered callout markers with step-by-step explanations
- Covers all 7 user roles (HO, Center Admin, Trainer, Assessor, Accountant, Trainee, Public)
- Available in both **HTML** (interactive) and **PDF** formats
- Accessible from within the application via the user dropdown menu (top-right corner)

---

## 6. Key Features

- **Bengali/English bilingual interface** with Bengali digit conversion across all inputs
- **Center-level data isolation** — each center admin, trainer, and assessor sees only their own center's data
- **Government-style UI** with BRTC green/navy theme
- **Bulk operations** — import/export for centres, trainers, assessors, and trainees via Excel
- **OTP-based public registration** with age verification (minimum 21 years)
- **PDF certificate generation** with official BRTC branding
- **NID OCR integration** for automatic Bengali NID extraction
- **CI/CD pipeline** — GitHub Actions builds Docker images on every push to `deploy` branch

---

## 7. Deployment Architecture

```
Internet → Nginx (SSL/HTTPS) → Frontend (React SPA, port 80)
                              → Backend (Django + Gunicorn, port 8000)
                                    ↓
                              PostgreSQL (port 5432)
                              Redis (port 6379)
```

- **Server:** Deployed at `training.brtc.gov.bd` (behind VPN)
- **Containerization:** Docker Compose with `docker-compose.server.yml`

---

## 8. Known Issues & Recommendations

| # | Issue | Recommendation |
|---|-------|----------------|
| 1 | Production requires VPN access | Ensure VPN client is configured on all access points |
| 2 | Celery workers disabled | Enable in `docker-compose.server.yml` if background tasks are needed |
| 3 | CKEditor 4 (EOL) | Migrate to CKEditor 5 in future iteration |
| 4 | No automated frontend tests | Add component tests using `@testing-library/react` |

---

## 9. Support & Maintenance

- **GitHub Issues:** https://github.com/dream71project/brtc-training/issues
- **Deployment:** Push to `deploy` branch triggers CI/CD pipeline; server requires manual `docker compose pull && up -d`
- **Admin Recovery:** `python manage.py ensure_admin` command available for recovering deleted admin users

---

## 10. Next Steps

1. Review the deployed system at https://training.brtc.gov.bd
2. Verify all modules against the user manual
3. Create seed data using the provided management commands
4. Configure VPN access for all intended users
5. Report any issues via GitHub or email

---

We hope this system serves BRTC's training management needs effectively. Should you require any modifications, additional features, or technical support, please do not hesitate to contact us.

Thank you for your trust and collaboration.

Best regards,
**Development Team**

---

*This document is part of the BRTC Training Management System delivery package. Prepared on 18 July 2026.*
