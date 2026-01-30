import { validateRequest, validateResponse } from "../validation-utils";
import { loginSchema, chatQuerySchema } from "../validations";
import { z } from "zod";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
      headers: new Headers(),
    })),
  },
}));

describe("validation-utils", () => {
  describe("validateRequest", () => {
    it("should return success with validated data when validation passes", () => {
      const validData = {
        username: "testuser",
        password: "password123",
      };

      const result = validateRequest(loginSchema, validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
        expect(result.data.username).toBe("testuser");
        expect(result.data.password).toBe("password123");
      }
    });

    it("should return failure with formatted errors when Zod validation fails", async () => {
      const invalidData = {
        username: "",
        password: "short",
      };

      const result = validateRequest(loginSchema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        const response = result.response;
        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.error).toBe("Validation failed");
        expect(json.details).toBeDefined();
        expect(Array.isArray(json.details)).toBe(true);
        expect(json.details.length).toBeGreaterThan(0);
        expect(json.details[0]).toHaveProperty("field");
        expect(json.details[0]).toHaveProperty("message");
      }
    });

    it("should include field-specific error messages in details", async () => {
      const invalidData = {
        username: "testuser",
        password: "12345", // too short
      };

      const result = validateRequest(loginSchema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        const passwordError = json.details.find(
          (d: { field: string }) => d.field === "password"
        );
        expect(passwordError).toBeDefined();
        expect(passwordError.message).toContain("6");
      }
    });

    it("should return generic error when non-ZodError is thrown", async () => {
      const schemaThatThrows = z.object({
        foo: z.custom(() => {
          throw new Error("Custom error");
        }),
      });

      const result = validateRequest(schemaThatThrows, { foo: "bar" });

      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(json.error).toBe("Invalid request data");
        expect(json.details).toBeUndefined();
        expect(result.response.status).toBe(400);
      }
    });

    it("should handle missing required fields", async () => {
      const result = validateRequest(chatQuerySchema, { query: null });

      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(json.error).toBe("Validation failed");
        expect(json.details.some((d: { field: string }) => d.field === "query")).toBe(true);
      }
    });
  });

  describe("validateResponse", () => {
    it("should return parsed data when validation passes", () => {
      const validData = {
        username: "testuser",
        password: "password123",
      };

      const result = validateResponse(loginSchema, validData);

      expect(result).toEqual(validData);
    });

    it("should throw with context message when Zod validation fails", () => {
      const invalidData = { username: "", password: "" };
      const context = "Login API response";

      expect(() => validateResponse(loginSchema, invalidData, context)).toThrow(
        `Invalid ${context}:`
      );
    });

    it("should use default context when not provided", () => {
      const invalidData = { username: "", password: "" };

      expect(() => validateResponse(loginSchema, invalidData)).toThrow(
        "Invalid API response:"
      );
    });

    it("should log validation errors to console when validation fails", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const invalidData = { username: "", password: "" };

      try {
        validateResponse(loginSchema, invalidData, "Test context");
      } catch {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        "Test context validation failed:",
        expect.any(Array)
      );
      consoleSpy.mockRestore();
    });

    it("should rethrow non-ZodError without wrapping", () => {
      const schemaThatThrows = z.object({
        foo: z.custom(() => {
          throw new TypeError("Custom type error");
        }),
      });

      expect(() =>
        validateResponse(schemaThatThrows, { foo: "bar" }, "Test")
      ).toThrow(TypeError);
    });
  });
});
