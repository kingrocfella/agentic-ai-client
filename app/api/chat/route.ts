import { NextRequest, NextResponse } from "next/server";
import { getAuthHeaders } from "../../lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const message = searchParams.get("query");

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "User Query is required" },
        { status: 400 }
      );
    }

    const agentBaseUrl = process.env.AGENT_API_BASE_URL;
    if (!agentBaseUrl) {
      return NextResponse.json(
        { error: "Agent API URL is not set" },
        { status: 500 }
      );
    }

    // Call the streaming agent API
    const agentApiUrl = `${agentBaseUrl}/agents/chat`;

    const apiUrl = `${agentApiUrl}?agent_type=ollama&query=${encodeURIComponent(
      message
    )}`;

    // Get authentication headers
    const authHeaders = await getAuthHeaders();

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...authHeaders,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `API responded with status ${response.status}`,
        },
        { status: response.status }
      );
    }

    if (!response.body) {
      return NextResponse.json(
        { error: "No response body from API" },
        { status: 500 }
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error processing chat message:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
