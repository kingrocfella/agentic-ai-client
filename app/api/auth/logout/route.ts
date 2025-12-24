import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthHeaders } from "../../../lib/auth";

interface LogoutResponse {
  message: string;
  data: Record<string, never>;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    if (!cookieStore) {
      return NextResponse.json(
        { error: "Cookie store is not found" },
        { status: 500 }
      );
    }

    // Get authentication headers
    const authHeaders = await getAuthHeaders();

    const logoutBaseUrl = process.env.AGENT_API_BASE_URL;
    if (!logoutBaseUrl) {
      return NextResponse.json(
        { error: "Logout API URL is required" },
        { status: 500 }
      );
    }

    // Call the external logout API
    const logoutApiUrl = `${logoutBaseUrl}/logout`;

    const response = await fetch(logoutApiUrl, {
      method: "GET",
      headers: {
        ...authHeaders,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Logout failed",
      }));
      return NextResponse.json(
        { error: errorData.error || "Logout failed" },
        { status: response.status }
      );
    }

    const data: LogoutResponse = await response.json();

    // Clear authentication cookies after successful logout
    cookieStore.delete("access_token");
    cookieStore.delete("token_type");

    return NextResponse.json({
      message: data.message || "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "An error occurred during logout" },
      { status: 500 }
    );
  }
}
