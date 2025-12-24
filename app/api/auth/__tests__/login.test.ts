import { POST } from "../login/route";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

jest.mock("next/headers");
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

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const originalFetch = global.fetch;

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AGENT_API_BASE_URL = "http://localhost:9000";
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AGENT_API_BASE_URL;
  });

  it("should return 400 when username is missing", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ password: "password123" }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Username and password are required");
    expect(response.status).toBe(400);
  });

  it("should return 400 when password is missing", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ username: "testuser" }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Username and password are required");
    expect(response.status).toBe(400);
  });

  it("should return 500 when API URL is not set", async () => {
    delete process.env.AGENT_API_BASE_URL;
    const request = {
      json: jest.fn().mockResolvedValue({
        username: "testuser",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Login API URL is required");
    expect(response.status).toBe(500);
  });

  it("should call external login API with correct data", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: "Login successful",
        data: {
          access_token: "token123",
          token_type: "Bearer",
        },
      }),
    });

    const mockCookieStore = {
      set: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    const request = {
      json: jest.fn().mockResolvedValue({
        username: "testuser",
        password: "password123",
      }),
    } as unknown as NextRequest;

    await POST(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/login"),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "testuser", password: "password123" }),
      })
    );
  });

  it("should store tokens in cookies on successful login", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: "Login successful",
        data: {
          access_token: "token123",
          token_type: "Bearer",
        },
      }),
    });

    const mockCookieStore = {
      set: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    const request = {
      json: jest.fn().mockResolvedValue({
        username: "testuser",
        password: "password123",
      }),
    } as unknown as NextRequest;

    await POST(request);

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "access_token",
      "token123",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      })
    );

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "token_type",
      "Bearer",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      })
    );
  });

  it("should return success message on successful login", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: "Login successful",
        data: {
          access_token: "token123",
          token_type: "Bearer",
        },
      }),
    });

    const mockCookieStore = {
      set: jest.fn(),
    };
    mockCookies.mockResolvedValue(
      mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
    );

    const request = {
      json: jest.fn().mockResolvedValue({
        username: "testuser",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.message).toBe("Login successful");
    expect(response.status).toBe(200);
  });

  it("should return error when external API fails", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({
        error: "Invalid credentials",
      }),
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        username: "testuser",
        password: "wrongpassword",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Invalid credentials");
    expect(response.status).toBe(401);
  });

  it("should handle API error with no error message", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({}),
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        username: "testuser",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Login failed");
    expect(response.status).toBe(500);
  });

  it("should return 500 when cookie store is not found", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: "Login successful",
        data: {
          access_token: "token123",
          token_type: "Bearer",
        },
      }),
    });

    mockCookies.mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof cookies>>
    );

    const request = {
      json: jest.fn().mockResolvedValue({
        username: "testuser",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Cookie store is not found");
    expect(response.status).toBe(500);
  });

  it("should handle fetch errors", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockRejectedValue(new Error("Network error"));

    const request = {
      json: jest.fn().mockResolvedValue({
        username: "testuser",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("An error occurred during login");
    expect(response.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
