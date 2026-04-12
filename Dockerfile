# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build

COPY services/router-agent/requirements.txt ./requirements.txt

RUN python -m venv /opt/venv \
 && /opt/venv/bin/pip install --upgrade pip \
 && /opt/venv/bin/pip install -r requirements.txt

FROM python:3.12-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    ROUTER_HOST=0.0.0.0 \
    ROUTER_PORT=8001 \
    ROUTER_MODEL_PATH=app/ml/model.pkl \
    ROUTER_LOG_LEVEL=INFO

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY services/router-agent/ /app/

RUN addgroup --system appgroup \
 && adduser --system --ingroup appgroup appuser \
 && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8001

CMD ["sh", "-c", "export ROUTER_PORT=\"${PORT:-${ROUTER_PORT:-8001}}\" && exec uvicorn app.main:app --host \"${ROUTER_HOST}\" --port \"${ROUTER_PORT}\" --workers 1"]
