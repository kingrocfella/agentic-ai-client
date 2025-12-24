export interface ChatChunk {
  event?: string;
  data?: string;
  done?: boolean;
  error?: string;
  status?: number;
}

export type StreamCallback = (chunk: ChatChunk) => void;

export function sendMessage(
  message: string,
  onChunk: StreamCallback
): EventSource {
  const url = `/api/chat?query=${encodeURIComponent(message)}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      onChunk(data);

      if (data?.event === "done") {
        eventSource.close();
      }
    } catch (e) {
      console.error("Error parsing chunk:", JSON.stringify(e));
    }
  });

  eventSource.addEventListener("error", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data);
      if (data?.error || data?.status === 401) {
        onChunk({ error: data.error || "Unauthorized", status: 401 });
        eventSource.close();
        return;
      }
    } catch {
      // Not a JSON error event, continue to onerror handler
    }
  });

  eventSource.onerror = (error) => {
    console.error("EventSource error:", JSON.stringify(error));
    // Only send generic error if we haven't already handled it via error event
    if (eventSource.readyState === EventSource.CLOSED) {
      onChunk({ error: "Connection error" });
      eventSource.close();
    }
  };

  return eventSource;
}
