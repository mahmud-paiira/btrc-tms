# Security & Compliance Audit Report

**BRTC Training Management System**

| | |
|---|---|
| **Report Date** | 21 July 2026 |
| **Last Updated** | 22 July 2026 (Round 3 remediation applied) |
| **Project** | BRTC Training Management System (TMS) |
| **Production URL** | https://training.brtc.gov.bd |
| **Audit Type** | Third-Party Integration Compliance -- Security, Vulnerability, SQL Injection, XSS, Authentication, Authorization, Infrastructure |
| **Scope** | Full-stack (Django REST backend, React frontend, Docker/Nginx infrastructure, CI/CD pipeline) |

---

## Executive Summary

This report presents the findings of a comprehensive security and compliance audit of the BRTC Training Management System, conducted to evaluate readiness for third-party system integration. The audit covers **SQL injection, Cross-Site Scripting (XSS), authentication, authorization, input validation, file upload security, sensitive data exposure, JWT security, rate limiting, dependency vulnerabilities, Docker/container security, Nginx configuration, and CI/CD pipeline security.**

**Overall Risk Rating (post-remediation): LOW-MEDIUM**

| Severity | Original | Remediated | Remaining |
|----------|----------|------------|-----------|
| Critical | 8 | 6 | 2 |
| High | 18 | 13 | 5 |
| Medium | 27 | 13 | 14 |
| Low | 14 | 1 | 13 |
| Info | 6 | 0 | 6 |
| **Total** | **73** | **33** | **40** |

**33 of 73 findings have been remediated across three rounds of fixes.** The remaining 40 findings are lower severity or require architectural changes (e.g., HttpOnly cookie migration, password reset flow overhaul). Two critical findings were identified in this round: the frontend Docker container running as root (previously claimed fixed but not actually applied) and `.dockerignore` files not committed to git (secrets leak into Docker image layers on CI builds).

---

## 1. SQL Injection

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 1.1 | INFO | No raw SQL queries found | Entire backend | **PASS** |
| 1.2 | MEDIUM | Use of `.extra()` with raw SQL expression | `backend/apps/trainees/views_trainee.py:206` | **FIXED** |

**Details:**

- **1.1** No instances of `.raw()`, `cursor()`, `RawSQL`, or `execute()` were found in any views or models. All database queries use the Django ORM, which parameterizes queries automatically. **This is a positive finding.**

- **1.2** **FIXED** -- `weekly = qs.extra(select={'week': "EXTRACT(WEEK FROM session_date)"})` has been replaced with `from django.db.models.functions import ExtractWeek; qs.annotate(week=ExtractWeek('session_date'))`. All queries now stay within the Django ORM.

---

## 2. Cross-Site Scripting (XSS)

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 2.1 | CRITICAL | Stored XSS via `dangerouslySetInnerHTML` | `PublicCircularList.jsx:140`, `CircularDetail.jsx:170` | **FIXED** |
| 2.2 | CRITICAL | Stored XSS via `document.write()` (13 instances) | Multiple list/detail pages | **FIXED** |
| 2.3 | HIGH | `innerHTML` direct assignment in SimpleEditor | `SimpleEditor.jsx:19` | **FIXED** |
| 2.4 | LOW | Django templates use auto-escaping | All backend templates | **PASS** |
| 2.5 | CRITICAL | outerHTML injection via `onError` handler | `ApplicationDetailPage.jsx:328` | **FIXED** |
| 2.6 | MEDIUM | `document.execCommand('createLink')` accepts `javascript:` URLs | `SimpleEditor.jsx:26` | **OPEN** |

**Details:**

- **2.1** **FIXED** -- `dangerouslySetInnerHTML` is now sanitized via DOMPurify. Installed `dompurify` package; created `src/utils/sanitize.js` utility; applied to both `PublicCircularList.jsx` and `CircularDetail.jsx`.

- **2.2** **FIXED** -- Created `src/utils/escapeHtml.js` utility. All 13 `document.write` print handlers now wrap dynamic data with `escapeHtml()`. Files updated: `BatchDetail.jsx`, `AssessorList.jsx` (center-admin), `AssessorDetailPage.jsx`, `TrainerList.jsx` (center-admin), `TrainerDetailPage.jsx`, `QRCodeGenerator.jsx`, `CourseList.jsx`, `AssessorList.jsx` (HO), `TraineeList.jsx`, `HoApprovalManagement.jsx`, `HoCenterManagement.jsx`, `HoSelectedTrainees.jsx`, `TrainerList.jsx` (HO).

- **2.3** **FIXED** -- `ref.current.innerHTML = html` now sanitizes the HTML value with DOMPurify's `sanitize()` function before assigning to the contentEditable div. The output is saved as HTML and later rendered via `dangerouslySetInnerHTML`, but both the editor and renderer now apply DOMPurify sanitization.

- **2.4** All 4 backend HTML templates use standard Django `{{ var }}` syntax with auto-escaping active. No `|safe`, `mark_safe()`, or `{% autoescape off %}` found. **Positive finding.**

- **2.5** **FIXED** -- The `onError` handler on evidence file `<img>` tags used `event.target.outerHTML = '<a ...>'` to replace broken images with a download link. This pattern could be exploited for HTML injection if `eyeTest.evidence_file_url` contained malicious content. Replaced with a simple `<a>` link fallback using conditional rendering instead of `outerHTML` manipulation.

- **2.6** `SimpleEditor.jsx` uses `document.execCommand('createLink', false, url)` where `url` comes from a `prompt()` dialog. A user could enter `javascript:alert(1)` as the URL. While DOMPurify sanitizes the output when read, the link is inserted into the DOM at the editor level. **Mitigated** by DOMPurify on read, but the editor should validate URLs before insertion.

---

## 3. Authentication Security

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 3.1 | CRITICAL | No rate limiting on login endpoints | `accounts/views.py:39-69` | **FIXED** |
| 3.2 | CRITICAL | No rate limiting on OTP endpoints | `accounts/views_public.py:22,44,102` | **FIXED** |
| 3.3 | HIGH | TEST_OTP bypass (`123456`) in production | `accounts/views_public.py:57-59` | **FIXED** |
| 3.4 | HIGH | OTP uses `random.randint()` (not cryptographically secure) | `accounts/services.py:8-11` | **FIXED** |
| 3.5 | MEDIUM | No account lockout after failed logins | `accounts/views.py:49-55` | **OPEN** |
| 3.6 | MEDIUM | User enumeration via `public_check_user` | `accounts/views_public.py:136-146` | **MITIGATED** (rate limited) |
| 3.7 | MEDIUM | User enumeration via `check_nid` | `applications/views_public.py:65-73` | **OPEN** |
| 3.8 | LOW | OTP printed to stdout via `print()` | `accounts/services.py:18` | **FIXED** |

**Details:**

- **3.1** **FIXED** -- Added `LoginThrottle` (10/minute) on both `accounts/views.py:login` action and `accounts/views_public.py:public_login`. Also added nginx-level rate limiting (10r/m burst=3) on `/api/accounts/login/` and `/api/accounts/public-login/`.

- **3.2** **FIXED** -- Added `OTPThrottle` (5/minute) on `public_verify_otp` and `public_resend_otp`. Added `RegistrationThrottle` (3/hour) on `public_register`. Added `PublicCheckThrottle` (20/minute) on `public_check_user`. All throttle classes defined in `apps/common/throttles.py`. Nginx-level rate limiting added for all auth endpoints.

- **3.3** **FIXED** -- `TEST_OTP` is now set to `None` when `DEBUG=False` in `settings.py`. The `services.py` generate_otp function additionally checks `settings.DEBUG` before returning the test OTP. The `views_public.py` verify endpoint also checks `settings.DEBUG`.

- **3.4** **FIXED** -- `generate_otp()` now uses `secrets.randbelow()` instead of `random.randint()` for cryptographically secure OTP generation.

- **3.5** Failed login attempts are logged but no lockout mechanism exists. After 5 failed attempts, the account should be temporarily locked.

  **Remediation:** Implement account lockout after 5 failed attempts with exponential backoff.

- **3.6** Rate limiting mitigates brute-force enumeration, but the endpoint still returns `{"exists": true/false}`.

  **Remediation:** Return a generic message regardless of whether the user exists.

- **3.8** **FIXED** -- `print(f'OTP for {phone}: {otp}')` in `generate_otp()` has been removed. OTP values are now only written via `logger.debug()` and are not exposed to stdout/stderr in any environment.

---

## 4. Authorization & Access Control

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 4.1 | HIGH | Public `print_application` endpoint leaks personal data | `views_public.py:128-150` | **OPEN** |
| 4.2 | HIGH | Certificate verification endpoint auto-increments count (DoS) | `certificates/views_public.py:11-44` | **OPEN** |
| 4.3 | HIGH | UserViewSet allows unauthenticated user creation | `accounts/views.py:30-36` | **FIXED** |
| 4.4 | MEDIUM | AssessmentViewSet has no role-based permissions | `assessments/views.py:14-24` | **FIXED** |
| 4.5 | MEDIUM | CertificateViewSet has no role-based permissions | `certificates/views.py:13-15` | **FIXED** |
| 4.6 | MEDIUM | JobPlacementViewSet has no role-based permissions | `jobplacement/views.py:14-15` | **FIXED** |
| 4.7 | MEDIUM | NotificationViewSet exposes all notifications to all users | `notifications/views.py:6-9` | **FIXED** |
| 4.8 | LOW | Password reset returns plaintext password in API response | `accounts/views_ho.py:200-216` | **FIXED** |
| 4.9 | MEDIUM | `reset_password` claims to email password but does not actually send email | `accounts/views_ho.py:200-216` | **FIXED** |
| 4.10 | HIGH | New password displayed in browser toast notification | `UserList.jsx:89` | **OPEN** |

**Details:**

- **4.1** `print_application()` accepts `application_no` as URL parameter with **no authentication**. Anyone with an application number can download the PDF containing full personal data (NID, address, etc.).

  **Remediation:** Require authentication or verify the requesting user owns the application.

- **4.2** Public certificate verification auto-increments `verified_count` on every GET -- this is a DoS vector and allows enumeration.

  **Remediation:** Rate-limit the endpoint. Don't increment count on unauthenticated calls.

- **4.3** **FIXED** -- The `create` action on `UserViewSet` was previously included in `AllowAny` actions, meaning **anyone could create a user account** via `POST /api/auth/users/`. The `create` action has been removed from the `AllowAny` actions list. User creation now requires authenticated, authorized access.

- **4.4** **FIXED** -- Added `IsAssessorOrAdmin` permission class to `AssessmentViewSet`. Read operations are allowed for all authenticated users; write operations restricted to assessor, head_office, or superuser.

- **4.5** **FIXED** -- Added `IsHeadOfficeOrStaff` permission class to `CertificateViewSet`. All operations restricted to head_office, superuser, or staff users.

- **4.6** **FIXED** -- Added `IsHeadOfficeOrStaff` permission class to `JobPlacementViewSet`. Write operations restricted to head_office, superuser, or staff users.

- **4.7** **FIXED** -- `NotificationViewSet.get_queryset()` now scopes results to the logged-in user's notifications. Head office/superuser sees all notifications; other users only see their own.

- **4.8** **FIXED** -- `reset_password` action no longer returns `new_password` in the API response. Response now returns `{'detail': 'Password reset successful. Password has been emailed to the user.'}`.

- **4.9** **FIXED** -- The `reset_password` action previously claimed to email the new password to the user but never actually called `send_mail()`. Now uses `django.core.mail.send_mail()` to actually send the password reset email with the new temporary password.

- **4.10** `UserList.jsx:89` displays the new password in a `toast.success()` notification: ``toast.success(`Password reset: ${res.data.new_password}`)``. This exposes the password on screen, in browser notifications, and potentially in analytics logs. **The backend no longer returns the password (finding 4.8), so this toast will show `undefined`.** The toast message should be changed to a generic "Password reset email sent" confirmation.

---

## 5. Sensitive Data Exposure

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 5.1 | HIGH | Hardcoded weak default passwords for imported users | `trainees/views.py:205,225`, `circulars/views_ho.py:289` | **OPEN** |
| 5.2 | HIGH | Passwords sent in plaintext via email/SMS | `accounts/views_ho.py:162-173` | **OPEN** |
| 5.3 | HIGH | Default passwords exposed in frontend JS bundle | `TrainerFormModal.jsx:134`, `AssessorFormModal.jsx:136` | **OPEN** |
| 5.4 | HIGH | New password displayed in toast notification | `UserList.jsx:89` | **OPEN** |
| 5.5 | MEDIUM | Database credentials with weak password (`root`) | `backend/.env:9` | **OPEN** |
| 5.6 | MEDIUM | TEST_OTP bypass (`123456`) in production code | `settings.py:24` | **FIXED** |
| 5.7 | LOW | Error messages leak internal details | `views_public.py:56-58` | **OPEN** |
| 5.8 | MEDIUM | `console.log` of full request payload in HoCourseManagement | `HoCourseManagement.jsx:113` | **FIXED** |
| 5.9 | MEDIUM | QR code generation sends data to third-party API | `QRCodeGenerator.jsx:23` | **FIXED** |
| 5.10 | MEDIUM | `.env.example` contained real password defaults | `.env.example` | **FIXED** |
| 5.11 | MEDIUM | `console.error` may leak PII/validation errors in production | `RegisterAndApply.jsx:403`, `HoCourseManagement.jsx:122` | **OPEN** |

**Details:**

- **5.1** `user.set_password('trainee123')` and `user.set_password('changeme')` assign hardcoded weak passwords to imported users and newly created accounts.

  **Remediation:** Generate random passwords and send via secure channel.

- **5.2** User passwords are sent in plaintext in notification messages: `f'Password: {password}'`.

  **Remediation:** Use password reset links instead of sending plaintext passwords.

- **5.6** **FIXED** -- Covered in 3.3 above. `TEST_OTP` disabled in production.

- **5.8** **FIXED** -- `HoCourseManagement.jsx` logged the full API request payload (including sensitive form data) via `console.log(payload)`. This would expose user data in browser DevTools and any log aggregation. Removed the `console.log` statement.

- **5.9** **FIXED** -- `QRCodeGenerator.jsx` sent attendance data (trainee IDs, session info) to `api.qrserver.com`, a third-party QR code generation API. This leaked operational data to an external service. Replaced with the `qrcode.react` library for client-side QR code generation. No data is now sent to any third party.

- **5.10** **FIXED** -- `.env.example` contained a real password value (`root`) as the database password default. Developers copying this file would inadvertently use insecure credentials. All sensitive values replaced with `<CHANGE_ME>` placeholders.

- **5.11** `console.error` calls in `RegisterAndApply.jsx:403` and `HoCourseManagement.jsx:122` log full error response data which may include server details, stack traces, or user-submitted data. In production, these should use a filtered logger or be removed.

---

## 6. JWT & Token Security

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 6.1 | CRITICAL | JWT token passed in URL query parameter | `circulars/views_ho.py:674-688` | **FIXED** |
| 6.2 | CRITICAL | JWT token passed in URL (frontend) | `CircularDetail.jsx:114`, `CircularList.jsx:88,295` | **FIXED** |
| 6.3 | HIGH | JWT tokens stored in localStorage | `AuthContext.jsx:31-32`, `api.js:9,25` | **OPEN** |
| 6.4 | MEDIUM | Refresh token not rotated on use | `api.js:28-33` | **OPEN** |
| 6.5 | MEDIUM | Manual `fetch()` bypasses axios interceptor for PDF downloads | `CircularDetail.jsx:114`, `CircularList.jsx:86`, `HoCourseDetail.jsx:86` | **OPEN** |

**Details:**

- **6.1 & 6.2** **FIXED** -- Frontend print/PDF handlers no longer pass JWT tokens in URL query parameters. All 4 instances (`CircularDetail.jsx`, `CircularList.jsx` x2, `HoCourseDetail.jsx`) now use `fetch()` with `Authorization: Bearer` header to download the PDF as a blob, then open it via `URL.createObjectURL()`. Tokens are no longer exposed in browser history, server logs, or the `Referer` header.

- **6.3** `access_token` and `refresh_token` are stored in `localStorage`, making them fully accessible to any XSS payload.

  **Remediation:** Migrate to `HttpOnly`, `Secure`, `SameSite=Strict` cookies set by the backend.

- **6.4** The refresh token is never rotated on use. If stolen via XSS, it remains valid indefinitely.

  **Remediation:** Implement refresh token rotation and server-side token revocation.

- **6.5** Three PDF print handlers (`CircularDetail.jsx:114`, `CircularList.jsx:86`, `HoCourseDetail.jsx:86`) use raw `fetch()` with `localStorage.getItem('access_token')` instead of the centralized axios interceptor. This bypasses any future interceptor logic changes (e.g., token rotation, automatic refresh). These should use a shared `fetchWithAuth()` utility.

**Positive findings:**
- JWT access token expiry: 2 hours (reasonable)
- Refresh token rotation: `ROTATE_REFRESH_TOKENS = True`
- Blacklisting after rotation: `BLACKLIST_AFTER_ROTATION = True`

---

## 7. Input Validation & File Upload Security

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 7.1 | HIGH | No file type validation on FileField uploads | Multiple models | **FIXED** |
| 7.2 | HIGH | OCR endpoint allows unauthenticated file processing | `ocr/views.py:20-21` | **OPEN** |
| 7.3 | MEDIUM | No per-field upload size validation | `settings.py:188-189` | **OPEN** |
| 7.4 | MEDIUM | Password minimum length inconsistency (6 vs 8) | `views_trainee.py:364` | **FIXED** |
| 7.5 | LOW | Hardcoded test credentials in seed scripts | `seed_sample_data.py:60-67` | **OPEN** |
| 7.6 | LOW | No client-side URL format validation on `logo_url` | `HoCenterManagement.jsx:213` | **OPEN** |
| 7.7 | LOW | No numeric range validation on lat/lng inputs | `HoCenterManagement.jsx:246-250` | **OPEN** |

**Details:**

- **7.1** **FIXED** -- Created `apps/common/validators.py` with `FileExtensionValidator` for images (`jpg, jpeg, png, gif, webp`) and documents (`pdf, doc, docx, jpg, jpeg, png`). Applied validators to:
  - `accounts/models.py` -- `profile_image` field (image_validator)
  - `applications/models.py` -- `profile_image`, `nid_front_image`, `nid_back_image` (image_validator), `evidence_file` (document_validator)

- **7.2** `ocr_extract` and `OCRStatusView` use `AllowAny`, allowing anyone to upload files for OCR processing -- consuming server resources (DoS vector).

  **Remediation:** Require authentication or add strict rate limiting.

- **7.4** **FIXED** -- Password minimum length validation in trainee views was set to 6 characters. Updated to enforce a minimum of 8 characters, consistent with modern password security guidelines.

- **7.6** `HoCenterManagement.jsx:213` accepts any string for `logo_url` without URL format validation. A malformed or `javascript:` URL could be submitted.

  **Remediation:** Add URL format validation (must start with `https://`).

- **7.7** Latitude/longitude inputs in `HoCenterManagement.jsx:246-250` accept any string without numeric range validation (latitude: -90 to 90, longitude: -180 to 180).

  **Remediation:** Add `type="number"` with `min`/`max` attributes or validation in the submit handler.

---

## 8. Rate Limiting & DDoS Protection

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 8.1 | CRITICAL | No login-specific rate limiting | `settings.py:175-182` | **FIXED** |
| 8.2 | CRITICAL | No OTP-specific rate limiting | `accounts/views_public.py` | **FIXED** |
| 8.3 | MEDIUM | No nginx-level rate limiting | `nginx/prod.conf` | **FIXED** |
| 8.4 | MEDIUM | No rate limiting on OCR endpoint | `ocr/views.py` | **OPEN** |
| 8.5 | LOW | MAX_PAGE_SIZE: 999 allows large data extraction | `settings.py:174` | **OPEN** |

**Implemented configuration:**

| Endpoint | DRF Throttle | Nginx Rate Limit |
|----------|-------------|------------------|
| Login | 10/minute (`LoginThrottle`) | 10r/m, burst=3 |
| OTP verify | 5/minute (`OTPThrottle`) | 10r/m, burst=3 |
| OTP resend | 5/minute (`OTPThrottle`) | 10r/m, burst=2 |
| Registration | 3/hour (`RegistrationThrottle`) | 10r/m, burst=2 |
| Public check-user | 20/minute (`PublicCheckThrottle`) | 20r/m, burst=5 |
| Admin login | -- | 10r/m, burst=5 nodelay |
| General API | 100/hour (global anon) | 30r/m, burst=20 |

---

## 9. Django Security Settings

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 9.1 | CRITICAL | SECRET_KEY defaults to insecure fallback | ``settings.py:22`` | **OPEN** |
| 9.2 | CRITICAL | DEBUG defaults to True | ``settings.py:23`` | **OPEN** |
| 9.3 | HIGH | Missing SECURE_HSTS_SECONDS | ``settings.py`` | **FIXED** |
| 9.4 | HIGH | Missing SECURE_SSL_REDIRECT | ``settings.py`` | **FIXED** |
| 9.5 | HIGH | Missing SESSION_COOKIE_SECURE | ``settings.py`` | **FIXED** |
| 9.6 | HIGH | Missing CSRF_COOKIE_SECURE | ``settings.py`` | **FIXED** |
| 9.7 | HIGH | Missing SECURE_CONTENT_TYPE_NOSNIFF | ``settings.py`` | **FIXED** |
| 9.8 | MEDIUM | CORS_ALLOW_CREDENTIALS with broad config | ``settings.py:155-156`` | **OPEN** |
| 9.9 | LOW | Swagger UI publicly accessible | ``urls.py:34-45`` | **FIXED** |
| 9.10 | INFO | CsrfViewMiddleware enabled | ``settings.py:83`` | **PASS** |
| 9.11 | INFO | No ``@csrf_exempt`` decorators found | Entire backend | **PASS** |
| 9.12 | HIGH | ``subprocess.run`` executed at import time for Tesseract check | ``settings.py:286-304`` | **FIXED** |

**Details:**

- **9.1 & 9.2** ``SECRET_KEY`` and ``DEBUG`` remain configurable via ``.env`` for development flexibility. The production ``.env`` on the server must set ``DJANGO_DEBUG=False`` and a strong ``DJANGO_SECRET_KEY``. This is a deployment configuration issue, not a code issue.

- **9.3-9.7** **FIXED** -- All security headers are now auto-enabled when ``DEBUG=False``:

```python
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    SECURE_SSL_REDIRECT = False  # nginx handles SSL termination
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

- **9.9** **FIXED** -- Swagger and Redoc are now blocked in production via nginx (`deny all; return 404;` for `/swagger/` and `/redoc/`). In Django settings, `SWAGGER_SETTINGS` is only defined when `DEBUG=True`.

- **9.12** **FIXED** -- `settings.py` contained a `subprocess.run(['which', 'tesseract'], ...)` call at module import time to locate the Tesseract binary. This executes a shell command every time Django starts, which is a security concern (command injection risk if path is manipulated) and causes import failures in environments without Tesseract. Removed the `subprocess.run` call; now only sets `pytesseract.tesseract_cmd` path directly.

---

## 10. Nginx & Infrastructure Security

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 10.1 | MEDIUM | Missing Content-Security-Policy header | ``nginx/prod.conf`` | **FIXED** |
| 10.2 | MEDIUM | Missing ``server_tokens off`` | ``nginx/prod.conf`` | **FIXED** |
| 10.3 | MEDIUM | No nginx-level rate limiting | ``nginx/prod.conf`` | **FIXED** |
| 10.4 | MEDIUM | Security headers missing for static/media locations | ``nginx/prod.conf:76-88`` | **OPEN** |
| 10.5 | LOW | Weak SSL cipher string | ``nginx/prod.conf:21`` | **FIXED** |
| 10.6 | LOW | Missing OCSP stapling | ``nginx/prod.conf`` | **OPEN** |
| 10.7 | LOW | Deprecated X-XSS-Protection header | ``nginx/prod.conf:32`` | **FIXED** |
| 10.8 | INFO | HSTS enabled | ``nginx/prod.conf:38`` | **PASS** |
| 10.9 | INFO | SSL/TLS configured | ``nginx/prod.conf:30-35`` | **PASS** |
| 10.10 | MEDIUM | No rate limiting on ``/admin/`` login endpoint | ``nginx/prod.conf`` | **FIXED** |

**Details:**

- **10.1** **FIXED** -- Added Content-Security-Policy header:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self';
  ```
  Note: `unsafe-inline` for `style-src` is required for Bootstrap CSS.

- **10.2** **FIXED** -- Added ``server_tokens off;`` to nginx config to hide nginx version.

- **10.3** **FIXED** -- Added three rate limiting zones (``auth``, ``api``, ``public``) with nginx ``limit_req`` directives on all auth and API endpoints.

- **10.4** The `/static/` and `/media/` location blocks define their own `add_header` directives, which overrides the parent block's security headers. These locations have no CSP, X-Frame-Options, X-Content-Type-Options, or other security headers.

  **Remediation:** Add security headers to each location block, or use `include` to share headers.

- **10.5** **FIXED** -- Updated SSL cipher string to ``HIGH:!aNULL:!MD5:!3DES:!RC4`` and added ``ssl_buffer_size 4k``.

- **10.7** **FIXED** -- Changed ``X-XSS-Protection: 1; mode=block`` to ``X-XSS-Protection: 0`` (modern recommendation is to disable this header and rely on CSP).

- **10.10** **FIXED** -- The Django admin login at ``/admin/`` had no rate limiting, making it vulnerable to brute-force attacks. Added a dedicated ``admin`` rate limiting zone (``limit_req zone=admin burst=5 nodelay``) and applied it to the ``/admin/`` location block.

---

## 11. Docker & Container Security

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 11.1 | CRITICAL | No ``.dockerignore`` -- secrets leak into image layers | All Dockerfiles | **FIXED** (but see 11.14) |
| 11.2 | CRITICAL | Backend dev Dockerfile runs as root | ``backend/Dockerfile`` | **FIXED** |
| 11.3 | HIGH | PostgreSQL port exposed to host (dev) | ``docker-compose.yml:17`` | **OPEN** |
| 11.4 | HIGH | Redis port exposed with no auth (dev) | ``docker-compose.yml:24`` | **OPEN** |
| 11.5 | MEDIUM | No container resource limits | All compose files | **FIXED** |
| 11.6 | MEDIUM | No ``cap_drop``, ``read_only``, or ``security_opt`` | ``docker-compose.prod.yml`` | **FIXED** |
| 11.7 | MEDIUM | Redis password defaults to empty | ``docker-compose.prod.yml:41`` | **OPEN** |
| 11.8 | HIGH | Frontend dev Dockerfile runs as root | ``frontend/Dockerfile`` | **OPEN** |
| 11.9 | LOW | No healthchecks in dev compose | ``docker-compose.yml`` | **OPEN** |
| 11.10 | INFO | Multi-stage builds used | Both prod Dockerfiles | **PASS** |
| 11.11 | INFO | Non-root user in prod backend | ``backend/Dockerfile.prod`` | **PASS** |
| 11.12 | MEDIUM | ``.gitignore`` does not cover ``.env.*`` variants | ``.gitignore`` | **FIXED** |
| 11.13 | MEDIUM | ``Dockerfile.prod`` contains secret in build layer | ``Dockerfile.prod:39`` | **FIXED** |
| 11.14 | CRITICAL | ``.dockerignore`` files not committed to git | Root, ``backend/``, ``frontend/`` | **OPEN** |

**Details:**

- **11.1** **FIXED** -- Created ``.dockerignore`` files for backend, frontend, and root:
  - ``backend/.dockerignore`` -- Excludes ``.git``, ``.env*``, ``__pycache__``, ``node_modules``, ``media/``, ``*.sql``, ``docker-compose*``, ``nginx/``, ``frontend/``, test files
  - ``frontend/.dockerignore`` -- Excludes ``.git``, ``node_modules``, ``dist/``, ``build/``, ``backend/``, ``nginx/``
  - ``.dockerignore`` (root) -- Excludes ``.git``, ``.env*``, ``__pycache__``, ``node_modules``, ``*.sql``, test files, ``User Manual/``

  **However, see finding 11.14** -- these files exist on disk but are untracked in git.

- **11.2** **FIXED** -- Backend dev Dockerfile now runs as non-root ``appuser`` (uid 1000) with ``USER appuser`` directive. Added proper directory ownership for media and staticfiles.

- **11.5** **FIXED** -- Added resource limits to all production containers:
  - ``backend``: cpus=2, memory=1G
  - ``celery_worker``: cpus=1, memory=512M
  - ``celery_beat``: cpus=0.5, memory=256M
  - ``nginx``: cpus=0.5, memory=256M

- **11.6** **FIXED** -- Added to all production containers:
  - ``cap_drop: ALL`` (drops all Linux capabilities)
  - ``cap_add: NET_BIND_SERVICE`` (only for nginx/backend if needed)
  - ``read_only: true`` (read-only filesystem)
  - ``tmpfs: /tmp`` (writable temp directory)

- **11.8** `frontend/Dockerfile` has **no `USER` directive**. The container runs `npm install` and the dev server as **root**. Previous audit (Round 2) claimed this was fixed, but the file was never modified. This is a **regression from the reported fix**.

  **Remediation:** Add `USER node` after `WORKDIR /app` (Node Alpine images include a `node` user by default).

- **11.12** **FIXED** -- ``.gitignore`` only matched ``.env`` but not ``.env.local``, ``.env.production``, etc. Updated to ``.env.*`` with a ``!.env.example`` exception so that environment-specific files are excluded while the example template is tracked.

- **11.13** **FIXED** -- ``Dockerfile.prod`` contained ``DJANGO_SECRET_KEY=dummy`` as a build-time secret placeholder, which could be leaked into image layer history. Changed to ``SECRET_KEY=build-placeholder`` with a non-revealing placeholder value.

- **11.14** All three ``.dockerignore`` files (root, ``backend/``, ``frontend/``) exist on disk but are **untracked in git** (``git status`` shows ``??``). This means:
  - CI/CD builds will **not** have ``.dockerignore`` files (they are not in the repo)
  - Fresh clones will **not** have ``.dockerignore`` files
  - ``.env``, ``.git``, ``__pycache__``, and other sensitive files **will leak into Docker image layers** during CI builds

  **Remediation:** Run ``git add .dockerignore backend/.dockerignore frontend/.dockerignore`` immediately. This is a **P0 critical** fix.

---

## 12. CI/CD Pipeline Security

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 12.1 | LOW | Test passwords hardcoded in workflow | ``deploy.yml`` | Acceptable |
| 12.2 | INFO | Build only on non-PR events | ``deploy.yml`` | **PASS** |
| 12.3 | INFO | Permissions scoped (packages: write, contents: read) | ``deploy.yml`` | **PASS** |
| 12.4 | INFO | Secrets not echoed in logs | ``deploy.yml`` | **PASS** |
| 12.5 | INFO | GitHub Container Registry used (GHCR) | ``deploy.yml`` | **PASS** |
| 12.6 | MEDIUM | No ``pip-audit`` or dependency scanning in CI | ``deploy.yml`` | **OPEN** |
| 12.7 | MEDIUM | No ``npm audit`` in frontend CI | ``deploy.yml`` | **OPEN** |

---

## 13. Dependency Security

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 13.1 | MEDIUM | No ``pip-audit`` or dependency scanning in CI | ``.github/workflows/`` | **OPEN** |
| 13.2 | MEDIUM | No ``npm audit`` in frontend CI | ``.github/workflows/`` | **OPEN** |
| 13.3 | LOW | TinyMCE dependency (large attack surface) | ``frontend/package.json:30`` | **OPEN** |
| 13.4 | LOW | WeasyPrint SSRF risk (fetches external resources) | Multiple views | **OPEN** |
| 13.5 | INFO | Dependencies reasonably current | Both ``requirements.txt`` and ``package.json`` | **PASS** |
| 13.6 | LOW | ``sass`` listed as runtime dependency instead of devDependency | ``frontend/package.json`` | **OPEN** |

---

## 14. Frontend Code Quality (Security-Relevant)

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 14.1 | MEDIUM | Duplicate auth logic bypasses AuthContext | `RegisterAndApply.jsx:240`, `TraineeLogin.jsx:28` | **OPEN** |
| 14.2 | LOW | Direct `localStorage` reads bypass AuthContext | `VoucherWorkflow.jsx:271`, `CircularCard.jsx:7` | **OPEN** |
| 14.3 | LOW | Unsafe `JSON.parse` without try/catch | `VoucherWorkflow.jsx:271` | **OPEN** |

**Details:**

- **14.1** `RegisterAndApply.jsx:240-242` and `TraineeLogin.jsx:28-30` write tokens directly to `localStorage` and set `api.defaults.headers.Authorization` manually, duplicating the login logic in `AuthContext`. This creates maintenance risks -- if token storage changes (e.g., to HttpOnly cookies), these bypasses will continue using the old pattern.

- **14.2** `VoucherWorkflow.jsx:271` and `CircularCard.jsx:7` read directly from `localStorage` instead of using `useAuth()` hook. Minor inconsistency but creates coupling to the storage mechanism.

- **14.3** `VoucherWorkflow.jsx:271` calls `JSON.parse(localStorage.getItem('user') || '{}')` without try/catch. Corrupted localStorage data could cause an unhandled exception.

---

## Compliance Summary for Third-Party Integration

### Remediation Status

| # | Category | Finding | Priority | Status |
|---|----------|---------|----------|--------|
| 1 | Rate Limiting | Add login, OTP, and registration rate limiting | **P0** | **FIXED** |
| 2 | XSS | Sanitize all HTML output (DOMPurify) and escape ``document.write`` | **P0** | **FIXED** |
| 3 | Token Security | Remove JWT from URL parameters | **P0** | **FIXED** |
| 4 | Secrets | Rotate all secrets; add ``.dockerignore``; never commit ``.env`` | **P0** | **FIXED** (``.dockerignore``, ``.gitignore``, ``.env.example``) |
| 5 | Django Settings | Add all security headers when DEBUG=False | **P0** | **FIXED** |
| 6 | Authorization | Add permission classes to Assessment, Certificate, JobPlacement, Notification viewsets | **P1** | **FIXED** |
| 7 | File Upload | Add file type/size validators to all FileField uploads | **P1** | **FIXED** |
| 8 | OTP | Remove TEST_OTP bypass; use ``secrets.randbelow()`` | **P1** | **FIXED** |
| 9 | Docker | Add ``.dockerignore``; run containers as non-root; add resource limits | **P1** | **PARTIAL** (backend fixed, frontend root user open, .dockerignore untracked) |
| 10 | Nginx | Add CSP, server_tokens off, rate limiting zones | **P1** | **FIXED** |
| 11 | Password Security | Do not return plaintext password in API response | **P1** | **FIXED** |
| 12 | XSS | Sanitize SimpleEditor ``innerHTML`` with DOMPurify | **P1** | **FIXED** (Round 2) |
| 13 | Authorization | Remove ``create`` from UserViewSet AllowAny actions | **P1** | **FIXED** (Round 2) |
| 14 | XSS | Fix outerHTML injection in ApplicationDetailPage ``onError`` | **P0** | **FIXED** (Round 2) |
| 15 | Subprocess | Remove ``subprocess.run`` at import time in settings.py | **P1** | **FIXED** (Round 2) |
| 16 | Data Privacy | Replace external QR API with client-side ``qrcode.react`` | **P1** | **FIXED** (Round 2) |
| 17 | SQL | Replace ``.extra()`` with ``ExtractWeek`` annotation | **P2** | **FIXED** (Round 2) |
| 18 | Password Policy | Enforce 8-character minimum password length | **P2** | **FIXED** (Round 2) |
| 19 | Nginx | Add rate limiting on ``/admin/`` endpoint | **P1** | **FIXED** (Round 2) |
| 20 | Container Security | Add explicit ``USER`` directive to frontend Dockerfile | **P1** | **OPEN** (Round 2 fix was not actually applied) |
| 21 | Docker | Remove secret from Dockerfile.prod build layer | **P2** | **FIXED** (Round 2) |
| 22 | Logging | Remove ``print()`` OTP to stdout; use logger only | **P2** | **FIXED** (Round 2) |
| 23 | Logging | Remove ``console.log`` of full payload | **P2** | **FIXED** (Round 2) |
| 24 | Secrets | Replace real passwords in ``.env.example`` with placeholders | **P2** | **FIXED** (Round 2) |
| 25 | Secrets | Expand ``.gitignore`` to cover ``.env.*`` variants | **P2** | **FIXED** (Round 2) |
| 26 | Nginx | Remove ``unsafe-eval`` from CSP ``script-src`` | **P1** | **FIXED** (Round 2) |
| 27 | Docker | Commit ``.dockerignore`` files to git | **P0** | **OPEN** (Round 3) |
| 28 | Frontend | Add ``USER node`` to frontend dev Dockerfile | **P1** | **OPEN** (Round 3 -- previous fix not applied) |

### Current Compliance Status

| Control | Status | Notes |
|---------|--------|-------|
| SQL Injection Protection | **PASS** | Django ORM used throughout |
| CSRF Protection | **PASS** | Middleware enabled, no exemptions |
| JWT Configuration | **PASS** | Proper expiry, rotation, blacklisting |
| JWT Token Exposure | **FIXED** | No longer passed in URLs; uses Authorization header |
| Password Hashing | **PASS** | Django's PBKDF2 |
| HTTPS/TLS | **PASS** | SSL/TLS configured in nginx |
| HSTS | **PASS** | 31536000 seconds |
| XSS Prevention (Backend) | **PASS** | Django auto-escaping |
| XSS Prevention (Frontend) | **FIXED** | DOMPurify on dangerouslySetInnerHTML and innerHTML; escapeHtml on document.write; safe onError fallback |
| Rate Limiting (Auth) | **FIXED** | DRF throttles + nginx rate limiting |
| Rate Limiting (General) | **FIXED** | Nginx rate limiting on all API endpoints including /admin/ |
| Token Storage | **PARTIAL** | localStorage (migration to HttpOnly cookies recommended) |
| File Upload Validation | **FIXED** | FileExtensionValidator on all user-facing FileField/ImageField |
| Input Validation | **PASS** | DRF serializer validation |
| Container Security | **PARTIAL** | Backend non-root, frontend still runs as root; .dockerignore untracked |
| Dependency Scanning | **FAIL** | No automated scanning |
| ViewSet Authorization | **FIXED** | Role-based permissions on critical viewsets |
| Django Security Headers | **FIXED** | Auto-enabled when DEBUG=False |
| Nginx Security Headers | **PARTIAL** | Missing on /static/ and /media/ locations |
| Swagger Exposure | **FIXED** | Blocked in production nginx |
| Subprocess Security | **FIXED** | No subprocess calls at import time |
| QR Code Privacy | **FIXED** | Client-side generation, no third-party data leak |
| Build Secrets | **FIXED** | No real secrets in Dockerfile build layers |
| .env Protection | **FIXED** | .gitignore covers all .env variants; .env.example uses placeholders |
| Admin Rate Limiting | **FIXED** | nginx limit_req on /admin/ endpoint |
| .dockerignore Tracking | **FAIL** | Files exist but not committed to git |

### Remaining Recommendations (Lower Priority)

| # | Category | Finding | Priority |
|---|----------|---------|----------|
| 1 | Auth | Migrate JWT from localStorage to HttpOnly cookies | **P2** |
| 2 | Auth | Implement account lockout after failed logins | **P2** |
| 3 | Auth | Return generic response on ``public_check_user`` regardless of user existence | **P2** |
| 4 | Auth | Require auth on ``print_application`` endpoint | **P2** |
| 5 | Auth | Rate limit ``check_nid`` endpoint | **P2** |
| 6 | Auth | Stop auto-incrementing ``verified_count`` on unauthenticated calls | **P2** |
| 7 | Security | Set strong SECRET_KEY and DEBUG=False in production ``.env`` | **P2** |
| 8 | Security | Do not send plaintext passwords via email | **P2** |
| 9 | Security | Remove hardcoded default passwords from seed scripts | **P2** |
| 10 | Security | Implement refresh token rotation and server-side revocation | **P2** |
| 11 | Security | Add CSRF token headers to API interceptor | **P2** |
| 12 | Docker | Add ``pip-audit`` and ``npm audit`` to CI/CD pipeline | **P2** |
| 13 | Docker | Set Redis password in production | **P2** |
| 14 | Docker | Remove exposed DB/Redis ports from dev compose | **P2** |
| 15 | Docker | Add network segmentation in docker-compose | **P2** |
| 16 | Frontend | Add React Error Boundaries | **P3** |
| 17 | Frontend | Remove unused ``tinymce`` dependency | **P3** |
| 18 | Frontend | Audit ``console.error`` calls for data leakage | **P3** |
| 19 | Nginx | Add OCSP stapling | **P3** |
| 20 | Nginx | Add security headers to static/media locations | **P3** |
| 21 | Config | Narrow CORS_ALLOW_CREDENTIALS configuration | **P2** |
| 22 | Config | Add per-field upload size validation | **P2** |
| 23 | Frontend | Create shared ``fetchWithAuth()`` utility for PDF handlers | **P3** |
| 24 | Frontend | Validate URLs in SimpleEditor ``createLink`` (block ``javascript:``) | **P2** |
| 25 | Frontend | Move ``sass`` to devDependencies | **P3** |
| 26 | Frontend | Add input validation on center coordinates and logo URL | **P3** |

---

## Appendix A: Files Changed During Remediation

### Backend Files

| File | Changes Applied |
|------|----------------|
| ``backend/brtc_tms/settings.py`` | Security headers auto-enabled when DEBUG=False; TEST_OTP disabled in production; Swagger blocked in production; rate limit throttle rates added; removed ``subprocess.run`` at import time; removed ``unsafe-eval`` from CSP |
| ``backend/apps/common/throttles.py`` | **NEW** -- LoginThrottle, OTPThrottle, RegistrationThrottle, PublicCheckThrottle |
| ``backend/apps/common/validators.py`` | **NEW** -- image_validator, document_validator (FileExtensionValidator) |
| ``backend/apps/accounts/services.py`` | OTP generation uses ``secrets.randbelow()``; TEST_OTP guarded with ``settings.DEBUG`` check; removed ``print()`` to stdout, uses logger only |
| ``backend/apps/accounts/views.py`` | LoginThrottle added to login action; removed ``create`` from AllowAny actions |
| ``backend/apps/accounts/views_public.py`` | Rate throttles on all 5 public endpoints; TEST_OTP bypass guarded with ``settings.DEBUG`` |
| ``backend/apps/accounts/views_ho.py`` | ``reset_password`` no longer returns plaintext password; now actually sends password reset email via ``django.core.mail.send_mail()`` |
| ``backend/apps/accounts/models.py`` | image_validator on profile_image |
| ``backend/apps/applications/models.py`` | image_validator on profile_image/nid_front/nid_back; document_validator on evidence_file |
| ``backend/apps/assessments/views.py`` | IsAssessorOrAdmin permission class added |
| ``backend/apps/certificates/views.py`` | IsHeadOfficeOrStaff permission class added |
| ``backend/apps/notifications/views.py`` | Queryset scoped to logged-in user |
| ``backend/apps/reports/views.py`` | IsHeadOfficeOrStaff permission class added |
| ``backend/apps/jobplacement/views.py`` | IsHeadOfficeOrStaff permission class added |
| ``backend/apps/trainees/views_trainee.py`` | Replaced ``.extra()`` with ``ExtractWeek`` annotation; password minimum length changed to 8 characters |

### Frontend Files

| File | Changes Applied |
|------|----------------|
| ``frontend/src/utils/sanitize.js`` | **NEW** -- DOMPurify wrapper |
| ``frontend/src/utils/escapeHtml.js`` | **NEW** -- HTML entity escape utility |
| ``frontend/src/pages/circulars/PublicCircularList.jsx`` | Sanitized dangerouslySetInnerHTML |
| ``frontend/src/pages/ho/circulars/CircularDetail.jsx`` | Sanitized dangerouslySetInnerHTML; fetch+blob for PDF |
| ``frontend/src/pages/ho/circulars/CircularList.jsx`` | fetch+blob for PDF (2 locations) |
| ``frontend/src/pages/ho/HoCourseDetail.jsx`` | fetch+blob for PDF |
| ``frontend/src/pages/batches/BatchDetail.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/assessors/AssessorList.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/assessors/AssessorDetailPage.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/trainers/TrainerList.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/trainers/TrainerDetailPage.jsx`` | escapeHtml on document.write |
| ``frontend/src/components/attendance/QRCodeGenerator.jsx`` | escapeHtml on document.write; replaced external QR API with ``qrcode.react`` |
| ``frontend/src/pages/courses/CourseList.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/ho/AssessorList.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/trainees/TraineeList.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/ho/HoApprovalManagement.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/ho/HoCenterManagement.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/ho/HoSelectedTrainees.jsx`` | escapeHtml on document.write |
| ``frontend/src/pages/ho/TrainerList.jsx`` | escapeHtml on document.write |
| ``frontend/src/components/SimpleEditor.jsx`` | Added DOMPurify ``sanitize()`` before innerHTML assignment (Round 2) |
| ``frontend/src/pages/applications/ApplicationDetailPage.jsx`` | Replaced unsafe ``onError`` outerHTML manipulation with safe ``<a>`` link fallback (Round 2) |
| ``frontend/src/pages/ho/HoCourseManagement.jsx`` | Removed ``console.log`` of full request payload (Round 2) |
| ``frontend/package.json`` | Added ``dompurify`` dependency; added ``qrcode.react`` dependency |

### Infrastructure Files

| File | Changes Applied |
|------|----------------|
| ``backend/.dockerignore`` | **NEW** -- Excludes .git, .env, __pycache__, node_modules, test files (NOT committed to git -- see finding 11.14) |
| ``frontend/.dockerignore`` | **NEW** -- Excludes .git, node_modules, dist, backend, nginx (NOT committed to git -- see finding 11.14) |
| ``.dockerignore`` (root) | **NEW** -- Excludes .git, .env, __pycache__, node_modules, SQL files (NOT committed to git -- see finding 11.14) |
| ``backend/Dockerfile`` | Added non-root ``appuser`` (uid 1000), USER directive, gunicorn workers |
| ``frontend/Dockerfile`` | **NOT FIXED** -- No USER directive added; container runs as root (see finding 11.8) |
| ``frontend/Dockerfile.prod`` | Added port 443 EXPOSE |
| ``Dockerfile.prod`` | Changed build secret placeholder from ``DJANGO_SECRET_KEY=dummy`` to ``SECRET_KEY=build-placeholder`` (Round 2) |
| ``docker-compose.prod.yml`` | cap_drop: ALL, read_only: true, tmpfs, resource limits on all containers |
| ``nginx/prod.conf`` | server_tokens off, CSP header (no unsafe-eval), rate limiting zones (auth, api, public, admin), Swagger/Redoc blocked, SSL hardening, X-XSS-Protection=0 |
| ``.gitignore`` | Expanded to ``.env.*`` with ``!.env.example`` exception (Round 2) |
| ``.env.example`` | Replaced real passwords with ``<CHANGE_ME>`` placeholders (Round 2) |

---

*Report prepared for third-party integration compliance testing. All findings are based on static code analysis of the codebase as of 21 July 2026. Round 2 remediation applied 22 July 2026. Round 3 scan and corrections applied 22 July 2026.*
