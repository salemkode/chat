# Router Agent

Standalone FastAPI service for choosing the best model name from an externally managed model registry.

## Run

Create a virtual environment, install dependencies, and start the service:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1
```

Required environment variables:

```bash
export ROUTER_API_KEY="replace-me"
```

Optional environment variables:

```bash
export ROUTER_HOST="0.0.0.0"
export ROUTER_PORT="8001"
export ROUTER_MODEL_PATH="app/ml/model.pkl"
export ROUTER_LOG_LEVEL="INFO"
```

## Train the Initial ML Artifact

```bash
python app/ml/train.py
```

This reads [seed_dataset.jsonl](/Users/salmshmakh/Projects/chat/services/router-agent/app/ml/seed_dataset.jsonl) and writes [model.pkl](/Users/salmshmakh/Projects/chat/services/router-agent/app/ml/model.pkl).

## API

Health:

```bash
curl http://127.0.0.1:8001/healthz
curl http://127.0.0.1:8001/readyz
```

Update models:

```bash
curl -X POST http://127.0.0.1:8001/models/update \
  -H "Authorization: Bearer $ROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "models": [
      {
        "name": "gpt-4o-mini",
        "intelligence": 0.8,
        "price": 0.4,
        "speed": 0.7,
        "latency": 0.5,
        "task_scores": {
          "general": 0.75,
          "code": 0.8,
          "math": 0.65,
          "analysis": 0.7
        },
        "max_context_tokens": 128000,
        "supports_tools": true
      }
    ]
  }'
```

List models:

```bash
curl http://127.0.0.1:8001/models \
  -H "Authorization: Bearer $ROUTER_API_KEY"
```

Route a request:

```bash
curl -X POST http://127.0.0.1:8001/route \
  -H "Authorization: Bearer $ROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Help me optimize this Python function"
      }
    ],
    "user": {
      "preference": "balanced"
    }
  }'
```

## Test

```bash
PYTHONPATH=. pytest tests
```
