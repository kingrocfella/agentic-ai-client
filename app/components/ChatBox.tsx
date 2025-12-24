"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessage } from "../lib/api";
import MarkdownRenderer from "./MarkdownRenderer";
import SendIcon from "./SendIcon";
import LoadingSpinner from "./LoadingSpinner";

export default function ChatBox() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentMessage = message.trim();
    if (currentMessage && !isLoading) {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setIsLoading(true);
      setStreamedResponse("");
      setUserMessage(currentMessage);
      setMessage("");

      const eventSource = sendMessage(currentMessage, (chunk) => {
        if (chunk?.event === "message" && chunk?.data) {
          setStreamedResponse((prev) => prev + chunk.data);
        }
        if (chunk?.event === "done") {
          setIsLoading(false);
          eventSourceRef.current = null;
        }
        if (chunk?.error) {
          console.error("Error:", chunk.error);
          setIsLoading(false);
          eventSourceRef.current = null;
        }
      });

      eventSourceRef.current = eventSource;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pb-4">
      {(userMessage || streamedResponse) && (
        <div className="w-full max-w-3xl px-4 mb-2 space-y-2">
          {userMessage && (
            <div className="rounded-lg bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100">
              {userMessage}
            </div>
          )}
          {streamedResponse && (
            <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100">
              <MarkdownRenderer content={streamedResponse} />
              {isLoading && (
                <span className="inline-block w-2 h-4 ml-1 bg-zinc-900 dark:bg-zinc-100 animate-pulse" />
              )}
            </div>
          )}
        </div>
      )}
      <div className="w-full max-w-3xl px-4">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message..."
            disabled={isLoading}
            className="flex-1 border-none bg-transparent text-zinc-900 placeholder-zinc-500 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            aria-label={isLoading ? "Loading" : "Send message"}
          >
            {isLoading ? <LoadingSpinner /> : <SendIcon />}
          </button>
        </form>
      </div>
    </div>
  );
}
