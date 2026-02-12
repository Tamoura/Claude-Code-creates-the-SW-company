import { FastifyInstance } from 'fastify';
import {
  setupTestDb,
  cleanDb,
  closeDb,
  createTestApp,
} from '../helpers/build-app';
import { setupGracefulShutdown } from '../../src/lib/shutdown';

let app: FastifyInstance;

beforeAll(async () => {
  await setupTestDb();
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await closeDb();
});

beforeEach(async () => {
  await cleanDb();
});

describe('Graceful shutdown', () => {
  it('should export a setupGracefulShutdown function', () => {
    expect(typeof setupGracefulShutdown).toBe('function');
  });

  it('should register SIGTERM and SIGINT handlers', () => {
    const listeners: Record<string, Function[]> = {};
    const mockProcess = {
      on: jest.fn((event: string, handler: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      }),
    } as unknown as NodeJS.Process;

    const mockApp = {
      close: jest.fn().mockResolvedValue(undefined),
      prisma: {
        $disconnect: jest.fn().mockResolvedValue(undefined),
      },
    } as unknown as FastifyInstance;

    setupGracefulShutdown(mockApp, mockProcess);

    expect(mockProcess.on).toHaveBeenCalledWith(
      'SIGTERM',
      expect.any(Function)
    );
    expect(mockProcess.on).toHaveBeenCalledWith(
      'SIGINT',
      expect.any(Function)
    );
  });

  it('should close the Fastify server on shutdown', async () => {
    const closeFn = jest.fn().mockResolvedValue(undefined);
    const disconnectFn = jest.fn().mockResolvedValue(undefined);

    const mockApp = {
      close: closeFn,
      prisma: {
        $disconnect: disconnectFn,
      },
    } as unknown as FastifyInstance;

    let sigTermHandler: Function | undefined;
    const mockProcess = {
      on: jest.fn((event: string, handler: Function) => {
        if (event === 'SIGTERM') sigTermHandler = handler;
      }),
      exit: jest.fn(),
    } as unknown as NodeJS.Process;

    setupGracefulShutdown(mockApp, mockProcess);

    expect(sigTermHandler).toBeDefined();
    await sigTermHandler!();

    expect(closeFn).toHaveBeenCalled();
    expect(disconnectFn).toHaveBeenCalled();
  });
});
