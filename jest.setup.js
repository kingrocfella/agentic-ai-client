// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  usePathname() {
    return "/";
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock react-markdown
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    return React.createElement("div", null, children);
  },
}));

jest.mock("remark-breaks", () => ({
  __esModule: true,
  default: () => {},
}));

// jsdom ships neither TextEncoder nor TextDecoder, but the chat stream reader
// in app/lib/api.ts needs both (every real browser has them). Borrow Node's.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TextEncoder, TextDecoder } = require("node:util");
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

// No EventSource mock: the chat stream is a POST + fetch reader, precisely so
// the prompt never travels in a URL. See app/lib/api.ts.
