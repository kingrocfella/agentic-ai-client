import { sendMessage } from "../api";

// Mock EventSource
const mockEventSource = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
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

  it("should set message event listener", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  it("should call callback with parsed data on message", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    const testData = { event: "message", data: "chunk data" };
    const event = {
      data: JSON.stringify(testData),
    } as MessageEvent;

    // Get the message event listener and call it
    const messageCall = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "message"
    );
    expect(messageCall).toBeDefined();
    if (messageCall) {
      messageCall[1](event);
    }

    expect(callback).toHaveBeenCalledWith(testData);
  });

  it("should close EventSource when done event is received", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    const doneData = { event: "done" };
    const event = {
      data: JSON.stringify(doneData),
    } as MessageEvent;

    // Get the message event listener and call it
    const messageCall = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "message"
    );
    expect(messageCall).toBeDefined();
    if (messageCall) {
      messageCall[1](event);
    }

    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it("should handle invalid JSON gracefully", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const callback = jest.fn();
    sendMessage("test", callback);

    const event = {
      data: "invalid json",
    } as MessageEvent;

    // Get the message event listener and call it
    const messageCall = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "message"
    );
    expect(messageCall).toBeDefined();
    if (messageCall) {
      messageCall[1](event);
    }

    expect(consoleSpy).toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should set error event listener", () => {
    const callback = jest.fn();
    sendMessage("test", callback);

    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      "error",
      expect.any(Function)
    );
  });

  it("should call callback with error on EventSource error", () => {
    const callback = jest.fn();
    const eventSource = sendMessage("test", callback);

    // The onerror handler checks if readyState === EventSource.CLOSED (which is 2)
    // We need to set readyState to CLOSED before calling onerror
    // Use Object.defineProperty to ensure the value is properly set
    Object.defineProperty(eventSource, "readyState", {
      value: 2, // EventSource.CLOSED
      writable: true,
      configurable: true,
    });

    if (eventSource.onerror) {
      eventSource.onerror({} as Event);
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

    // Get the message event listener
    const messageCall = mockEventSource.addEventListener.mock.calls.find(
      (call) => call[0] === "message"
    );
    expect(messageCall).toBeDefined();

    chunks.forEach((chunk) => {
      const event = {
        data: JSON.stringify(chunk),
      } as MessageEvent;
      if (messageCall) {
        messageCall[1](event);
      }
    });

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(1, chunks[0]);
    expect(callback).toHaveBeenNthCalledWith(2, chunks[1]);
    expect(callback).toHaveBeenNthCalledWith(3, chunks[2]);
  });
});
