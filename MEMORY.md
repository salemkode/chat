# AI Agent Memory System Rules

## Overview

The memory system provides persistent knowledge storage and retrieval for AI agents. It enables cross-session continuity and knowledge accumulation over time.

## Core Principles

### What to Store

✅ **Project-specific knowledge**: Technical decisions, patterns, and conventions
✅ **Domain concepts**: Business rules and terminology
✅ **Common solutions**: Reusable patterns and best practices
✅ **Important context**: Configuration and setup requirements
✅ **Debugging info**: Transient operational details (when needed)

❌ **What NOT to store**:

- Temporary debugging information
- Large code blocks (use file references instead)
- API keys or secrets
- Real-time state changes
- User PII or sensitive data
- Duplicate information

### Entry Structure

**Primary File** (`MEMORY.md`):

- Quick overview and navigation
- Links to detailed files

**Detailed Files** (`memory/*.md`):

- Domain-specific knowledge files
- Technical decisions
- Coding standards
- API documentation
- Troubleshooting guides

## File Organization

```
workspace/
├── MEMORY.md          # Primary memory file
└── memory/            # Detailed knowledge files
    ├── project-info.md       # Project overview and goals
    ├── conventions.md       # Coding standards and patterns
    ├── decisions.md       # Technical decisions made
    ├── api-docs.md      # API documentation
    └── troubleshooting.md  # Common issues and solutions
```

### Entry Format

````markdown
## [Title]

**Context:** When/where this information applies

**Relevance:** Who should read this and when

**Content:**

- Clear, self-contained documentation
- Examples with code blocks
- Practical guidelines
- Key points and best practices

**Structure:**

- Headers (##, ###)
- Bullet points with nested lists
- Code blocks with syntax highlighting
- Examples with proper formatting
- Sections for different topics

**Last Updated:** [Date]

## Writing Best Practices

### 1. Be Specific and Clear

✅ **Good:**

```markdown
# Authentication

The authentication uses JWT tokens with 24h expiration.

**Bad:**
Authentication is secure and fast.
```
````

❌ **Avoid:**

```markdown
# Auth

The auth system uses JWT tokens.
```

### 2. Provide Context

✅ **Good:**

```markdown
## API Endpoint Structure

Base URL: /api/v1
• POST /api/v1/auth/login
• POST /api/v1/auth/refresh
• GET /api/v1/user/profile

Response format:
{
"success": true,
"token": "eyJhb...",
"expiresAt": 17356896070000
}
```

````

**❌ **Avoid:**
```markdown
API returns unstructured data.
````

### 3. Use Code Blocks

✅ **Good:**

```typescript
// Add a new user
async function addUser(user: CreateUserRequest) {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(user),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.json()
}
```

**❌ **Avoid:\*\*

```typescript
// Unclear error handling
async function addUser(user: CreateUserRequest) {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(user),
  })

  const result = await response.json()

  console.log(result) // No error check!
}
```

### 4. Include Examples

✅ **Good:**

````markdown
# API Documentation

## Authentication Endpoints

### POST /api/v1/auth/login

Authenticate user with email and password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```
````

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInRrXyJ...", // 24h expiration
  "user": {
    "id": "user_abc123",
    "name": "John Doe",
    "role": "admin",
    "permissions": ["read", "write", "delete"]
  }
}
```

### GET /api/v1/user/profile

Get current user profile and permissions.

**Response:**

```json
{
  "user": {
    "id": "user_abc123",
    "name": "John Doe",
    "role": "admin",
    "permissions": ["read", "write", "delete"]
  }
}
```

## Error Handling

✅ **Good:**

```typescript
// Proper error handling
async function fetchUserProfile(token: string) {
  const response = await fetch('/api/v1/user/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.json()
}

// Logging for debugging
  console.log('Fetching user profile:', response.status)
}
```

❌ **Avoid:**

```typescript
// Silent errors
async function fetchUserProfile(token: string) {
  const response = await fetch('/api/v1/user/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const result = await response.json()

  console.log(result) // Missing error handling
}
```

## 5. Security Best Practices

### Authentication

✅ **Do:**

- Use HTTPS in production
- Validate JWT signatures
- Use short-lived tokens (24h recommended)
- Implement refresh logic
- Store tokens securely

❌ **Do NOT**

- Log tokens to console
- Store tokens in plain text files
- Include tokens in commit history
- Send tokens in query params

### Token Management

✅ **Good:**

```typescript
// Token refresh logic
async function refreshToken(token: string) {
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Token refresh failed')
  }

  const data = await response.json()

  // Update stored token
  localStorage.setItem('auth_token', data.token)
  localStorage.setItem('auth_expires', data.expiresAt)

  return data.token
}
```

**❌ **Avoid:\*\*

```typescript
// No expiration tracking
async function refreshToken(token: string) {
  const response = await fetch('/api/v1/auth/refresh', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const result = await response.json()

  return result.token
}
```

## Data Format

✅ **Good:**

```typescript
// Consistent response structure
interface AuthResponse {
  success: boolean
  token: string
  user: {
    id: string
    name: string
    email: string
    role: 'user' | 'admin'
    permissions: string[]
    expiresAt: number
  }
}
```

**❌ **Avoid:\*\*

```typescript
// Inconsistent types
interface AuthResponse {
  success: boolean
  token: string
  data: any
  userInfo: {
    id?: string
    name?: string
    permissions?: any
  }
}
```

## Conclusion

The authentication system is JWT-based with 24h token expiration. All responses follow the same consistent structure. Error handling is implemented throughout the codebase. Tokens are securely stored and managed.
