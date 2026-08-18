# -*- coding: utf-8 -*-
"""Generates Technology_Stack_Documentation.html and .pdf for the BRTC TMS.

Content reflects the actual stack used in this repository (backend/,
frontend/, docker-compose*.yml, nginx/). Run from the project root:
    python make_tech_stack.py
"""
import os

NAVY = '#0b3d91'
INK = '#111827'
MUTED = '#6b7280'
BLUE_LIGHT = '#dbeafe'
BLUE_EDGE = '#1d4ed8'
GREEN = '#16a34a'
RED = '#dc2626'
BG = '#f8fafc'


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def svg_open(w, h):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" role="img">\n'
            '<g font-family="\'Segoe UI\', Arial, sans-serif">\n' % (w, h, w, h))


def svg_close():
    return '</g></svg>'


def rbox(x, y, w, h, lines, fill='#ffffff', stroke=NAVY, fs=11, bold=False,
         textfill=INK, rx=8, lh=1.25, dashed=False):
    if not isinstance(lines, (list, tuple)):
        lines = [lines]
    dash = ' stroke-dasharray="5,3"' if dashed else ''
    s = '<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="%s" stroke="%s" stroke-width="1.5"%s/>\n' % (
        x, y, w, h, rx, fill, stroke, dash)
    cx = x + w // 2
    cy = y + h // 2
    n = len(lines)
    for i, ln in enumerate(lines):
        ty = cy - (n - 1) * fs * lh / 2 + i * fs * lh + fs * 0.35
        fw = ' font-weight="bold"' if bold else ''
        s += '<text x="%d" y="%.1f" font-size="%g" text-anchor="middle" fill="%s"%s>%s</text>\n' % (
            cx, ty, fs, textfill, fw, esc(ln))
    return s


def tlabel(x, y, s, fs=9, fill=MUTED, anchor='middle', bold=False):
    fw = ' font-weight="bold"' if bold else ''
    return '<text x="%g" y="%g" font-size="%g" text-anchor="%s" fill="%s"%s>%s</text>\n' % (
        x, y, fs, anchor, fill, fw, esc(s))


def arrow(x1, y1, x2, y2, color=NAVY, head=7, width=1.5, dash=None, hollow=False):
    d = '' if dash is None else ' stroke-dasharray="%s"' % dash
    s = '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="%g"%s/>\n' % (
        x1, y1, x2, y2, color, width, d)
    dx, dy = x2 - x1, y2 - y1
    import math
    ang = math.atan2(dy, dx)
    ax = x2 - head * math.cos(ang)
    ay = y2 - head * math.sin(ang)
    if hollow:
        p = ' fill="#ffffff" stroke="%s" stroke-width="1.5"' % color
    else:
        p = ' fill="%s"' % color
    s += '<polygon points="%d,%d %d,%d %d,%d"%s/>\n' % (
        x2, y2, ax - head * 0.35 * math.sin(ang), ay + head * 0.35 * math.cos(ang),
        ax + head * 0.35 * math.sin(ang), ay - head * 0.35 * math.cos(ang), p)
    return s


def fig_architecture():
    """Two-row pipeline: browser -> nginx -> django -> db/redis/celery."""
    s = svg_open(1200, 460)
    # Browser layer
    s += rbox(40, 60, 220, 110, ['Web Browser', '(SPA)', 'React 18 + Vite 5'], fill=BLUE_LIGHT,
              stroke=BLUE_EDGE, fs=13, bold=True)
    s += tlabel(150, 44, 'CLIENT', fs=10, bold=True)
    # Nginx layer
    s += rbox(340, 60, 220, 110, ['Nginx', 'Reverse Proxy', 'TLS 1.2/1.3 + Rate Limit'],
              fill='#ffffff', stroke=NAVY, fs=12, bold=True)
    s += tlabel(450, 44, 'EDGE', fs=10, bold=True)
    # Django layer
    s += rbox(640, 60, 260, 110, ['Django 4.2 + DRF', '17 Business Apps', 'JWT Auth / Celery Beat'],
              fill=NAVY, stroke=NAVY, fs=12, bold=True, textfill='#ffffff')
    s += tlabel(770, 44, 'APPLICATION (API)', fs=10, bold=True)
    # Data layer
    s += rbox(960, 40, 200, 70, ['PostgreSQL 15/16', 'Relational Data'], fs=12, bold=True)
    s += rbox(960, 130, 200, 70, ['Redis 7', 'Cache + Broker'], fs=12, bold=True)
    s += tlabel(1060, 24, 'DATA', fs=10, bold=True)

    # Async worker row
    s += rbox(960, 360, 200, 80, ['Celery Worker', '+ Celery Beat', '(async jobs / schedules)'], fs=12, bold=True)
    s += tlabel(1060, 344, 'ASYNC', fs=10, bold=True)
    # OCR / PDF row
    s += rbox(40, 360, 260, 80, ['Tesseract OCR (bn+en)', 'OpenCV / Pillow', 'WeasyPrint PDF'],
              fill='#ffffff', stroke=NAVY, fs=12, bold=True)
    s += tlabel(170, 344, 'DOCUMENT PIPELINE', fs=10, bold=True)

    s += arrow(260, 115, 340, 115)
    s += arrow(560, 115, 640, 115)
    s += arrow(900, 115, 960, 115)
    s += arrow(900, 115, 960, 165)
    s += arrow(900, 115, 1060, 360, dash='6,3')
    s += arrow(340, 170, 170, 360, dash='6,3')

    s += svg_close()
    return s


def css():
    return '''
@page {
  size: A4;
  margin: 20mm 16mm 18mm 16mm;
  @bottom-center {
    content: "BRTC TMS - Technology Stack Documentation  \\2022  Page " counter(page) " of " counter(pages);
    font-size: 8.5pt; color: #6b7280; font-family: 'Segoe UI', Arial, sans-serif;
  }
}
@page cover {
  margin: 0;
  @bottom-center { content: none; }
}
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 10.5pt; line-height: 1.55; }
.cover { page: cover; width: 100%; height: 297mm; padding: 40mm 22mm; background: linear-gradient(160deg, #0b3d91 0%, #123f8f 55%, #071f4d 100%); color: #ffffff; }
.cover .kicker { font-size: 11pt; letter-spacing: 3px; text-transform: uppercase; color: #93c5fd; }
.cover h1 { font-size: 30pt; margin: 10mm 0 6mm 0; line-height: 1.15; }
.cover .sub { font-size: 12.5pt; color: #dbeafe; line-height: 1.6; }
.cover .meta { margin-top: 18mm; font-size: 10pt; color: #bfdbfe; line-height: 1.8; }
.cover .rule { width: 70mm; height: 3px; background: #60a5fa; margin: 10mm 0; }
h1.section { font-size: 16pt; color: #0b3d91; border-bottom: 2.5px solid #0b3d91; padding-bottom: 3mm; margin: 10mm 0 5mm 0; }
h1.first { margin-top: 0; }
h2 { font-size: 12.5pt; color: #1d4ed8; margin: 7mm 0 3mm 0; }
p { margin: 0 0 3mm 0; text-align: justify; }
ul { margin: 0 0 3mm 0; padding-left: 6mm; }
li { margin-bottom: 1.5mm; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0 5mm 0; font-size: 9.5pt; }
th { background: #0b3d91; color: #ffffff; text-align: left; padding: 2mm 2.5mm; }
td { border: 0.5pt solid #cbd5e1; padding: 2mm 2.5mm; vertical-align: top; }
tr:nth-child(even) td { background: #f1f5f9; }
.tech-tag { display: inline-block; background: #dbeafe; color: #1d4ed8; border: 0.5pt solid #bfdbfe; border-radius: 3mm; padding: 0.5mm 2.5mm; font-size: 8.5pt; font-weight: 600; margin: 0 1mm 1mm 0; }
.callout { background: #fffbeb; border-left: 3mm solid #eab308; padding: 3mm 4mm; margin: 3mm 0; }
.callout.green { background: #f0fdf4; border-left-color: #16a34a; }
.fig { text-align: center; margin: 4mm 0; page-break-inside: avoid; }
.fig svg { width: 100%; height: auto; }
.fig-caption { font-size: 9pt; color: #6b7280; margin-top: 1.5mm; }
.two-col { display: flex; }
.two-col > div { flex: 1; }
.two-col > div + div { margin-left: 8mm; }
.small { font-size: 9pt; color: #6b7280; }
.toc { font-size: 11pt; }
.toc td { border: none; padding: 1mm 0; background: #ffffff !important; }
.toc .n { color: #0b3d91; font-weight: 700; width: 10mm; }
code { font-family: Consolas, monospace; font-size: 9pt; background: #f1f5f9; padding: 0.2mm 1.5mm; border-radius: 1mm; }
'''


def build_html():
    out = []
    out.append('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
               '<title>BRTC TMS - Technology Stack Documentation</title>\n<style>\n')
    out.append(css())
    out.append('</style>\n</head>\n<body>\n')

    # Cover
    out.append('<div class="cover">\n')
    out.append('<div class="kicker">BRTC Training Management System</div>\n')
    out.append('<h1>Technology Stack<br/>Documentation</h1>\n')
    out.append('<div class="rule"></div>\n')
    out.append('<div class="sub">The technologies used across the platform &mdash; '
               'what they are, why they were chosen, and how the system is secured.</div>\n')
    out.append('<div class="meta">Document: BRTC-TMS-TECH-001<br/>Version: 1.0 '
               '<br/>Status: Final<br/>Classification: Internal</div>\n')
    out.append('</div>\n')

    # TOC
    out.append('<h1 class="section first">Contents</h1>\n<table class="toc">\n')
    toc = [
        ('1', 'System Overview &amp; Architecture'),
        ('2', 'Frontend Technology'),
        ('3', 'Backend Technology &amp; API'),
        ('4', 'Data, Cache &amp; Task Queue'),
        ('5', 'Document Pipeline (OCR, PDF, QR)'),
        ('6', 'Infrastructure &amp; Deployment'),
        ('7', 'Security Architecture'),
        ('8', 'Rationale Summary'),
    ]
    for n, t in toc:
        out.append('<tr><td class="n">%s</td><td>%s</td></tr>\n' % (n, t))
    out.append('</table>\n')

    # 1 Overview
    out.append('<h1 class="section">1. System Overview &amp; Architecture</h1>\n')
    out.append('<p>The BRTC Training Management System (BRTC TMS) is a full-stack web platform that '
               'administers the entire training lifecycle &mdash; from public circulars and NID-verified '
               'applications through batch enrollment, attendance, assessment, certification, job '
               'placement and finance/allowance management. It is built as a modern single-page '
               'application (SPA) backed by a RESTful API, with asynchronous background processing and '
               'a containerised deployment model.</p>\n')
    out.append('<div class="fig">\n%s\n<div class="fig-caption">Figure 1: End-to-end architecture '
               '(&#8220;Client &rarr; Edge &rarr; Application &rarr; Data&#8221; pipeline with async '
               'workers and the document pipeline).</div>\n</div>\n' % fig_architecture())
    out.append('<h2>Core design principles</h2>\n<ul>\n'
               '<li><b>Separation of concerns</b> &mdash; frontend SPA, REST API, background workers, '
               'and reverse proxy are independent, containerised components.</li>\n'
               '<li><b>Stateless API authentication</b> via JWT so the same backend serves the web '
               'application and future integrations.</li>\n'
               '<li><b>Asynchronous by default</b> &mdash; slow work (reports, certificates, '
               'notifications) is delegated to Celery instead of blocking request threads.</li>\n'
               '<li><b>Modular domain design</b> &mdash; the backend is split into 17 Django apps '
               'mirroring business areas (accounts, applications, batches, assessments, certificates, '
               'finance, etc.).</li>\n'
               '</ul>\n')

    # 2 Frontend
    out.append('<h1 class="section">2. Frontend Technology</h1>\n')
    out.append('<p>The client is a React 18 single-page application built with Vite 5. The UI layer uses '
               'Bootstrap 5 (via react-bootstrap) with SASS theming, styled-components, and '
               'bootstrap-icons for a consistent administrative interface.</p>\n')
    out.append('<table>\n<tr><th>Technology</th><th>Role in the system</th><th>Why it was chosen</th></tr>\n')
    rows = [
        ('React 18', 'Component-based SPA for all admin, trainer and public pages.',
         'Mature ecosystem, virtual-DOM rendering, huge talent pool, easy to compose complex forms and tables.'),
        ('Vite 5', 'Dev server and production build tool.',
         'Near-instant hot reload, fast Rollup-based production bundles, minimal configuration.'),
        ('React Router v6', 'Client-side routing for modules.',
         'Declarative nested routing with lazy loading support; the standard for React SPAs.'),
        ('Zustand', 'Global state management (auth/session, app-wide data).',
         'Minimal boilerplate compared to Redux, selector-based re-renders, tiny bundle footprint.'),
        ('React Hook Form', 'Form state, validation and submission.',
         'Uncontrolled inputs reduce re-renders; works cleanly with Yup-style validation and large forms (applications, batches).'),
        ('Axios', 'HTTP client for the DRF API.',
         'Interceptors for JWT refresh, unified error handling, cancel tokens and clean async/await API.'),
        ('Bootstrap 5 + react-bootstrap + SASS', 'Layout, components, styling.',
         'Fast, accessible, mobile-responsive UI consistent with government system expectations; SASS for custom theming.'),
        ('react-data-table-component', 'Sortable/filterable data grids (trainees, applications, reports).',
         'High-performance tables with built-in searching, pagination and column customisation.'),
        ('react-select', 'Searchable dropdowns (districts, centers, courses, NID fields).',
         'Accessible multi/async selects with keyboard support for long option lists.'),
        ('Recharts', 'Charts on dashboards and reports.',
         'Composable SVG charts that integrate with React state and responsive containers.'),
        ('QRCode.react', 'QR codes on certificates and entry passes.',
         'Reliable client-side QR rendering for verifiable documents.'),
        ('DOMPurify', 'Sanitisation of user/rich-text content before rendering.',
         'Defence-in-depth against stored/reflected XSS.'),
        ('nodejs-avro-phonetic', 'Bengali phonetic input for NID/trainee names.',
         'Enables Bengali (Bangla) name entry using a standard English keyboard layout.'),
        ('react-toastify', 'Non-blocking user notifications.',
         'Lightweight, themeable toasts for success/error feedback across the app.'),
        ('Vitest + React Testing Library', 'Unit/component tests.',
         'Fast, Vite-native test runner with a component-testing API aligned to user behaviour.'),
    ]
    for t, role, why in rows:
        out.append('<tr><td><b>%s</b></td><td>%s</td><td>%s</td></tr>\n' % (t, role, why))
    out.append('</table>\n')

    # 3 Backend
    out.append('<h1 class="section">3. Backend Technology &amp; API</h1>\n')
    out.append('<p>The API layer is built on <b>Django 4.2</b> with the <b>Django REST Framework '
               '(DRF) 3.15</b>. Authentication is stateless JSON Web Tokens via '
               '<code>djangorestframework-simplejwt</code>. 17 domain apps organise the business logic, '
               'all exposed through a single <code>/api/</code> namespace.</p>\n')
    out.append('<table>\n<tr><th>Technology</th><th>Role in the system</th><th>Why it was chosen</th></tr>\n')
    rows = [
        ('Django 4.2 LTS', 'Core web framework, ORM, migrations, admin, middleware.',
         'Batteries-included LTS with strong security defaults, mature ORM, and automatic schema '
         'migrations &mdash; ideal for a data-heavy government training system.'),
        ('Django REST Framework', 'RESTful API, serializers, permissions, throttling.',
         'The de-facto Django API framework; built-in throttling, filtering, pagination and browsable API.'),
        ('djangorestframework-simplejwt', 'Stateless JWT authentication.',
         'Secure token auth with configurable lifetimes, rotation and blacklisting &mdash; suitable for SPA clients.'),
        ('django-cors-headers', 'Cross-origin resource sharing for the SPA.',
         'Controls which origins may call the API (CORS_ALLOWED_ORIGINS is environment-driven).'),
        ('django-filter', 'Declarative filtering of list endpoints.',
         'Standardised query-string filtering for large datasets (applications, trainees, batches).'),
        ('drf-yasg', 'Swagger/OpenAPI schema generation.',
         'Automatic API documentation for integrators and QA (disabled in production).'),
        ('django-ckeditor', 'Rich-text editing in admin/notices.',
         'WYSIWYG content editing for circulars and announcements.'),
        ('django-simple-history', 'Full audit trail of model changes.',
         'Immutable change history satisfies accountability and audit requirements for public services.'),
        ('django-celery-beat', 'Database-driven scheduled task definitions.',
         'Lets administrators schedule recurring jobs (reports, reminders) without code deploys.'),
        ('python-decouple / python-dotenv', '12-factor configuration from environment files.',
         'Keeps secrets out of source control; every environment supplies its own settings.'),
    ]
    for t, role, why in rows:
        out.append('<tr><td><b>%s</b></td><td>%s</td><td>%s</td></tr>\n' % (t, role, why))
    out.append('</table>\n')
    out.append('<h2>Domain modules</h2>\n')
    out.append('<p class="small">' + ', '.join(
        ['accounts', 'centers', 'courses', 'trainers', 'assessors', 'circulars', 'applications',
         'batches', 'attendance', 'assessments', 'certificates', 'jobplacement', 'reports',
         'notifications', 'trainees', 'finance', 'allowance', 'system_config']) + '</p>\n')

    # 4 Data & queue
    out.append('<h1 class="section">4. Data, Cache &amp; Task Queue</h1>\n')
    out.append('<table>\n<tr><th>Technology</th><th>Role in the system</th><th>Why it was chosen</th></tr>\n')
    rows = [
        ('PostgreSQL 15 / 16', 'Primary relational database.',
         'ACID transactions, strong constraint enforcement (e.g. unique NID/phone checks), JSON support, '
         'and excellent concurrency &mdash; essential for accurate enrollment and selection processing.'),
        ('Redis 7', 'Cache (DRF throttling, sessions) and Celery message broker.',
         'In-memory speed, built-in persistence option (<code>appendonly yes</code> in production), '
         'single service covers both cache and broker roles.'),
        ('Celery 5', 'Distributed task queue and beat scheduler.',
         'Offloads PDF generation, notifications, reporting and scheduled jobs; JSON serialization with '
         'bounded concurrency and per-child task limits in production.'),
    ]
    for t, role, why in rows:
        out.append('<tr><td><b>%s</b></td><td>%s</td><td>%s</td></tr>\n' % (t, role, why))
    out.append('</table>\n')

    # 5 Document pipeline
    out.append('<h1 class="section">5. Document Pipeline (OCR, PDF, QR)</h1>\n')
    out.append('<table>\n<tr><th>Technology</th><th>Role in the system</th><th>Why it was chosen</th></tr>\n')
    rows = [
        ('Tesseract OCR', 'Optical character recognition of scanned documents.',
         'Reads Bengali and English text (<code>TESSERACT_LANG=ben+eng</code>), e.g. for NID / '
         'supporting document processing.'),
        ('OpenCV + Pillow', 'Image preprocessing and manipulation.',
         'Improves OCR accuracy (deskew, denoise, contrast) and handles image uploads/crops.'),
        ('WeasyPrint', 'Server-side HTML &rarr; PDF rendering.',
         'Renders certificates, admit cards and reports to print-quality PDF from HTML/CSS templates '
         'with Bengali font support via Pango.'),
        ('qrcode', 'QR code generation for verifiable documents.',
         'Embedded in certificates/entry passes for authenticity checks.'),
        ('openpyxl', 'Excel import/export.',
         'Round-trip of batch/roster data with government-standard spreadsheet formats.'),
    ]
    for t, role, why in rows:
        out.append('<tr><td><b>%s</b></td><td>%s</td><td>%s</td></tr>\n' % (t, role, why))
    out.append('</table>\n')
    out.append('<div class="callout green"><b>Production note:</b> PDF/OCR heavy jobs run inside '
               'Celery workers (not the request path), keeping the API responsive during bulk '
               'certificate generation.</div>\n')

    # 6 Infrastructure
    out.append('<h1 class="section">6. Infrastructure &amp; Deployment</h1>\n')
    out.append('<h2>Containerised services (Docker Compose)</h2>\n')
    out.append('<table>\n<tr><th>Service</th><th>Image</th><th>Responsibility</th></tr>\n')
    rows = [
        ('<code>db</code>', 'postgres 16-alpine', 'Relational data store; healthchecked; bound to '
         '127.0.0.1 only in production; init script for DB/user creation.'),
        ('<code>redis</code>', 'redis 7-alpine', 'Cache + broker; AOF persistence; password-protected '
         'in production.'),
        ('<code>backend</code>', 'Django (Gunicorn)', 'Serves the DRF API and Django admin; runs as a '
         'read-only container with <code>tmpfs /tmp</code> in production.'),
        ('<code>celery_worker</code>', 'Django + Celery', 'Executes async jobs; bounded concurrency '
         '(<code>--concurrency=4 --max-tasks-per-child=1000</code>).'),
        ('<code>celery_beat</code>', 'Django + Celery Beat', 'Schedules recurring jobs from the '
         'database scheduler.'),
        ('<code>frontend</code>', 'node:20-alpine (Vite)', 'SPA dev/build; runs as a non-root user '
         '(<code>appuser</code>).'),
        ('<code>nginx</code>', 'nginx:1.25-alpine', 'TLS termination, rate limiting, static/media '
         'serving, SPA fallback routing.'),
    ]
    for t, role, why in rows:
        out.append('<tr><td><b>%s</b></td><td>%s</td><td>%s</td></tr>\n' % (t, role, why))
    out.append('</table>\n')
    out.append('<p class="small">Production hardening includes resource limits (CPU/memory), '
               '<code>cap_drop: ALL</code>, <code>read_only: true</code> root filesystems, image '
               'pinning, Docker healthchecks on all stateful services, and bounded JSON-file logging '
               'with rotation.</p>\n')
    out.append('<h2>Why this deployment model</h2>\n<ul>\n'
               '<li><b>Reproducibility</b> &mdash; identical environments from local laptops to the '
               'production server.</li>\n'
               '<li><b>Isolation</b> &mdash; each component is a separate process; workers can scale '
               'independently under load.</li>\n'
               '<li><b>Least privilege</b> &mdash; read-only filesystems, dropped capabilities and '
               'non-root users reduce the blast radius of a compromise.</li>\n'
               '</ul>\n')

    # 7 Security
    out.append('<h1 class="section">7. Security Architecture</h1>\n')
    out.append('<p>Security is applied in layers &mdash; network/edge (Nginx), application (Django/DRF), '
               'and client (React). Every layer is described below.</p>\n')

    out.append('<h2>7.1 Transport &amp; edge security (Nginx)</h2>\n<ul>\n'
               '<li><b>TLS only</b> &mdash; port 80 redirects to HTTPS; TLS 1.2/1.3 enforced, weak '
               'ciphers (<code>!aNULL:!MD5:!3DES:!RC4</code>) excluded, session cache configured.</li>\n'
               '<li><b>HSTS</b> &mdash; <code>Strict-Transport-Security: max-age=31536000; includeSubDomains; '
               'preload</code>.</li>\n'
               '<li><b>Security headers</b> &mdash; <code>X-Frame-Options: SAMEORIGIN</code>, '
               '<code>X-Content-Type-Options: nosniff</code>, <code>Referrer-Policy</code>, '
               '<code>Permissions-Policy</code> (camera/mic/geolocation blocked), and a strict '
               '<code>Content-Security-Policy</code> (scripts only from self; frame-ancestors self).</li>\n'
               '<li><b>Fingerprint reduction</b> &mdash; <code>server_tokens off</code> hides the Nginx '
               'version.</li>\n'
               '<li><b>Rate limiting</b> &mdash; per-IP zones per endpoint class: login/OTP 10&nbsp;r/m, '
               'admin 10&nbsp;r/m, public API 15&ndash;20&nbsp;r/m, general API 30&nbsp;r/m, all with '
               'burst allowances and a 429 response.</li>\n'
               '<li><b>Upload cap</b> &mdash; <code>client_max_body_size 20M</code> prevents oversized '
               'payloads.</li>\n'
               '<li><b>Docs disabled</b> &mdash; <code>/swagger/</code> and <code>/redoc/</code> return '
               '404 in production.</li>\n'
               '<li><b>Health endpoint restricted</b> &mdash; only reachable from loopback/private '
               'ranges.</li>\n'
               '</ul>\n')

    out.append('<h2>7.2 Application-layer security (Django / DRF)</h2>\n<ul>\n'
               '<li><b>JWT authentication</b> &mdash; Bearer access tokens (2-hour lifetime), refresh '
               'token rotation with blacklisting of old tokens (7-day refresh lifetime).</li>\n'
               '<li><b>Default deny</b> &mdash; DRF default permission is '
               '<code>IsAuthenticated</code>; public endpoints are explicit exceptions.</li>\n'
               '<li><b>Throttling</b> &mdash; per-user (1000/hour) and anonymous (100/hour) DRF '
               'throttles complement the Nginx rate limits.</li>\n'
               '<li><b>Production hardening block</b> &mdash; automatically enforced when '
               '<code>DJANGO_DEBUG=False</code>: HSTS, <code>SECURE_CONTENT_TYPE_NOSNIFF</code>, '
               'secure/HTTP-only session and CSRF cookies, and '
               '<code>SECURE_PROXY_SSL_HEADER</code> for correct schema detection behind Nginx.</li>\n'
               '<li><b>Secrets &amp; configuration</b> &mdash; <code>DJANGO_SECRET_KEY</code>, DB '
               'password and Redis password come from the environment (<code>.env</code>), never '
               'committed; Redis uses <code>--requirepass</code> in production.</li>\n'
               '<li><b>Audit trail</b> &mdash; <code>django-simple-history</code> records every model '
               'change; NID lookups are logged (<code>NIDAccessLog</code>) for accountability.</li>\n'
               '<li><b>Verified identity</b> &mdash; public registration verifies phone via OTP and '
               'validates NID through the national NID API before applications are accepted.</li>\n'
               '<li><b>CSRF/XSS defaults</b> &mdash; Django CSRF middleware active; security middleware '
               'enables <code>X-Content-Type-Options</code> and browser-XSS protection at the '
               'application layer as well.</li>\n'
               '</ul>\n')

    out.append('<h2>7.3 Client-side security (React)</h2>\n<ul>\n'
               '<li>All user-generated and rich-text content is sanitised with <b>DOMPurify</b> before '
               'rendering (defence-in-depth against XSS).</li>\n'
               '<li>Tokens are held in memory/session state and sent only via the Authorization header '
               'through Axios interceptors; no secrets are embedded in the bundle.</li>\n'
               '<li>The strict CSP header also restricts script sources to self, containing any '
               'client-side injection.</li>\n'
               '</ul>\n')

    out.append('<div class="callout"><b>Operational notes:</b> TLS certificates are mounted read-only '
               'into Nginx (<code>/etc/nginx/ssl</code>); the database port is not exposed to the '
               'public internet; the frontend runs as a non-root user; and deployments pin versions '
               'of every base image for supply-chain stability.</div>\n')

    # 8 Rationale summary
    out.append('<h1 class="section">8. Rationale Summary</h1>\n')
    out.append('<p>In short, the stack was chosen for <b>maturity, security and maintainability</b>:</p>\n')
    out.append('<table>\n<tr><th>Concern</th><th>Decision</th><th>Primary reason</th></tr>\n')
    rows = [
        ('Web framework', 'Django + DRF', 'LTS, security defaults, ORM/migrations, and a large '
         'ecosystem; rapid, safe delivery of 17 business modules.'),
        ('Client', 'React + Vite', 'Fast interactive SPA; excellent ecosystem for complex '
         'forms, tables and charts; fast tooling.'),
        ('Database', 'PostgreSQL', 'ACID integrity and unique-constraint enforcement for '
         'enrollment correctness.'),
        ('AuthN', 'JWT (SimpleJWT)', 'Stateless, works with SPA + mobile, with rotation and '
         'blacklisting for token theft mitigation.'),
        ('Async work', 'Celery + Redis', 'Keeps the API fast by offloading PDFs, notifications '
         'and scheduled reports.'),
        ('Documents', 'WeasyPrint + Tesseract + QRCode', 'Print-quality certificates/reports and '
         'Bengali+English OCR without licensed dependencies.'),
        ('Edge', 'Nginx', 'TLS, rate limiting and static serving in one hardened reverse proxy.'),
        ('Deployment', 'Docker Compose', 'Reproducible, isolated, least-privilege containers.'),
    ]
    for t, role, why in rows:
        out.append('<tr><td><b>%s</b></td><td>%s</td><td>%s</td></tr>\n' % (t, role, why))
    out.append('</table>\n')
    out.append('<p class="small">Technologies are selected only where they are already used in the '
               'repository (see <code>backend/requirements.txt</code>, '
               '<code>frontend/package.json</code>, <code>docker-compose.prod.yml</code> and '
               '<code>nginx/prod.conf</code>).</p>\n')

    out.append('</body>\n</html>\n')
    return ''.join(out)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(here, 'Technology_Stack_Documentation.html')
    pdf_path = os.path.join(here, 'Technology_Stack_Documentation.pdf')
    html = build_html()
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    from weasyprint import HTML
    HTML(html_path).write_pdf(pdf_path)
    print('Wrote', html_path)
    print('Wrote', pdf_path)


if __name__ == '__main__':
    main()
