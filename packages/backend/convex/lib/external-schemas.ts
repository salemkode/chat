/**
 * Runtime validation schemas for data that crosses a trust boundary.
 *
 * Why this file exists (the one rule to remember):
 *   Convex function args/returns use `v.*` validators — those are the database
 *   and function contract layer and CANNOT be replaced by zod. But whenever the
 *   backend calls an EXTERNAL service (OAuth providers, the Python model router,
 *   OpenAI voice, the router health/admin endpoints), the response is untrusted
 *   `unknown`. Previously each call site did `(await res.json()) as { ... }`,
 *   which is an unchecked cast — it compiles but validates nothing at runtime.
 *
 *   Here we define one zod schema per external response and `.parse()` it, so the
 *   shape is actually checked before any field is read. The business logic that
 *   follows (e.g. "missing access_token → throw") stays identical.
 */

import { z } from 'zod'

/** Shared OAuth token-exchange response shape (GitHub + Google are identical here). */
export const oauthTokenResponseSchema = z
  .object({
    access_token: z.string().optional(),
    refresh_token: z.string().optional(),
    expires_in: z.number().optional(),
    scope: z.string().optional(),
  })
  .passthrough()

/** GitHub `/user` profile (only the fields we consume). */
export const githubUserProfileSchema = z
  .object({
    id: z.number().optional(),
    login: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough()

/** Google `/oauth2/v3/userinfo` profile (only the fields we consume). */
export const googleUserProfileSchema = z
  .object({
    sub: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough()

/** Python model-router selection response: `{ model: "..." }`. */
export const routerSelectionResponseSchema = z
  .object({
    model: z.string().optional(),
  })
  .passthrough()

/** OpenAI Whisper transcription response. */
export const voiceTranscriptionResponseSchema = z
  .object({
    text: z.string().optional(),
    language: z.string().optional(),
  })
  .passthrough()

/** Router `/health` response. */
export const routerHealthResponseSchema = z
  .object({
    status: z.string().optional(),
  })
  .passthrough()

/** Router `/capabilities` response. */
export const routerCapabilitiesResponseSchema = z
  .object({
    contract: z.string().optional(),
  })
  .passthrough()

/** Router `/models` response — structural check only (values are `unknown`). */
export const routerModelsResponseSchema = z
  .object({
    version: z.unknown().optional(),
    count: z.unknown().optional(),
    models: z.unknown().optional(),
  })
  .passthrough()

/** Per-model studio profile inside the model-scoring response. */
const studioProfileSchema = z
  .object({
    auto_score: z.number().optional(),
    category: z
      .enum([
        'Best default',
        'Coding',
        'Vision',
        'Long context',
        'Fast',
        'Budget',
        'Reasoning',
        'Needs metadata',
      ])
      .optional(),
    quality_score: z.number().optional(),
    speed_score: z.number().optional(),
    cost_score: z.number().optional(),
    context_score: z.number().optional(),
    routing_tags: z.array(z.string()).optional(),
    reasons: z.array(z.string()).optional(),
  })
  .passthrough()

/** Model-scoring service response. */
export const modelScoringResponseSchema = z
  .object({
    models: z
      .array(
        z
          .object({
            name: z.string().optional(),
            studio_profile: studioProfileSchema.optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough()
