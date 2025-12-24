import { cookies } from "next/headers";
import {
  getAccessToken,
  getTokenType,
  getAuthHeaders,
  isAuthenticated,
} from "../auth";

jest.mock("next/headers");

describe("Auth Utilities", () => {
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAccessToken", () => {
    it("should return access token when cookie exists", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: "test-token-123" }),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const token = await getAccessToken();

      expect(token).toBe("test-token-123");
      expect(mockCookieStore.get).toHaveBeenCalledWith("access_token");
    });

    it("should return null when cookie does not exist", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const token = await getAccessToken();

      expect(token).toBeNull();
    });

    it("should return null when cookie value is undefined", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: undefined }),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const token = await getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe("getTokenType", () => {
    it("should return token type when cookie exists", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: "Bearer" }),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const tokenType = await getTokenType();

      expect(tokenType).toBe("Bearer");
      expect(mockCookieStore.get).toHaveBeenCalledWith("token_type");
    });

    it("should return null when cookie does not exist", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const tokenType = await getTokenType();

      expect(tokenType).toBeNull();
    });
  });

  describe("getAuthHeaders", () => {
    it("should return Authorization header when token exists", async () => {
      const mockCookieStore = {
        get: jest
          .fn()
          .mockReturnValueOnce({ value: "test-token" })
          .mockReturnValueOnce({ value: "Bearer" }),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        Authorization: "Bearer test-token",
      });
    });

    it("should default to Bearer when token type is null", async () => {
      const mockCookieStore = {
        get: jest
          .fn()
          .mockReturnValueOnce({ value: "test-token" })
          .mockReturnValueOnce(undefined),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        Authorization: "Bearer test-token",
      });
    });

    it("should return empty object when token does not exist", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const headers = await getAuthHeaders();

      expect(headers).toEqual({});
    });

    it("should use custom token type when provided", async () => {
      const mockCookieStore = {
        get: jest
          .fn()
          .mockReturnValueOnce({ value: "test-token" })
          .mockReturnValueOnce({ value: "Custom" }),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        Authorization: "Custom test-token",
      });
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when access token exists", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: "test-token" }),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const authenticated = await isAuthenticated();

      expect(authenticated).toBe(true);
    });

    it("should return false when access token does not exist", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const authenticated = await isAuthenticated();

      expect(authenticated).toBe(false);
    });

    it("should return false when access token is null", async () => {
      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: null }),
      };
      mockCookies.mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>
      );

      const authenticated = await isAuthenticated();

      expect(authenticated).toBe(false);
    });
  });
});
