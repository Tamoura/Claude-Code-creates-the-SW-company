/**
 * Chat domain types for CTOaaS advisory chat interface.
 * Maps to the backend conversation and message API response shapes.
 *
 * [US-01][US-04][FR-001][FR-002][FR-006]
 */

export type MessageRole = "user" | "assistant";

export type FeedbackType = "positive" | "negative" | null;

export interface Citation {
  id: string;
  title: string;
  author: string;
  relevanceScore: number;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
  feedback?: FeedbackType;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface SendMessageRequest {
  message: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  conversationId: string;
  message: ChatMessage;
}

/** Maximum character count for a chat message. */
export const MAX_MESSAGE_LENGTH = 10000;

/** AI disclaimer text shown below assistant messages. */
export const AI_DISCLAIMER =
  "This response is AI-generated and should not be considered professional advice.";
