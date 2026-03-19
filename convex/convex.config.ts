import { defineApp } from 'convex/server'
import agent from '@convex-dev/agent/convex.config'
import rag from '@convex-dev/rag/convex.config.js'
import rateLimiter from '@convex-dev/rate-limiter/convex.config.js'
import stripe from '@convex-dev/stripe/convex.config.js'

const app = defineApp()
app.use(agent)
app.use(rag)
app.use(rateLimiter)
app.use(stripe)

export default app
