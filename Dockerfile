# Precedent — single image, single origin.
#
# Stage 1 builds the React SPA. Stage 2 runs FastAPI and serves that build from
# the same origin, so there is no CORS surface for a judge to trip over.
#
# Layout matters: backend/app/main.py resolves the SPA as
#   <backend>/app/../../dist
# so the backend lives at /app/backend and the build at /app/dist.

# ---------- Stage 1: frontend build ----------
FROM node:20-alpine AS web

WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Tesseract for OCR; libgl1/libglib2.0-0 are required by OpenCV's runtime.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      tesseract-ocr \
      libgl1 \
      libglib2.0-0 \
      curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend
COPY --from=web /web/dist ./dist

# Non-root: the app only needs to write to the SQLite file and uploads dir.
RUN useradd --create-home --uid 10001 precedent \
 && mkdir -p /app/backend/uploads /data \
 && chown -R precedent:precedent /app /data
USER precedent

ENV DATABASE_URL="sqlite:////data/precedent.db" \
    UPLOADS_DIR="/app/backend/uploads" \
    TESSERACT_CMD="/usr/bin/tesseract" \
    OCR_LANGS="eng" \
    PYTHONPATH="/app/backend" \
    CORS_ORIGINS="http://localhost:8000"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

# Seeding is deliberately NOT part of the entrypoint: it clears data.
# Run it once with:  docker compose run --rm app python backend/seed.py
CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "/app/backend", "--host", "0.0.0.0", "--port", "8000"]
