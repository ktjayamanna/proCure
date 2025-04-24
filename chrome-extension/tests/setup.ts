import '@testing-library/jest-dom';

// Mock Storage API
jest.mock('@plasmohq/storage', () => {
  const mockStorage = {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  };

  return {
    Storage: jest.fn().mockImplementation(() => mockStorage),
  };
});

// Mock chrome API
const createMockChrome = () => {
  return {
    runtime: {
      id: 'test-extension-id',
    },
    tabs: {
      onUpdated: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn(),
        hasListeners: jest.fn(),
      },
      onActivated: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn(),
        hasListeners: jest.fn(),
      },
      get: jest.fn(),
    },
    alarms: {
      onAlarm: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn(),
        hasListeners: jest.fn(),
      },
      create: jest.fn(),
    },
  };
};

// Create and assign the mock
const mockChrome = createMockChrome();
// @ts-ignore - We're intentionally using a partial mock
global.chrome = mockChrome;

// Mock crypto API
if (!global.crypto) {
  global.crypto = {} as Crypto;
}

if (!global.crypto.subtle) {
  global.crypto.subtle = {} as SubtleCrypto;
}

// Add digest method to subtle crypto
global.crypto.subtle.digest = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

// Mock TextEncoder
global.TextEncoder = class TextEncoder {
  encode(input: string): Uint8Array {
    return new Uint8Array(Array.from(input).map(char => char.charCodeAt(0)));
  }
};

// Mock fetch API
global.fetch = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Reset fetch mock
  (global.fetch as jest.Mock).mockReset();

  // Reset crypto mock
  (global.crypto.subtle.digest as jest.Mock).mockClear();
});
