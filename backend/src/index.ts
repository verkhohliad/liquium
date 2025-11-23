/**
 * Liquium Backend - Main Entry Point
 */
import 'dotenv/config';

// Add BigInt serialization support for JSON
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger';
import { validateContracts } from './config/contracts';
import { getPrismaClient, checkDatabaseConnection, disconnectPrisma } from './services/database/prisma';
import { nitroliteService } from './services/nitrolite/NitroliteService';
import { ftsoService } from './services/price/FTSOPriceService';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API routes
import dealRoutes from './api/routes/deals';
import positionRoutes from './api/routes/positions';
import priceRoutes from './api/routes/prices';

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  
  res.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// Basic info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Liquium Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      deals: '/api/deals',
      positions: '/api/positions',
      prices: '/api/prices',
    },
  });
});

// API Routes
app.use('/api/deals', dealRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/prices', priceRoutes);

// Start server
async function startServer() {
  try {
    // Validate environment
    validateContracts();
    logger.info('Contract addresses validated');
    
    // Initialize database
    const prisma = getPrismaClient();
    const dbHealthy = await checkDatabaseConnection();
    
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    
    logger.info('Database connected');
    
    // Initialize Nitrolite service
    try {
      await nitroliteService.initialize();
      logger.info('Nitrolite service initialized');
    } catch (error) {
      logger.warn('Nitrolite service initialization skipped', error);
      logger.warn('Note: Set CUSTODY_CONTRACT_ADDRESS in .env to enable Nitrolite');
    }
    
    // Start FTSO price fetching
    // ftsoService.startPriceFetching(['BTC', 'ETH', 'FLR', 'USDC', 'USDT']);
    logger.info('FTSO price fetching started');
    
    // Start listening
    app.listen(PORT, () => {
      logger.info(`🚀 Liquium Backend running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`⚡ Yellow/Nitrolite: ${process.env.CUSTODY_CONTRACT_ADDRESS ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  ftsoService.stopPriceFetching();
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  ftsoService.stopPriceFetching();
  await disconnectPrisma();
  process.exit(0);
});

// Start the server
startServer();

export default app;
