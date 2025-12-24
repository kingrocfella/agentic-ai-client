import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatBox from "../ChatBox";
import * as api from "../../lib/api";

// Mock the API module
jest.mock("../../lib/api");
jest.mock("../MarkdownRenderer", () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  ),
}));
jest.mock("../SendIcon", () => ({
  __esModule: true,
  default: () => <svg data-testid="send-icon">Send</svg>,
}));
jest.mock("../LoadingSpinner", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

describe("ChatBox", () => {
  const mockEventSource = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    close: jest.fn(),
    onmessage: null,
    onerror: null,
    readyState: 1,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (global.EventSource as unknown as jest.Mock).mockImplementation(
      () => mockEventSource
    );
    (api.sendMessage as jest.Mock).mockReturnValue(mockEventSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the chat input form", () => {
      render(<ChatBox />);
      expect(screen.getByPlaceholderText("Message...")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /send message/i })
      ).toBeInTheDocument();
    });

    it("should render send icon when not loading", () => {
      render(<ChatBox />);
      expect(screen.getByTestId("send-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    it("should not display messages initially", () => {
      render(<ChatBox />);
      expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
    });
  });

  describe("Input handling", () => {
    it("should update input value when user types", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText(
        "Message..."
      ) as HTMLInputElement;

      await user.type(input, "Hello, world!");
      expect(input.value).toBe("Hello, world!");
    });

    it("should clear input after submission", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText(
        "Message..."
      ) as HTMLInputElement;

      await user.type(input, "Test message");
      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(input.value).toBe("");
      });
    });

    it("should disable input when loading", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText(
        "Message..."
      ) as HTMLInputElement;

      await user.type(input, "Test");
      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe("Form submission", () => {
    it("should call sendMessage when form is submitted", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText("Message...");

      await user.type(input, "Hello");
      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(api.sendMessage).toHaveBeenCalledWith(
          "Hello",
          expect.any(Function)
        );
      });
    });

    it("should not submit empty message", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const button = screen.getByRole("button");

      expect(button).toBeDisabled();
      await user.click(button);

      expect(api.sendMessage).not.toHaveBeenCalled();
    });

    it("should not submit when already loading", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText("Message...");

      await user.type(input, "First message");
      await user.click(screen.getByRole("button"));

      // Try to submit again while loading
      await user.type(input, "Second message");
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should trim whitespace from message before submitting", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText("Message...");

      await user.type(input, "  Hello World  ");
      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(api.sendMessage).toHaveBeenCalledWith(
          "Hello World",
          expect.any(Function)
        );
      });
    });
  });

  describe("Message display", () => {
    it("should display user message after submission", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText("Message...");

      await user.type(input, "User question");
      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText("User question")).toBeInTheDocument();
      });
    });

    it("should display streamed response", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText("Message...");

      await user.type(input, "Test");
      await user.click(screen.getByRole("button"));

      // Simulate streaming response
      await waitFor(() => {
        const callback = (api.sendMessage as jest.Mock).mock.calls[0][1];
        callback({ event: "message", data: "Streamed " });
        callback({ event: "message", data: "response" });
      });

      await waitFor(() => {
        expect(screen.getByTestId("markdown")).toHaveTextContent(
          "Streamed response"
        );
      });
    });

    it("should show loading spinner when loading", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText("Message...");

      await user.type(input, "Test");
      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      });
    });
  });

  describe("EventSource handling", () => {
    it("should handle done event", async () => {
      const user = userEvent.setup();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText("Message...");

      await user.type(input, "Test");
      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        const callback = (api.sendMessage as jest.Mock).mock.calls[0][1];
        callback({ event: "done" });
      });

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });
    });

    it("should handle error event", async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      render(<ChatBox />);
      const input = screen.getByPlaceholderText("Message...");

      await user.type(input, "Test");
      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        const callback = (api.sendMessage as jest.Mock).mock.calls[0][1];
        callback({ error: "Test error" });
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Error:", "Test error");
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Cleanup", () => {
    it("should close EventSource on unmount if one exists", async () => {
      const user = userEvent.setup();
      const testEventSource = { ...mockEventSource, close: jest.fn() };
      (api.sendMessage as jest.Mock).mockReturnValue(testEventSource);

      const { unmount } = render(<ChatBox />);
      const input = screen.getByPlaceholderText("Message...");

      await user.type(input, "Test");
      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(api.sendMessage).toHaveBeenCalled();
      });

      // Wait a bit to ensure the ref is set
      await new Promise((resolve) => setTimeout(resolve, 10));

      // The ref is set synchronously when sendMessage is called
      unmount();
      expect(testEventSource.close).toHaveBeenCalled();
    });
  });
});
