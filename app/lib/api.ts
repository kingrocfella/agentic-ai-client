export interface ChatChunk {
  event?: string;
  data?: string;
  done?: boolean;
  error?: string;
}

export type StreamCallback = (chunk: ChatChunk) => void;

export function sendMessage(
  message: string,
  onChunk: StreamCallback
): EventSource {
  const url = `/api/chat?query=${encodeURIComponent(message)}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onChunk(data);

      if (data?.event === 'done') {
        eventSource.close();
      }
    } catch (e) {
      console.error("Error parsing chunk:", JSON.stringify(e));
    }
  };

  eventSource.onerror = (error) => {
    console.error("EventSource error:", JSON.stringify(error));
    onChunk({ error: "Connection error" });
    eventSource.close();
  };

  return eventSource;
}

