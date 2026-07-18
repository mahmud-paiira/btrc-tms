# Deployment Guide — BRTC Training Management System

## Table of Contents

- [Deployment Options](#deployment-options)
- [Docker Deployment (Recommended)](#docker-deployment-recommended)
- [Server Deployment (Production)](#server-deployment-production)
- [Manual Deployment](#manual-deployment)
- [Production Configuration](#production-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [OCR in Production](#ocr-in-production)
- [Database Management](#database-management)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Deployment Options

| Method | Use Case | File | Complexity |
|--------|----------|------|------------|
| Docker Compose (dev) | Development / Staging | `docker-compose.yml` | Low |
| Docker Compose (prod) | Production — full stack | `docker-compose.prod.yml` | Medium |
| Docker Compose (server) | Production — server with shared network | `docker-compose.server.yml` | Medium |
| CI/CD + Docker | Automated build & push to GHCR | `.github/workflows/deploy.yml` | Low |
| Manual (no Docker) | When Docker isn't available | — | High |

### Architecture Overview

```
Production (server behind VPN):
┌─────────────────────────────────────────────────────┐
│  Nginx (external)                                   │
│    ├── /            → Frontend (React SPA, port 80) │
│    ├── /api/*       → Backend (Gunicorn, port 8000)  │
│    ├── /admin/*     → Backend (Django Admin)         │
│    ├── /swagger/*   → Backend (API Docs)             │
│    └── /static/     → Shared volume                  │
│    └── /media/      → Shared volume                  │
│                                                     │
│  Backend container (ghcr.io/dream71project/backend)  │
│    ├── Gunicorn (4 workers, 120s timeout)            │
│    ├── Tesseract OCR (Bengali + English)             │
│    └── WeasyPrint (PDF generation, SutonnyMJ font)   │
│                                                     │
│  Frontend container (ghcr.io/dream71project/frontend)│
│    ├── Nginx 1.25 (serves built SPA)                │
│    └── Static files mounted from shared volume       │
│                                                     │
│  Shared Network: btrc_network (external)             │
│    ├── PostgreSQL (db)                               │
│    └── Redis (redis)                                 │
└─────────────────────────────────────────────────────┘
```

---

## Docker Deployment (Recommended)

### Prerequisites

- Docker 24+ and Docker Compose v2+
- Git
- Domain name with DNS pointing to server (for production)
- SSL certificate (for production — auto-managed or manual)

### Quick Start (Development)

```bash
# Clone the repository
git clone https://github.com/dream71project/brtc-training.git project
cd project

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Start all services
docker compose up -d

# Run migrations
docker compose exec backend python manage.py migrate

# Ensure admin user exists
docker compose exec backend python manage.py ensure_admin

# Verify
curl http://localhost/api/health/
```

Services started:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `db` | postgres:15-alpine | 5432 | PostgreSQL database |
| `redis` | redis:7-alpine | 6379 | Cache & Celery broker |
| `backend` | Django + Gunicorn | 8000 | REST API |
| `celery_worker` | Celery worker | — | Async task processing |
| `frontend` | Vite dev server | 5173 | React SPA |
| `nginx` | nginx:1.25-alpine | 80 | Reverse proxy |

---

## Server Deployment (Production)

The production server uses a shared Docker network (`btrc_network`) where PostgreSQL and Redis are managed separately. The `docker-compose.server.yml` only manages the application containers.

### Server Directory Structure

```
/var/www/brtc/                          # or your deploy path
├── docker-compose.server.yml           # Application containers
├── .env                                # Environment variables
├── data/
│   ├── static/                         # Django collectstatic output
│   └── media/                          # User uploads
├── nginx/
│   └── frontend-internal.conf          # Frontend Nginx config
└── btrc_network                        # Shared Docker network (external)
```

### Deploying Updates

When CI/CD pushes new images to GHCR, update the server:

```bash
# SSH to server (or access via VPN)
cd /var/www/brtc

# Pull latest images
docker compose -f docker-compose.server.yml pull

# Restart backend (pulls new image)
docker compose -f docker-compose.server.yml up -d backend

# Restart frontend (pulls new image)
docker compose -f docker-compose.server.yml up -d frontend

# Run migrations (if model changes)
docker compose -f docker-compose.server.yml exec backend python manage.py migrate

# Ensure admin user exists
docker compose -f docker-compose.server.yml exec backend python manage.py ensure_admin

# Verify
curl http://localhost:8000/api/health/
```

### Server Container Details

| Service | Image | Container | Purpose |
|---------|-------|-----------|---------|
| `backend` | `ghcr.io/dream71project/backend:latest` | `brtc_backend` | Django + Gunicorn |
| `frontend` | `ghcr.io/dream71project/frontend:latest` | `brtc_frontend` | Nginx + React SPA |

Both containers connect to the shared `btrc_network` to reach PostgreSQL and Redis (managed externally).

### Enabling Celery (Optional)

Celery workers are available but commented out in `docker-compose.server.yml`. To enable:

```yaml
# Uncomment celery_worker and celery_beat sections in docker-compose.server.yml
# Then restart:
docker compose -f docker-compose.server.yml up -d
```

---

## Manual Deployment (No Docker)

### Backend (Ubuntu/Debian)

```bash
# System dependencies
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip
sudo apt install -y postgresql redis-server
sudo apt install -y nginx
sudo apt install -y tesseract-ocr tesseract-ocr-ben
sudo apt install -y libpq-dev libpango-1.0-0 libpangocairo-1.0-0 libcairo2
sudo apt install -y libgdk-pixbuf-2.0-0 libffi-dev libglib2.0-0
sudo apt install -y build-essential

# Clone project
git clone https://github.com/dream71project/brtc-training.git /var/www/brtc
cd /var/www/brtc/backend

# Python virtual environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Configure PostgreSQL
sudo -u postgres createuser brtc_user -P
sudo -u postgres createdb brtc_tms -O brtc_user

# Configure environment
cp ../.env.example .env
# Edit .env with production values (see Production Configuration section)

# Migrate & collectstatic
python manage.py migrate
python manage.py ensure_admin
python manage.py collectstatic --noinput
```

### Gunicorn Systemd Service

```ini
# /etc/systemd/system/brtc-backend.service
[Unit]
Description=BRTC TMS Backend (Gunicorn)
After=network.target postgresql.service redis-server.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/brtc/backend
EnvironmentFile=/var/www/brtc/backend/.env
ExecStart=/var/www/brtc/backend/venv/bin/gunicorn \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile /var/log/brtc/access.log \
    --error-logfile /var/log/brtc/error.log \
    brtc_tms.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable brtc-backend
sudo systemctl start brtc-backend
```

### Frontend

```bash
cd /var/www/brtc/frontend

# Install Node.js 18+ (via nvm or nodesource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Build
npm ci
npm run build

# The built files will be in dist/ — serve via nginx
```

### Celery Systemd Service

```ini
# /etc/systemd/system/brtc-celery.service
[Unit]
Description=BRTC TMS Celery Worker
After=redis-server.service

[Service]
User=www-data
WorkingDirectory=/var/www/brtc/backend
EnvironmentFile=/var/www/brtc/backend/.env
ExecStart=/var/www/brtc/backend/venv/bin/celery \
    -A brtc_tms worker \
    -l info \
    --concurrency=4 \
    --max-tasks-per-child=1000
Restart=always

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/brtc
server {
    listen 80;
    server_name training.brtc.gov.bd;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name training.brtc.gov.bd;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;
    gzip_min_length 1000;

    client_max_body_size 20M;

    # Static files (from Django collectstatic)
    location /static/ {
        alias /var/www/brtc/backend/staticfiles/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Media files (user uploads)
    location /media/ {
        alias /var/www/brtc/backend/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # API and admin
    location ~ ^/(api|admin|swagger|redoc)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend SPA
    location / {
        root /var/www/brtc/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /api/health/ {
        access_log off;
        allow 127.0.0.1;
        allow 172.0.0.0/8;
        deny all;
        proxy_pass http://127.0.0.1:8000/api/health/;
    }
}
```

---

## Production Configuration

### Security Checklist

- [ ] `DJANGO_DEBUG=False`
- [ ] Strong `DJANGO_SECRET_KEY` (64+ random chars)
- [ ] PostgreSQL password (not default)
- [ ] Redis password set
- [ ] HTTPS enabled (TLS 1.2+)
- [ ] `CORS_ALLOWED_ORIGINS` set to exact domain(s)
- [ ] `DJANGO_ALLOWED_HOSTS` set to exact domain(s)
- [ ] Non-root user for backend process
- [ ] Database port not exposed to internet
- [ ] File upload size limits configured (`client_max_body_size 20M` in Nginx)
- [ ] Rate limiting enabled (default: 100/hr anonymous, 1000/hr authenticated)
- [ ] Regular backups configured

### Environment Variables in Production

All configurable via `.env` file:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | Yes | — | Django secret key |
| `DJANGO_DEBUG` | Yes | `False` | Must be `False` in production |
| `DJANGO_ALLOWED_HOSTS` | Yes | — | Comma-separated allowed hosts |
| `DB_NAME` | Yes | `brtc_tms` | PostgreSQL database name |
| `DB_USER` | Yes | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host (use `db` in Docker) |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `CELERY_BROKER_URL` | Yes | — | Redis URL for Celery broker |
| `CELERY_RESULT_BACKEND` | Yes | — | Redis URL for Celery results |
| `CORS_ALLOWED_ORIGINS` | Yes | — | Comma-separated allowed origins |
| `REDIS_PASSWORD` | For Redis | — | Redis auth password |
| `EMAIL_HOST_USER` | For email | — | SMTP username |
| `EMAIL_HOST_PASSWORD` | For email | — | SMTP password |
| `TESSERACT_PATH` | For OCR | `/usr/bin/tesseract` | Path to tesseract binary |
| `TESSERACT_LANG` | For OCR | `ben+eng` | OCR languages |

Generate a secret key:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Head Office Admin | `admin@brtc.gov.bd` | `admin123` |
| Center Admin | `center{code}@brtc.gov.bd` | `center@123` |
| Trainer | (created via import) | `trainer@123` |
| Trainee | (created via registration) | `trainee123` |

Center admin users are auto-created when centers are imported or created. The `ensure_admin` management command ensures the admin user exists:

```bash
# Create admin if missing
python manage.py ensure_admin

# Force reset admin password
python manage.py ensure_admin --force
```

### Performance Tuning

**Gunicorn:**
```bash
# Formula: (2 × CPU cores) + 1
--workers=4
--timeout=120
```

**Celery:**
```bash
--concurrency=4
--max-tasks-per-child=1000
```

**PostgreSQL (in `postgres.conf` or docker-compose):**
```
shared_buffers = 256MB           # 25% of RAM
effective_cache_size = 768MB     # 75% of RAM
work_mem = 8MB                   # Per-operation memory
maintenance_work_mem = 64MB      # For VACUUM, CREATE INDEX
```

**Nginx Worker Processes:**
```nginx
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
client_max_body_size 20M;        # Match Django's DATA_UPLOAD_MAX_MEMORY_SIZE
```

### Production Dockerfiles

**Backend (`backend/Dockerfile.prod`):**

Multi-stage build with Python 3.11-slim:

```
Stage 1 (builder):
  - Install build tools + libpq-dev
  - pip wheel requirements.txt

Stage 2 (runtime):
  - System deps: libpq, pango/pangocairo (WeasyPrint), gdk-pixbuf,
    libffi, libglib, tesseract-ocr, tesseract-ocr-ben, libgl1
  - Install Python wheels from builder
  - COPY application code
  - collectstatic
  - Run as non-root 'django' user (UID 1000)
  - Gunicorn (4 workers, 120s timeout)
  - Health check: /api/health/ every 30s
```

**Frontend (`frontend/Dockerfile.prod`):**

Two-stage build:

```
Stage 1 (builder):
  - Node 18-alpine
  - npm install → npm run build

Stage 2 (runtime):
  - Nginx 1.25-alpine
  - Timezone: Asia/Dhaka
  - Copy dist/ to nginx html directory
  - Copy nginx/prod.conf as default config
  - Health check: curl localhost every 30s
```

---

## CI/CD Pipeline

### Overview

The CI/CD pipeline uses GitHub Actions to build Docker images and push them to GitHub Container Registry (GHCR). The server then pulls these images manually or via a deployment script.

### GitHub Actions Workflow

File: `.github/workflows/deploy.yml`

```
Trigger: Push to 'deploy' branch (or manual workflow_dispatch)
    │
    ├── build-backend ──→ Build Docker image → Push to ghcr.io/dream71project/backend:latest
    │
    └── build-frontend ──→ Build Docker image → Push to ghcr.io/dream71project/frontend:latest
```

The two jobs run **in parallel** — there are no test jobs or deployment steps. The pipeline only builds and pushes.

### Pipeline Details

**1. `build-backend`**
- Runs on: `ubuntu-latest`
- Uses Docker Buildx with GitHub Actions cache (`type=gha`)
- Builds from: `backend/Dockerfile.prod`
- Pushes to: `ghcr.io/dream71project/backend:latest`

**2. `build-frontend`**
- Runs on: `ubuntu-latest`
- Uses Docker Buildx with GitHub Actions cache (`type=gha`)
- Builds from: `frontend/Dockerfile.prod`
- Context: `.` (root — needed for nginx config)
- Pushes to: `ghcr.io/dream71project/frontend:latest`

### Triggering a Build

```bash
# Push to deploy branch triggers the pipeline
git push dream71 deploy

# Or use GitHub Actions manual dispatch
gh workflow run deploy.yml --ref deploy
```

### Post-Build: Server Deployment

The CI/CD does NOT automatically deploy to the server. After images are pushed:

```bash
# On the production server
cd /var/www/brtc

# Pull new images
docker compose -f docker-compose.server.yml pull

# Restart containers
docker compose -f docker-compose.server.yml up -d

# Run migrations if needed
docker compose -f docker-compose.server.yml exec backend python manage.py migrate

# Ensure admin user
docker compose -f docker-compose.server.yml exec backend python manage.py ensure_admin
```

### Image Registry

| Image | Registry Path | Tag |
|-------|--------------|-----|
| Backend | `ghcr.io/dream71project/backend` | `latest` |
| Frontend | `ghcr.io/dream71project/frontend` | `latest` |

> **Note:** Only the `latest` tag is used. There is no versioned tagging.

### Docker Compose Files

| File | Purpose | Builds from | Pulls from |
|------|---------|-------------|------------|
| `docker-compose.yml` | Local development | Local Dockerfiles | — |
| `docker-compose.prod.yml` | Full production stack | Local Dockerfiles | — |
| `docker-compose.server.yml` | Server (shared network) | — | GHCR |

---

## OCR in Production

### Tesseract Installation

**Docker (included in backend Dockerfile.prod):**
```dockerfile
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-ben \
    && rm -rf /var/lib/apt/lists/*
```

**Manual (Ubuntu/Debian):**
```bash
sudo apt install -y tesseract-ocr tesseract-ocr-ben
```

**Verify installation:**
```bash
tesseract --version
tesseract --list-langs | grep ben
```

### OCR Configuration

```bash
# In .env
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANG=ben+eng
```

- Docker: Tesseract is at `/usr/bin/tesseract` by default
- Windows: `C:\Program Files\Tesseract-OCR\tesseract.exe`

### Bengali Tesseract Data Download

```bash
# Via Django admin endpoint
curl -X POST https://training.brtc.gov.bd/api/admin/download-ben-data/

# Manual download
wget https://github.com/tesseract-ocr/tessdata/raw/main/ben.traineddata \
  -O /usr/share/tesseract-ocr/5/tessdata/ben.traineddata
```

### OCR Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| Image upload size | Limit to 5MB in Nginx + Django (`DATA_UPLOAD_MAX_MEMORY_SIZE=10485760`) |
| Processing time | NID extraction takes 2-5 seconds |
| Concurrent requests | Celery for high-volume OCR (not yet implemented) |
| Storage | Old processed images cleaned via cron |
| Tesseract crashes | pytesseract wraps exceptions gracefully |
| Low confidence | Manual review fallback for < 60% confidence |

### OCR Admin Pages

- `/admin/ocr-status/` — View Tesseract status, version, Bengali data availability
- `/admin/ocr-test/` — Upload an NID image and test OCR extraction

---

## Database Management

### Migrations

```bash
# Create new migration after model changes
docker compose exec backend python manage.py makemigrations

# Apply migrations
docker compose exec backend python manage.py migrate

# Show migration status
docker compose exec backend python manage.py showmigrations

# Rollback one migration
docker compose exec backend python manage.py migrate <app_name> <previous_migration>
```

### Backup

```bash
# Manual backup
pg_dump -U postgres brtc_tms > brtc_tms_backup.sql

# Via Docker
docker compose exec db pg_dump -U postgres brtc_tms | gzip > backup_$(date +%Y%m%d).sql.gz

# Automated backup script
./scripts/backup.sh
```

A full database backup exists at `brtc_tms_backup.sql` in the project root.

### Restore

```bash
# From backup file
psql -U postgres brtc_tms < brtc_tms_backup.sql

# From gzipped backup
gunzip -c backup_20260101.sql.gz | docker compose exec -T db psql -U postgres brtc_tms
```

### Data Migration (to new server)

```bash
# On old server
pg_dump -U postgres -h localhost brtc_tms > dump.sql

# Transfer file
scp dump.sql user@new-server:/tmp/

# On new server
psql -U postgres brtc_tms < /tmp/dump.sql
```

### Management Commands

```bash
# Ensure admin user exists
python manage.py ensure_admin

# Force reset admin password
python manage.py ensure_admin --force

# OCR test
python manage.py test_ocr
python manage.py test_ocr --image=path/to/nid.jpg
```

---

## Monitoring & Maintenance

### Health Check

| Endpoint | Method | Response |
|----------|--------|----------|
| `GET /api/health/` | GET | `{"status": "ok"}` |

### Logging

**Docker logs:**
```bash
# All services
docker compose -f docker-compose.server.yml logs -f

# Backend only
docker compose -f docker-compose.server.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.server.yml logs --tail=100 backend
```

Docker logging is configured with rotation:
```yaml
logging:
  driver: json-file
  options:
    max-size: 10m
    max-file: 3
```

### Container Status

```bash
# Check running containers
docker compose -f docker-compose.server.yml ps

# Check resource usage
docker stats --no-stream
```

### Regular Maintenance Tasks

| Frequency | Task | Command |
|-----------|------|---------|
| Daily | Database backup | `pg_dump -U postgres brtc_tms > backup_$(date +%Y%m%d).sql` |
| Weekly | Clear old logs | `docker system prune -f` |
| Monthly | Review error logs | `docker compose logs --since 30d backend \| grep ERROR` |
| Monthly | Django system check | `python manage.py check --deploy` |
| As needed | Clear Redis cache | `docker compose exec redis redis-cli FLUSHALL` |
| As needed | Rebuild Docker images | `docker compose -f docker-compose.server.yml pull && up -d` |

### Scaling

For high-traffic deployments:

1. **Scale backend horizontally:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --scale backend=4
   ```

2. **Database connection pooling:** Add PgBouncer between backend and PostgreSQL

3. **CDN for static/media files:** Serve `static/` and `media/` from CDN

4. **Redis Sentinel/Cluster:** For high-availability Redis

---

## Troubleshooting

### Common Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| `Connection refused` to DB | PostgreSQL not started or wrong host | Check `DB_HOST` in `.env`; if Docker, use `db` not `localhost` |
| `ModuleNotFoundError` | Missing Python deps | `pip install -r requirements.txt` |
| Static files 404 | `collectstatic` not run | `python manage.py collectstatic --noinput` |
| CORS errors in browser | Wrong `CORS_ALLOWED_ORIGINS` | Set to exact frontend URL |
| 502 Bad Gateway | Backend not running | `docker compose ps backend` then check logs |
| 413 Request Entity Too Large | File upload exceeds limit | Increase `client_max_body_size` in nginx |
| Celery tasks not executing | Redis not reachable | Check `CELERY_BROKER_URL` |
| JWT token invalid | Clock skew | Sync server time with NTP |
| Permission denied on media | Wrong ownership | `chown -R 1000:1000 data/media/` |
| OCR returning gibberish | Bengali tessdata missing | Install `tesseract-ocr-ben` package |
| Login 500 error | Backend crash or import error | Check `docker compose logs backend` for traceback |
| Admin user deleted | Admin not in database | Run `python manage.py ensure_admin` |
| Server can't find GHCR image | Not logged in or network issue | `docker login ghcr.io` with valid token |
| Bengali digits not converting | `apps.common` module missing | Ensure `apps/common/utils.py` and `apps/common/__init__.py` exist |

### Health Check Reference

A healthy system returns from `GET /api/health/`:

```json
{"status": "ok"}
```

### Viewing Error Logs

```bash
# Backend error logs
docker compose -f docker-compose.server.yml logs backend 2>&1 | grep -i error

# Django traceback (if DEBUG=True temporarily)
docker compose -f docker-compose.server.yml exec backend python manage.py shell

# Nginx error logs
docker compose -f docker-compose.server.yml logs nginx 2>&1 | grep error
```

### Getting Help

- Check Docker logs: `docker compose logs -f <service>`
- Check Django error logs: `docker compose logs backend | grep ERROR`
- Check nginx error logs: `docker compose logs nginx | grep error`
- Run Django system check: `python manage.py check --deploy`
- Verify environment: `docker compose exec backend env | grep DJANGO`
- Health check: `curl https://training.brtc.gov.bd/api/health/`
