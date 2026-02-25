import { describe, it, expect, afterEach } from '@jest/globals';
import { DatasetLoader } from '../src/utils/datasets.js';
import { HuggingFaceError } from '../src/types/index.js';

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';

let server: Server;

function createMockServer(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<string> {
  return new Promise((resolve) => {
    server = createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolve(`http://127.0.0.1:${addr.port}`);
      }
    });
  });
}

function closeServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

afterEach(async () => {
  await closeServer();
});

// The DatasetLoader uses a hardcoded datasets-server URL, so we need to test
// at the type/construction level and test error handling
describe('DatasetLoader', () => {
  describe('constructor', () => {
    it('should create loader with valid API key', () => {
      const loader = new DatasetLoader({ apiKey: 'hf_test_key' });
      expect(loader).toBeInstanceOf(DatasetLoader);
    });

    it('should accept custom timeout', () => {
      const loader = new DatasetLoader({ apiKey: 'hf_test_key', timeoutMs: 30000 });
      expect(loader).toBeInstanceOf(DatasetLoader);
    });

    it('should reject empty API key', () => {
      expect(() => new DatasetLoader({ apiKey: '' })).toThrow();
    });
  });

  describe('iterateRows', () => {
    it('should be an async generator', () => {
      const loader = new DatasetLoader({ apiKey: 'hf_test_key' });
      const gen = loader.iterateRows('test-dataset');
      expect(gen[Symbol.asyncIterator]).toBeDefined();
    });
  });
});

describe('HuggingFaceError', () => {
  it('should be an instance of Error', () => {
    const error = new HuggingFaceError('test', 500);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HuggingFaceError);
  });

  it('should have correct properties', () => {
    const error = new HuggingFaceError('API failed', 503, 'DatasetsApiError');
    expect(error.message).toBe('API failed');
    expect(error.statusCode).toBe(503);
    expect(error.errorType).toBe('DatasetsApiError');
    expect(error.name).toBe('HuggingFaceError');
  });

  it('should serialize to JSON correctly', () => {
    const error = new HuggingFaceError('Timeout', 408, 'TimeoutError');
    expect(error.toJSON()).toEqual({
      name: 'HuggingFaceError',
      message: 'Timeout',
      statusCode: 408,
      errorType: 'TimeoutError',
    });
  });

  it('should default errorType to HuggingFaceError', () => {
    const error = new HuggingFaceError('generic', 500);
    expect(error.errorType).toBe('HuggingFaceError');
  });
});
