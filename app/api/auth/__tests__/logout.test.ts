import { GET } from "../logout/route";
import { cookies } from "next/headers";
import { getAuthHeaders } from "../../../lib/auth";

jest.mock("next/headers");
jest.mock("../../../lib/auth");
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Headers(),
    })),
  },
}));

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockGetAuthHeaders = getAuthHeaders as jest.MockedFunction<
  typeof getAuthHeaders
>;
const originalFetch = global.fetch;

describe("GET /api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AGENT_API_BASE_URL = "http://localhost:8000";
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AGENT_API_BASE_URL;
  });

  it("should return 500 when cookie store is not found", async () => {
    mockCookies.mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof cookies>>
    );

    const response = await GET();
    const data = await response.json();

    expect(data.error).toBe("Cookie store is not found");
    expect(response.status).toBe(500);
  });

  it("should return 500 when API URL is not set", async () => {
    delete process.env.AGENT_API_BASE_URL;
    const mockCookieStore = {
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const response = await GET();
    const data = await response.json();

    expect(data.error).toBe("Logout API URL is required");
    expect(response.status).toBe(500);
  });

  it("should call external logout API with auth headers", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: "Logged out successfully",
        data: {},
      }),
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const mockCookieStore = {
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    await GET();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/logout"),
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer test-token",
        },
      })
    );
  });

  it("should clear cookies after successful logout", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: "Logged out successfully",
        data: {},
      }),
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const mockCookieStore = {
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    await GET();

    expect(mockCookieStore.delete).toHaveBeenCalledWith("access_token");
    expect(mockCookieStore.delete).toHaveBeenCalledWith("token_type");
  });

  it("should return success message on successful logout", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: "Logged out successfully",
        data: {},
      }),
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const mockCookieStore = {
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    const response = await GET();
    const data = await response.json();

    expect(data.message).toBe("Logged out successfully");
    expect(response.status).toBe(200);
  });

  it("should return error when external API fails", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({
        error: "Unauthorized",
      }),
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer invalid-token",
    });

    const mockCookieStore = {
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    const response = await GET();
    const data = await response.json();

    expect(data.error).toBe("Unauthorized");
    expect(response.status).toBe(401);
    expect(mockCookieStore.delete).not.toHaveBeenCalled();
  });

  it("should handle fetch errors", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockRejectedValue(new Error("Network error"));

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const mockCookieStore = {
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const response = await GET();
    const data = await response.json();

    expect(data.error).toBe("An error occurred during logout");
    expect(response.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should use default message when API response has no message", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: {},
      }),
    });

    mockGetAuthHeaders.mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const mockCookieStore = {
      delete: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    const response = await GET();
    const data = await response.json();

    expect(data.message).toBe("Logged out successfully");
  });
});
