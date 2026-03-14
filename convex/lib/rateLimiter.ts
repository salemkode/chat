import { RateLimiter } from '@convex-dev/rate-limiter'
import { components } from '../_generated/api'

export const rateLimiter = new RateLimiter(components.rateLimiter, {})
