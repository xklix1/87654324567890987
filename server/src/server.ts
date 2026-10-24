import { createApp } from './app';
import { env } from './config/env';
import {
  checkDatabaseConnection,
  getIsPostgresAvailable,
  pool,
  getActiveTransactionsCount,
  waitForActiveTransactions,
} from './db/pool';
import { SimulationEngine } from './modules/engine/simulation.engine';
import { SocketServer } from './socket/socket.server';
import { TelemetryBatcher } from './socket/telemetry-batcher';
import { MaintenancePruningJob } from './modules/maintenance/pruning.job';

async function bootstrap(): Promise<void> {
  process.stdout.write('[Server] Initializing Wealth Race Backend Infrastructure...\n');

  // Verify PostgreSQL connectivity
  const pgConnected = await checkDatabaseConnection();
  if (pgConnected) {
    process.stdout.write('[Database] PostgreSQL connection active and verified.\n');
  } else {
    process.stdout.write('[Database] Running with in-memory relational state engine.\n');
  }

  const app = createApp();

  // Start Phase 3 Server-Authoritative Simulation Engine
  SimulationEngine.startBackgroundLoops();
  process.stdout.write('[SimulationEngine] Server-authoritative market and simulation loops active.\n');

  // Start Phase 5 Database Maintenance & Bloat Pruning Background Job
  MaintenancePruningJob.start();

  const server = app.listen(env.PORT, env.HOST, () => {
    process.stdout.write(
      `[Server] Wealth Race Backend API running at http://${env.HOST}:${env.PORT}\n`
    );
    process.stdout.write(`[Server] Environment: ${env.NODE_ENV}\n`);
    process.stdout.write(`[Server] Health Endpoint: http://localhost:${env.PORT}/api/health\n`);
    process.stdout.write(`[Server] Version Endpoint: http://localhost:${env.PORT}/api/version\n`);
  });

  // Initialize Phase 4 Real-Time Socket.io Server
  SocketServer.initialize(server);
  process.stdout.write('[SocketServer] Real-time bidirectional Socket.io communication engine active.\n');

  let isShuttingDown = false;

  const handleShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    process.stdout.write(`\n[Server] Received ${signal}. Initiating graceful operational shutdown sequence...\n`);

    // 1. Notify connected WebSocket clients of impending restart
    const io = SocketServer.getIo();
    if (io) {
      io.emit('server:shutdown', {
        message: 'Server undergoing scheduled restart. Reconnecting shortly...',
      });
      process.stdout.write('[SocketServer] Broadcasted shutdown notification to all active clients.\n');
    }

    // 2. Stop accepting new HTTP traffic
    server.close(() => {
      process.stdout.write('[Server] HTTP listener closed. No new incoming connections accepted.\n');
    });

    // 3. Stop background engines and scheduled jobs
    SimulationEngine.stopBackgroundLoops();
    TelemetryBatcher.stop();
    MaintenancePruningJob.stop();
    process.stdout.write('[Server] Background simulation loops and pruning workers halted.\n');

    // 4. Wait for all in-flight database transactions to commit fully
    const activeTxs = getActiveTransactionsCount();
    if (activeTxs > 0) {
      process.stdout.write(`[Database] Waiting for ${activeTxs} active in-flight database transactions to commit...\n`);
      await waitForActiveTransactions(10000);
      process.stdout.write('[Database] All active transactions committed successfully.\n');
    }

    // 5. Safely close PostgreSQL connection pool
    if (getIsPostgresAvailable()) {
      try {
        await pool.end();
        process.stdout.write('[Database] PostgreSQL connection pool drained and terminated cleanly.\n');
      } catch (err: unknown) {
        process.stderr.write(`[Database] Error draining pool: ${String(err)}\n`);
      }
    }

    process.stdout.write('[Server] Graceful shutdown sequence completed. Exiting process.\n');
    process.exit(0);
  };

  process.on('SIGINT', () => {
    handleShutdown('SIGINT').catch(() => process.exit(1));
  });
  process.on('SIGTERM', () => {
    handleShutdown('SIGTERM').catch(() => process.exit(1));
  });
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[Fatal Error] Application bootstrap failed: ${message}\n`);
  process.exit(1);
});
