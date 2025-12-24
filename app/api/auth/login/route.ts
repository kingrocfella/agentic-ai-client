import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

interface LoginResponse {
  message: string;
  data: {
    access_token: string;
    token_type: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const loginApiUrl = `${process.env.AGENT_API_BASE_URL}/login`;
    if (!loginApiUrl) {
      return NextResponse.json(
        { error: "Login API URL is required" },
        { status: 500 }
      );
    }

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

    const data: LoginResponse = await response.json();

    // Store tokens in httpOnly cookies
    const cookieStore = await cookies();
    if (!cookieStore) {
      return NextResponse.json(
        { error: "Cookie store is not found" },
        { status: 500 }
      );
    }
    cookieStore.set("access_token", data.data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * Number(process.env.COOKIE_AGE_DAYS),
      path: "/",
    });

    cookieStore.set("token_type", data.data.token_type, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * Number(process.env.COOKIE_AGE_DAYS),
      path: "/",
    });

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
