import { NextRequest, NextResponse } from "next/server";
import { registerSchema, registerResponseSchema } from "../../../lib/validations";
import { validateRequest, validateResponse } from "../../../lib/validation-utils";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = validateRequest(registerSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { email, password } = validation.data;

    const registerBaseUrl = process.env.AGENT_API_BASE_URL;
    if (!registerBaseUrl) {
      return NextResponse.json(
        { error: "Register API URL is required" },
        { status: 500 }
      );
    }

    const registerApiUrl = `${registerBaseUrl}/register`;

    const response = await fetch(registerApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Registration failed",
      }));
      return NextResponse.json(
        { error: errorData.error || "Registration failed" },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    
    // Validate API response
    const data = validateResponse(
      registerResponseSchema,
      responseData,
      "Register API response"
    );

    return NextResponse.json({
      message: data.message || "User registered successfully",
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
