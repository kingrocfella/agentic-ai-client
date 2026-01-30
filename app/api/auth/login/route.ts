import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginSchema, loginResponseSchema } from "../../../lib/validations";
import { validateRequest, validateResponse } from "../../../lib/validation-utils";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = validateRequest(loginSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { username, password } = validation.data;

    const loginBaseUrl = process.env.AGENT_API_BASE_URL;
    if (!loginBaseUrl) {
      return NextResponse.json(
        { error: "Login API URL is required" },
        { status: 500 }
      );
    }

    const loginApiUrl = `${loginBaseUrl}/login`;

    const response = await fetch(loginApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Login failed",
      }));
      return NextResponse.json(
        { error: errorData.error || "Login failed" },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    
    // Validate API response
    const data = validateResponse(
      loginResponseSchema,
      responseData,
      "Login API response"
    );

    // Store tokens in httpOnly cookies with enhanced security
    const cookieStore = await cookies();
    if (!cookieStore) {
      return NextResponse.json(
        { error: "Cookie store is not found" },
        { status: 500 }
      );
    }

    // Determine secure flag: use env var if set, otherwise default to production check
    // In production or when FORCE_SECURE_COOKIES is true, always use secure flag
    const isSecure =
      process.env.FORCE_SECURE_COOKIES === "true" ||
      process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isSecure, // Only send over HTTPS
      sameSite: "strict" as const, // CSRF protection
      maxAge: 60 * 60 * 24 * Number(process.env.COOKIE_AGE_DAYS || 7),
      path: "/",
    };

    cookieStore.set("access_token", data.data.access_token, cookieOptions);
    cookieStore.set("token_type", data.data.token_type, cookieOptions);

    return NextResponse.json({
      message: data.message || "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
