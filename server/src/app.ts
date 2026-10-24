import express, { Application } from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalApiLimiter } from './middleware/rate-limit.middleware';

export function createApp(): Application {
  const app: Application = express();

  // Trust proxy for rate limiting headers when behind reverse proxy/load balancer
  app.set('trust proxy', 1);

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-device-id',
        'x-idempotency-key',
        'x-request-timestamp',
        'x-request-nonce',
      ],
    })
  );

  // Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // General API Rate Limiting protection against flooding
  app.use('/api', generalApiLimiter);

  // API Routes
  app.use('/api', apiRouter);

  // 404 Not Found Catch-All
  app.use(notFoundHandler);

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
