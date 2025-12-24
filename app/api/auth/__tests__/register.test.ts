import { POST } from "../register/route";
import { NextRequest } from "next/server";

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

const originalFetch = global.fetch;

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AGENT_API_BASE_URL = "http://localhost:8000";
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AGENT_API_BASE_URL;
  });

  it("should return 400 when email is missing", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ password: "password123" }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Email and password are required");
    expect(response.status).toBe(400);
  });

  it("should return 400 when password is missing", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ email: "test@example.com" }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Email and password are required");
    expect(response.status).toBe(400);
  });

  it("should return 500 when API URL is not set", async () => {
    delete process.env.AGENT_API_BASE_URL;
    const request = {
      json: jest.fn().mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Register API URL is required");
    expect(response.status).toBe(500);
  });

  it("should call external register API with correct data", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: "User registered successfully",
        data: null,
      }),
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      }),
    } as unknown as NextRequest;

    await POST(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/register"),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      })
    );
  });

  it("should return success message on successful registration", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: "User registered successfully",
        data: null,
      }),
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.message).toBe("User registered successfully");
    expect(response.status).toBe(200);
  });

  it("should return error when external API fails", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({
        error: "Email already exists",
      }),
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        email: "existing@example.com",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Email already exists");
    expect(response.status).toBe(409);
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
        email: "test@example.com",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("Registration failed");
    expect(response.status).toBe(500);
  });

  it("should handle fetch errors", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockRejectedValue(new Error("Network error"));

    const request = {
      json: jest.fn().mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const response = await POST(request);
    const data = await response.json();

    expect(data.error).toBe("An error occurred during registration");
    expect(response.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should use default message when API response has no message", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: null,
      }),
    });

    const request = {
      json: jest.fn().mockResolvedValue({
        email: "test@example.com",
        password: "password123",
      }),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.message).toBe("User registered successfully");
  });
});
