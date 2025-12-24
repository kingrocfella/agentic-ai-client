import { NextRequest, NextResponse } from "next/server";
import { getAuthHeaders, clearAuthCookies } from "../../lib/auth";

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
      // If we get a 401, clear auth cookies and send error event through stream
      if (response.status === 401) {
        await clearAuthCookies();
        // Create a stream that sends an error event
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            const errorData = JSON.stringify({
              error: "Unauthorized - Please log in again",
              status: 401,
            });
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${errorData}\n\n`)
            );
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
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
