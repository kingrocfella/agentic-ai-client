import { sendMessage } from "../api";

// Mock EventSource
const mockEventSource = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  readyState: 1,
};

describe("sendMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.EventSource as unknown as jest.Mock).mockImplementation(
      () => mockEventSource
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create EventSource with correct URL", () => {
    const callback = jest.fn();
    sendMessage("test message", callback);

    expect(global.EventSource).toHaveBeenCalledWith(
      "/api/chat?query=test%20message"
    );
  });

  it("should encode special characters in message", () => {
    const callback = jest.fn();
    sendMessage("hello & world", callback);

    expect(global.EventSource).toHaveBeenCalledWith(
      "/api/chat?query=hello%20%26%20world"
    );
  });

  it("should set onmessage handler", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    expect(mockEventSource.onmessage).toBeDefined();
  });

  it("should call callback with parsed data on message", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    const testData = { event: "message", data: "chunk data" };
    const event = {
      data: JSON.stringify(testData),
    };

    // Simulate message event
    if (mockEventSource.onmessage) {
      mockEventSource.onmessage(event as MessageEvent);
    }

    expect(callback).toHaveBeenCalledWith(testData);
  });

  it("should close EventSource when done event is received", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    const doneData = { event: "done" };
    const event = {
      data: JSON.stringify(doneData),
    };

    if (mockEventSource.onmessage) {
      mockEventSource.onmessage(event as MessageEvent);
    }

    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it("should handle invalid JSON gracefully", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const callback = jest.fn();
    sendMessage("test", callback);

    const event = {
      data: "invalid json",
    };

    if (mockEventSource.onmessage) {
      mockEventSource.onmessage(event as MessageEvent);
    }

    expect(consoleSpy).toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should set onerror handler", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    expect(mockEventSource.onerror).toBeDefined();
  });

  it("should call callback with error on EventSource error", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    if (mockEventSource.onerror) {
      mockEventSource.onerror({} as Event);
    }

    expect(callback).toHaveBeenCalledWith({ error: "Connection error" });
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it("should return EventSource instance", () => {
    const callback = jest.fn();
    const eventSource = sendMessage("test", callback);

    expect(eventSource).toBe(mockEventSource);
  });

  it("should handle multiple chunks", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    const chunks = [
      { event: "message", data: "chunk1" },
      { event: "message", data: "chunk2" },
      { event: "message", data: "chunk3" },
    ];

    chunks.forEach((chunk) => {
      const event = {
        data: JSON.stringify(chunk),
      };
      if (mockEventSource.onmessage) {
        mockEventSource.onmessage(event as MessageEvent);
      }
    });

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(1, chunks[0]);
    expect(callback).toHaveBeenNthCalledWith(2, chunks[1]);
    expect(callback).toHaveBeenNthCalledWith(3, chunks[2]);
  });
});
