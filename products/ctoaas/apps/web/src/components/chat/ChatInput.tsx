"use client";

import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { MAX_MESSAGE_LENGTH } from "@/types/chat";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

/**
 * Chat message input with auto-resize textarea, character count,
 * send on Enter (Shift+Enter for newline), and max length enforcement.
 * [US-01][FR-001]
 */
export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmedValue = value.trim();
  const canSend = trimmedValue.length > 0 && !isLoading;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(trimmedValue);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, trimmedValue, onSend]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_MESSAGE_LENGTH) {
      setValue(newValue);
    } else {
      setValue(newValue.slice(0, MAX_MESSAGE_LENGTH));
    }
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border p-4 bg-background">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <label htmlFor="chat-message-input" className="sr-only">
            Message the AI advisor
          </label>
          <textarea
            ref={textareaRef}
            id="chat-message-input"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI CTO advisor..."
            disabled={isLoading}
            rows={1}
            className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none min-h-[48px] max-h-[200px]"
            aria-label="Message the AI advisor"
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className="flex items-center justify-center w-12 h-12 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex justify-end mt-1">
        <span
          className={`text-xs ${
            value.length >= MAX_MESSAGE_LENGTH
              ? "text-red-500"
              : "text-muted-foreground"
          }`}
        >
          {value.length} / {MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </div>
  );
}
