export interface ChatChunk {
  event?: string;
  data?: string;
  done?: boolean;
  error?: string;
  status?: number;
}

export type StreamCallback = (chunk: ChatChunk) => void;

/**
 * Stream an agent answer.
 *
 * This deliberately does NOT use `EventSource`. EventSource can only issue GET
 * requests, which would put the user's prompt in the URL — and therefore in
 * browser history, the Next.js access log, and any proxy log in between. The
 * agent API rejects GET for the same reason (it answers 405), so the prompt
 * travels in a POST body from the browser all the way to the model host.
 *
 * Returns the AbortController driving the request; call `.abort()` to cancel.
 */
export function sendMessage(
  message: string,
  onChunk: StreamCallback
): AbortController {
  const controller = new AbortController();

  void streamChat(message, onChunk, controller.signal);

  return controller;
}

async function streamChat(
  message: string,
  onChunk: StreamCallback,
  signal: AbortSignal
): Promise<void> {
  let response: Response;

  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ query: message }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    console.error("Chat request failed:", JSON.stringify(error));
    onChunk({ error: "Connection error" });
    return;
  }

  if (!response.ok || !response.body) {
    // The route answers non-2xx as JSON, not as a stream.
    let error = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) {
        error = body.error;
      }
    } catch {
      // Keep the status-derived message.
    }
    onChunk({ error, status: response.status });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        if (emitFrame(frame, onChunk)) {
          void reader.cancel().catch(() => {});
          return;
        }
        separator = buffer.indexOf("\n\n");
      }
    }
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    console.error("EventStream error:", JSON.stringify(error));
    onChunk({ error: "Connection error" });
  }
}

/**
 * Parse one SSE frame and hand it to the callback. Returns true when the stream
 * is finished and the reader should be released.
 */
function emitFrame(frame: string, onChunk: StreamCallback): boolean {
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  if (dataLines.length === 0) {
    return false;
  }

  let payload: ChatChunk;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch (e) {
    console.error("Error parsing chunk:", JSON.stringify(e));
    return false;
  }

  if (eventName === "error") {
    onChunk({
      error: payload.error || "Unauthorized",
      status: payload.status ?? 401,
    });
    return true;
  }

  onChunk(payload);

  return payload?.event === "done";
}
