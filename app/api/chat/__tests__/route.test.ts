import { GET } from "../route";
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

describe("GET /api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AGENT_API_BASE_URL = "http://localhost:8000";
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AGENT_API_BASE_URL;
  });

  it("should return 400 when query parameter is missing", async () => {
    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue(null),
        },
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(data.error).toBe("User Query is required");
    expect(response.status).toBe(400);
  });

  it("should return 400 when query parameter is empty string", async () => {
    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue(""),
        },
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(data.error).toBe("User Query is required");
    expect(response.status).toBe(400);
  });

  it("should return 500 when API URL is not set", async () => {
    delete process.env.AGENT_API_BASE_URL;
    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("test message"),
        },
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(data.error).toBe("Agent API URL is not set");
    expect(response.status).toBe(500);
  });

  it("should call external API with correct URL and query", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({
      ok: true,
      body: mockBody,
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("hello world"),
        },
      },
    } as unknown as NextRequest;

    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/agents/chat?agent_type=ollama&query=hello%20world"
      ),
      expect.objectContaining({
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          Authorization: "Bearer test-token",
        },
      })
    );
  });

  it("should encode special characters in query", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({
      ok: true,
      body: mockBody,
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("hello & world"),
        },
      },
    } as unknown as NextRequest;

    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("query=hello%20%26%20world"),
      expect.any(Object)
    );
  });

  it("should include auth headers in request", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({
      ok: true,
      body: mockBody,
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("test"),
        },
      },
    } as unknown as NextRequest;

    await GET(request);

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
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("test"),
        },
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(data.error).toBe("API responded with status 500");
    expect(response.status).toBe(500);
  });

  it("should clear cookies and return streaming error for 401", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer invalid-token",
    });

    const { clearAuthCookies } = await import("../../../lib/auth");
    const clearCookiesSpy = jest.spyOn(
      await import("../../../lib/auth"),
      "clearAuthCookies"
    );

    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("test"),
        },
      },
    } as unknown as NextRequest;

    const response = await GET(request);

    // For 401, we return a streaming response with error event
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(clearCookiesSpy).toHaveBeenCalled();
  });

  it("should return error when response body is missing", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      body: null,
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("test"),
        },
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(data.error).toBe("No response body from API");
    expect(response.status).toBe(500);
  });

  it("should return streaming response with correct headers", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({
      ok: true,
      body: mockBody,
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("test"),
        },
      },
    } as unknown as NextRequest;

    const response = await GET(request);

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

    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("test"),
        },
      },
    } as unknown as NextRequest;

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const response = await GET(request);
    const data = await response.json();

    expect(data.error).toBe("Failed to process message");
    expect(response.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should work without auth headers when not authenticated", async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockBody = { pipe: jest.fn() } as unknown as ReadableStream;
    mockFetch.mockResolvedValue({
      ok: true,
      body: mockBody,
    });

    mockGetAuthHeaders.mockResolvedValue({});

    const request = {
      nextUrl: {
        searchParams: {
          get: jest.fn().mockReturnValue("test"),
        },
      },
    } as unknown as NextRequest;

    await GET(request);

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
