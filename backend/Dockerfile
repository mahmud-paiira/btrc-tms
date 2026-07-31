FROM python:3.11-slim

WORKDIR /app

# System deps for WeasyPrint, OpenCV, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libcairo2 \
    tesseract-ocr \
    tesseract-ocr-ben \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser --gid 1000 && \
    useradd -r -g appuser --uid 1000 --no-create-home appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Media dir writable by appuser
RUN mkdir -p /app/media /app/staticfiles && \
    chown -R appuser:appuser /app/media /app/staticfiles

EXPOSE 8000

USER appuser

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "brtc_tms.wsgi:application", "--workers", "2", "--timeout", "120"]
