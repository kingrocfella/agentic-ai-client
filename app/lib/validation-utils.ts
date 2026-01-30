import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

/**
 * Validates data against a Zod schema and returns formatted error response if validation fails
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return {
        success: false,
        response: NextResponse.json(
          {
            error: "Validation failed",
            details: formattedErrors,
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validates API response data against a Zod schema
 * Returns validated data or throws error with details
 */
export function validateResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string = "API response"
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(`${context} validation failed:`, error.issues);
      throw new Error(
        `Invalid ${context}: ${error.issues.map((e: z.ZodIssue) => e.message).join(", ")}`
      );
    }
    throw error;
  }
}
