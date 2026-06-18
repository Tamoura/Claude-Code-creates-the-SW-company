import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "../ChatInput";
import { MAX_MESSAGE_LENGTH } from "@/types/chat";

describe("ChatInput", () => {
  it("renders textarea and send button", () => {
    render(<ChatInput onSend={jest.fn()} isLoading={false} />);
    expect(
      screen.getByRole("textbox", { name: /message/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send/i })
    ).toBeInTheDocument();
  });

  it("calls onSend with message text on submit", async () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(textarea, {
      target: { value: "Hello AI advisor" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith("Hello AI advisor");
  });

  it("clears input after sending", () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByRole("textbox", {
      name: /message/i,
    }) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Test message" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(textarea.value).toBe("");
  });

  it("disables send button when loading", () => {
    render(<ChatInput onSend={jest.fn()} isLoading={true} />);
    expect(
      screen.getByRole("button", { name: /send/i })
    ).toBeDisabled();
  });

  it("disables send button when input is empty", () => {
    render(<ChatInput onSend={jest.fn()} isLoading={false} />);
    expect(
      screen.getByRole("button", { name: /send/i })
    ).toBeDisabled();
  });

  it("does not call onSend with empty/whitespace message", () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows character count", () => {
    render(<ChatInput onSend={jest.fn()} isLoading={false} />);
    const textarea = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(screen.getByText(`5 / ${MAX_MESSAGE_LENGTH}`)).toBeInTheDocument();
  });

  it("prevents input beyond max length", () => {
    render(<ChatInput onSend={jest.fn()} isLoading={false} />);
    const textarea = screen.getByRole("textbox", {
      name: /message/i,
    }) as HTMLTextAreaElement;
    const longText = "a".repeat(MAX_MESSAGE_LENGTH + 100);
    fireEvent.change(textarea, { target: { value: longText } });
    expect(textarea.value.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
  });

  it("sends on Enter key (not Shift+Enter)", () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(textarea, {
      target: { value: "Test message" },
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSend).toHaveBeenCalledWith("Test message");
  });

  it("does not send on Shift+Enter", () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(textarea, {
      target: { value: "Test message" },
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });
});
