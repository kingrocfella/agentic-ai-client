import { NextRequest, NextResponse } from "next/server";
import { getAuthHeaders, clearAuthCookies } from "../../lib/auth";
import { chatQuerySchema } from "../../lib/validations";
import { validateRequest } from "../../lib/validation-utils";

/**
 * Proxy a chat prompt to the agent API and stream the answer back.
 *
 * POST, not GET, and the prompt travels in a JSON body: a query string would
 * put the user's prompt into browser history and into every access log between
 * here and the model host. The agent API enforces the same thing — it answers
 * 405 to GET /agents/chat.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be JSON" },
        { status: 400 }
      );
    }

    const validation = validateRequest(chatQuerySchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { query } = validation.data;

    const agentBaseUrl = process.env.AGENT_API_BASE_URL;
    if (!agentBaseUrl) {
      return NextResponse.json(
        { error: "Agent API URL is not set" },
        { status: 500 }
      );
    }

    // Call the streaming agent API
    const agentApiUrl = `${agentBaseUrl}/agents/chat`;

    // Get authentication headers
    const authHeaders = await getAuthHeaders();

    const response = await fetch(agentApiUrl, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ agent_type: "ollama", query }),
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
