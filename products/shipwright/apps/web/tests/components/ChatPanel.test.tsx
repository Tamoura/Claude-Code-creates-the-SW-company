import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from '../../src/components/Chat/ChatPanel';
import { ChatInput } from '../../src/components/Chat/ChatInput';
import { MessageBubble } from '../../src/components/Chat/MessageBubble';
import type { ChatMessage } from '../../src/lib/types';

describe('MessageBubble', () => {
  it('should render user messages', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Hello world',
    };

    render(<MessageBubble message={msg} />);

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should render assistant messages with markdown', () => {
    const msg: ChatMessage = {
      id: '2',
      role: 'assistant',
      content: '**Bold text**',
      agentRole: 'product-manager',
    };

    render(<MessageBubble message={msg} />);

    expect(screen.getByText('Bold text')).toBeInTheDocument();
  });

  it('should show agent role label for assistant messages', () => {
    const msg: ChatMessage = {
      id: '3',
      role: 'assistant',
      content: 'Plan output',
      agentRole: 'product-manager',
    };

    render(<MessageBubble message={msg} />);

    expect(screen.getByText(/product manager/i)).toBeInTheDocument();
  });
});

describe('ChatInput', () => {
  it('should render a textarea and send button', () => {
    render(<ChatInput onSend={vi.fn()} isStreaming={false} models={[]} selectedModel="" onModelChange={vi.fn()} />);

    expect(screen.getByPlaceholderText(/describe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should call onSend with input text when send is clicked', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} isStreaming={false} models={[]} selectedModel="" onModelChange={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/describe/i);
    fireEvent.change(textarea, { target: { value: 'Build a todo app' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith('Build a todo app');
  });

  it('should disable send button while streaming', () => {
    render(<ChatInput onSend={vi.fn()} isStreaming={true} models={[]} selectedModel="" onModelChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });
});

describe('ChatPanel', () => {
  it('should render all messages', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'Hi there', agentRole: 'product-manager' },
    ];

    render(<ChatPanel messages={messages} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('should render empty state when no messages', () => {
    render(<ChatPanel messages={[]} />);

    expect(screen.getByText(/describe what you want to build/i)).toBeInTheDocument();
  });
});
