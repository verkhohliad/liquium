import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { dealRoutes } from './routes/deals'
import { depositRoutes } from './routes/deposits'
import { rewardRoutes } from './routes/rewards'
import { analyticsRoutes } from './routes/analytics'
import { adminRoutes } from './routes/admin'
import { startIndexer } from './services/indexer.service'
import { logger } from './utils/logger'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/deals', dealRoutes)
app.use('/api/deposits', depositRoutes)
app.use('/api/rewards', rewardRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/admin', adminRoutes)

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Liquium API server running on port ${PORT}`)
  logger.info(`📊 Health check: http://localhost:${PORT}/health`)

  // Start event indexer
  if (process.env.ENABLE_INDEXER === 'true') {
    logger.info('🔍 Starting event indexer...')
    startIndexer().catch((err) => {
      logger.error('Failed to start indexer:', err)
    })
  }
})

export default app
