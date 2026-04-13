# Sandbox Server

Custom Node.js server that executes small JavaScript snippets using `vm2`.

## Run

```bash
pnpm --filter sandbox-server install
pnpm --filter sandbox-server run dev
```

Server URL:

```txt
http://localhost:8787/api/execute
```

## Request

```json
{
  "code": "return Math.sqrt(16)"
}
```

## Response

```json
{
  "success": true,
  "result": 4
}
```
