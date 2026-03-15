import { render, screen, fireEvent } from "@testing-library/react";
import { ChatMessage } from "../ChatMessage";
import { AI_DISCLAIMER } from "@/types/chat";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

const userMessage: ChatMessageType = {
  id: "msg-1",
  role: "user",
  content: "What architecture should I use for our microservices?",
  createdAt: "2026-03-14T10:00:00Z",
};

const assistantMessage: ChatMessageType = {
  id: "msg-2",
  role: "assistant",
  content:
    "Based on your current team size, I recommend a modular monolith approach [1]. This provides clear boundaries [2] while avoiding distributed system complexity.",
  citations: [
    {
      id: "cite-1",
      title: "Modular Monolith Architecture",
      author: "Martin Fowler",
      relevanceScore: 0.95,
      url: "https://example.com/modular-monolith",
    },
    {
      id: "cite-2",
      title: "Bounded Contexts in Practice",
      author: "Eric Evans",
      relevanceScore: 0.88,
    },
  ],
  feedback: null,
  createdAt: "2026-03-14T10:00:05Z",
};

describe("ChatMessage", () => {
  it("renders user message with correct alignment", () => {
    const { container } = render(
      <ChatMessage message={userMessage} onFeedback={jest.fn()} />
    );
    expect(
      screen.getByText(
        /What architecture should I use for our microservices\?/
      )
    ).toBeInTheDocument();
    // User messages have indigo background
    const messageEl = container.querySelector("[data-testid='message-msg-1']");
    expect(messageEl).toBeInTheDocument();
  });

  it("renders assistant message with AI disclaimer", () => {
    render(
      <ChatMessage message={assistantMessage} onFeedback={jest.fn()} />
    );
    expect(screen.getByText(AI_DISCLAIMER)).toBeInTheDocument();
  });

  it("does not show AI disclaimer for user messages", () => {
    render(
      <ChatMessage message={userMessage} onFeedback={jest.fn()} />
    );
    expect(screen.queryByText(AI_DISCLAIMER)).not.toBeInTheDocument();
  });

  it("renders citation markers as clickable elements", () => {
    render(
      <ChatMessage message={assistantMessage} onFeedback={jest.fn()} />
    );
    const citations = screen.getAllByRole("button", { name: /citation/i });
    expect(citations.length).toBeGreaterThanOrEqual(1);
  });

  it("shows citation details when marker is clicked", () => {
    render(
      <ChatMessage message={assistantMessage} onFeedback={jest.fn()} />
    );
    const citationBtn = screen.getAllByRole("button", {
      name: /citation/i,
    })[0];
    fireEvent.click(citationBtn);
    expect(
      screen.getByText("Modular Monolith Architecture")
    ).toBeInTheDocument();
  });

  it("renders feedback buttons for assistant messages", () => {
    render(
      <ChatMessage message={assistantMessage} onFeedback={jest.fn()} />
    );
    expect(
      screen.getByRole("button", { name: /thumbs up/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /thumbs down/i })
    ).toBeInTheDocument();
  });

  it("does not render feedback buttons for user messages", () => {
    render(
      <ChatMessage message={userMessage} onFeedback={jest.fn()} />
    );
    expect(
      screen.queryByRole("button", { name: /thumbs up/i })
    ).not.toBeInTheDocument();
  });

  it("calls onFeedback with correct type when thumbs up clicked", () => {
    const onFeedback = jest.fn();
    render(
      <ChatMessage message={assistantMessage} onFeedback={onFeedback} />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /thumbs up/i })
    );
    expect(onFeedback).toHaveBeenCalledWith("msg-2", "positive");
  });

  it("calls onFeedback with correct type when thumbs down clicked", () => {
    const onFeedback = jest.fn();
    render(
      <ChatMessage message={assistantMessage} onFeedback={onFeedback} />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /thumbs down/i })
    );
    expect(onFeedback).toHaveBeenCalledWith("msg-2", "negative");
  });

  it("displays timestamp", () => {
    const { container } = render(
      <ChatMessage message={userMessage} onFeedback={jest.fn()} />
    );
    // The time element should be present
    const timeEl = container.querySelector("time");
    expect(timeEl).toBeInTheDocument();
    expect(timeEl).toHaveAttribute("datetime", "2026-03-14T10:00:00Z");
  });
});
