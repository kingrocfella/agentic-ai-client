import { sendMessage, type ChatChunk } from "../api";

const originalFetch = global.fetch;

/** Build a Response-like object whose body streams `frames` as SSE text. */
function sseResponse(frames: string[], init?: Partial<Response>) {
  const encoder = new TextEncoder();
  let index = 0;

  return {
    ok: true,
    status: 200,
    ...init,
    body: {
      getReader: () => ({
        read: async () =>
          index < frames.length
            ? { done: false, value: encoder.encode(frames[index++]) }
            : { done: true, value: undefined },
        cancel: async () => undefined,
      }),
    },
  } as unknown as Response;
}

/** Let the pending microtasks in streamChat run to completion. */
async function drain() {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

function frame(payload: unknown, eventName?: string) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  return eventName ? `event: ${eventName}\n${data}` : data;
}

describe("sendMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("should POST to /api/chat with the prompt in the body, not the URL", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(sseResponse([]));

    sendMessage("test message", jest.fn());
    await drain();

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(url).not.toContain("test");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ query: "test message" });
  });

  it("should send special characters verbatim in the body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(sseResponse([]));

    sendMessage("hello & world", jest.fn());
    await drain();

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ query: "hello & world" });
  });

  it("should return an AbortController", () => {
    (global.fetch as jest.Mock).mockResolvedValue(sseResponse([]));

    const controller = sendMessage("test", jest.fn());

    expect(controller).toBeInstanceOf(AbortController);
  });

  it("should pass the abort signal to fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(sseResponse([]));

    const controller = sendMessage("test", jest.fn());
    await drain();

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });

  it("should call the callback with each parsed chunk", async () => {
    const chunk = { event: "message", data: "chunk data" };
    (global.fetch as jest.Mock).mockResolvedValue(sseResponse([frame(chunk)]));

    const callback = jest.fn();
    sendMessage("test", callback);
    await drain();

    expect(callback).toHaveBeenCalledWith(chunk);
  });

  it("should handle multiple chunks, including several in one read", async () => {
    const chunks = [
      { event: "message", data: "chunk1" },
      { event: "message", data: "chunk2" },
      { event: "message", data: "chunk3" },
    ];
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse([frame(chunks[0]), frame(chunks[1]) + frame(chunks[2])])
    );

    const callback = jest.fn();
    sendMessage("test", callback);
    await drain();

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(1, chunks[0]);
    expect(callback).toHaveBeenNthCalledWith(2, chunks[1]);
    expect(callback).toHaveBeenNthCalledWith(3, chunks[2]);
  });

  it("should reassemble a frame split across two reads", async () => {
    const payload = '{"event":"message","data":"split"}';
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse([`data: ${payload.slice(0, 10)}`, `${payload.slice(10)}\n\n`])
    );

    const callback = jest.fn();
    sendMessage("test", callback);
    await drain();

    expect(callback).toHaveBeenCalledWith({ event: "message", data: "split" });
  });

  it("should stop reading once the done event arrives", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse([
        frame({ event: "done", data: "" }),
        frame({ event: "message", data: "after done" }),
      ])
    );

    const callback = jest.fn();
    sendMessage("test", callback);
    await drain();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ event: "done", data: "" });
  });

  it("should surface a named error event as an error chunk", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse([
        frame({ error: "Unauthorized - Please log in again", status: 401 }, "error"),
      ])
    );

    const callback = jest.fn();
    sendMessage("test", callback);
    await drain();

    expect(callback).toHaveBeenCalledWith({
      error: "Unauthorized - Please log in again",
      status: 401,
    });
  });

  it("should handle invalid JSON gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    (global.fetch as jest.Mock).mockResolvedValue(
      sseResponse(["data: invalid json\n\n"])
    );

    const callback = jest.fn();
    sendMessage("test", callback);
    await drain();

    expect(consoleSpy).toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should report a JSON error body from a non-2xx response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
      json: async () => ({ error: "Failed to process message" }),
    } as unknown as Response);

    const callback = jest.fn();
    sendMessage("test", callback);
    await drain();

    expect(callback).toHaveBeenCalledWith({
      error: "Failed to process message",
      status: 500,
    });
  });

  it("should report a connection error when fetch rejects", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const callback = jest.fn();
    sendMessage("test", callback);
    await drain();

    expect(callback).toHaveBeenCalledWith({ error: "Connection error" });
    consoleSpy.mockRestore();
  });

  it("should stay silent when the caller aborts", async () => {
    const controller = new AbortController();
    (global.fetch as jest.Mock).mockImplementation(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });

    const callback = jest.fn<void, [ChatChunk]>();
    const returned = sendMessage("test", callback);
    returned.abort();
    await drain();

    expect(callback).not.toHaveBeenCalled();
  });
});
