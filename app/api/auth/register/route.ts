import { NextRequest, NextResponse } from "next/server";

interface RegisterResponse {
  message: string;
  data: null;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const registerApiUrl = `${process.env.AGENT_API_BASE_URL}/register`;
    if (!registerApiUrl) {
      return NextResponse.json(
        { error: "Register API URL is required" },
        { status: 500 }
      );
    }

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

    const data: RegisterResponse = await response.json();

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
