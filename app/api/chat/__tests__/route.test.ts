import { POST } from "../route";
import { NextRequest } from "next/server";
import { getAuthHeaders } from "../../../lib/auth";

// Polyfill for Node.js test environment
if (typeof ReadableStream === "undefined") {
  global.ReadableStream = class ReadableStream {
    constructor() {}
  } as typeof ReadableStream;
}

if (typeof Response === "undefined") {
  global.Response = class Response {
    body: ReadableStream | null;
    headers: Headers;
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.body = body as ReadableStream | null;
      this.headers = new Headers(init?.headers);
    }
  } as typeof Response;
}

jest.mock("../../../lib/auth");
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Headers(),
    })),
  },
}));

const mockGetAuthHeaders = getAuthHeaders as jest.MockedFunction<
  typeof getAuthHeaders
>;
const originalFetch = global.fetch;

/** A request whose JSON body is `body`. */
function requestWith(body: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

/** A request whose body is not valid JSON. */
function requestWithInvalidJson(): NextRequest {
  return {
    json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
  } as unknown as NextRequest;
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AGENT_API_BASE_URL = "http://localhost:9000";
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AGENT_API_BASE_URL;
  });

  it("should return 400 when the body is not JSON", async () => {
    const response = await POST(requestWithInvalidJson());
    const data = await response.json();

    expect(data.error).toBe("Request body must be JSON");
    expect(response.status).toBe(400);
  });

  it("should return 400 when query is missing", async () => {
    const response = await POST(requestWith({}));
    const data = await response.json();

    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
    expect(response.status).toBe(400);
  });

  it("should return 400 when query is an empty string", async () => {
    const response = await POST(requestWith({ query: "" }));
    const data = await response.json();

    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
    expect(response.status).toBe(400);
  });

  it("should return 400 when query exceeds the agent API's bound", async () => {
    const response = await POST(requestWith({ query: "a".repeat(4001) }));
    const data = await response.json();

    expect(data.error).toBe("Validation failed");
    expect(response.status).toBe(400);
  });

  it("should return 500 when API URL is not set", async () => {
    delete process.env.AGENT_API_BASE_URL;

    const response = await POST(requestWith({ query: "test message" }));
    const data = await response.json();

    expect(data.error).toBe("Agent API URL is not set");
    expect(response.status).toBe(500);
  });

  it("should POST the prompt in a JSON body, never in the URL", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({ ok: true, body: mockBody });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    await POST(requestWith({ query: "hello world" }));

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:9000/agents/chat");
    expect(url).not.toContain("hello");
    expect(init).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({ agent_type: "ollama", query: "hello world" }),
      })
    );
  });

  it("should pass special characters through the body unescaped", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({ ok: true, body: mockBody });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    await POST(requestWith({ query: "hello & world" }));

    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({
      agent_type: "ollama",
      query: "hello & world",
    });
  });

  it("should include auth headers in request", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({ ok: true, body: mockBody });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    await POST(requestWith({ query: "test" }));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("should return error when API response is not ok", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const response = await POST(requestWith({ query: "test" }));
    const data = await response.json();

    expect(data.error).toBe("API responded with status 500");
    expect(response.status).toBe(500);
  });

  it("should clear cookies and return streaming error for 401", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer invalid-token",
    });

    const clearCookiesSpy = jest.spyOn(
      await import("../../../lib/auth"),
      "clearAuthCookies"
    );

    const response = await POST(requestWith({ query: "test" }));

    // For 401, we return a streaming response with error event
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(clearCookiesSpy).toHaveBeenCalled();
  });

  it("should return error when response body is missing", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: true, body: null });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const response = await POST(requestWith({ query: "test" }));
    const data = await response.json();

    expect(data.error).toBe("No response body from API");
    expect(response.status).toBe(500);
  });

  it("should return streaming response with correct headers", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({ ok: true, body: mockBody });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const response = await POST(requestWith({ query: "test" }));

    expect(response).toBeDefined();
    expect(response.body).toBe(mockBody);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("should handle fetch errors", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockRejectedValue(new Error("Network error"));

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const response = await POST(requestWith({ query: "test" }));
    const data = await response.json();

    expect(data.error).toBe("Failed to process message");
    expect(response.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should work without auth headers when not authenticated", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({ ok: true, body: mockBody });

    mockGetAuthHeaders.mockResolvedValue({});

    await POST(requestWith({ query: "test" }));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "text/event-stream",
        }),
      })
    );
  });
});
