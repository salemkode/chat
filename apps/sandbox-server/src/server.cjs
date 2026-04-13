const http = require('node:http')
const { VM } = require('vm2')

const PORT = Number(process.env.PORT ?? 8787)
const EXECUTION_TIMEOUT_MS = Number(process.env.SANDBOX_TIMEOUT_MS ?? 1000)
const MAX_CODE_LENGTH = Number(process.env.SANDBOX_MAX_CODE_LENGTH ?? 500)
const MAX_BODY_BYTES = Number(process.env.SANDBOX_MAX_BODY_BYTES ?? 8192)

const BLOCKED_PATTERNS = [
  /\brequire\b/,
  /\bprocess\b/,
  /\bglobal(?:This)?\b/,
  /\bwhile\s*\(\s*true\s*\)/,
  /\bfor\s*\(\s*;\s*;\s*\)/,
  /\beval\b/,
  /\bFunction\b/,
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\bimport\s*\(/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
]

function jsonResponse(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  res.end(JSON.stringify(body))
}

function normalizeSuccess(result) {
  return {
    success: true,
    result: result ?? null,
  }
}

function normalizeError(error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  }
}

function validate(code) {
  if (typeof code !== 'string') {
    return { ok: false, reason: 'Code must be a string' }
  }

  if (!code.trim()) {
    return { ok: false, reason: 'Code must not be empty' }
  }

  if (code.length > MAX_CODE_LENGTH) {
    return { ok: false, reason: `Code exceeds ${MAX_CODE_LENGTH} characters` }
  }

  const blockedMatch = BLOCKED_PATTERNS.find((pattern) => pattern.test(code))
  if (blockedMatch) {
    return { ok: false, reason: 'Code contains blocked keywords or patterns' }
  }

  return { ok: true }
}

function run(code) {
  const vm = new VM({
    timeout: EXECUTION_TIMEOUT_MS,
    allowAsync: false,
    eval: false,
    wasm: false,
    sandbox: {
      Math,
      Number,
      String,
      Boolean,
      Array,
      Object,
      JSON,
      Date,
    },
  })

  const wrappedCode = `
    (function () {
      "use strict";
      ${code}
    })()
  `

  return vm.run(wrappedCode)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    let raw = ''

    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes`))
        req.destroy()
        return
      }
      raw += chunk.toString('utf8')
    })

    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })

    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (url.pathname !== '/api/execute') {
    jsonResponse(res, 404, normalizeError(new Error('Not found')))
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    res.end()
    return
  }

  if (req.method !== 'POST') {
    jsonResponse(res, 405, normalizeError(new Error('Method not allowed')))
    return
  }

  let payload
  try {
    payload = await readJsonBody(req)
  } catch (error) {
    jsonResponse(res, 400, normalizeError(error))
    return
  }

  const code = payload?.code
  const validation = validate(code)
  if (!validation.ok) {
    jsonResponse(res, 400, normalizeError(new Error(validation.reason)))
    return
  }

  try {
    const result = run(code)
    jsonResponse(res, 200, normalizeSuccess(result))
  } catch (error) {
    jsonResponse(res, 400, normalizeError(error))
  }
})

server.listen(PORT, () => {
  console.log(`Sandbox server listening on http://localhost:${PORT}`)
})
