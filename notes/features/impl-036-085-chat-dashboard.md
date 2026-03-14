# IMPL-036 + IMPL-085: Chat Interface & Dashboard Page

## Task
- IMPL-036: Full chat interface with message list, input, streaming, citations, feedback
- IMPL-085: Dashboard page with summary cards (conversations, risks, quick actions, profile)

## Approach
- TDD: Write tests first, then implement
- Custom chat components (no CopilotKit UI dependency for components)
- API calls via existing `apiClient` from `src/lib/api.ts`
- Follow existing patterns (useRisks hook pattern for useChat/useConversations)

## Files to Create
- `src/types/chat.ts` - Chat domain types
- `src/components/chat/ChatMessage.tsx` - Message component
- `src/components/chat/ChatInput.tsx` - Input component
- `src/components/chat/ConversationSidebar.tsx` - Sidebar
- `src/components/chat/CitationPanel.tsx` - Citation display
- `src/hooks/useChat.ts` - Chat hook
- `src/hooks/useConversations.ts` - Conversations list hook
- `src/app/(dashboard)/chat/page.tsx` - Replace stub
- `src/app/(dashboard)/chat/[conversationId]/page.tsx` - Conversation view
- `src/app/(dashboard)/dashboard/page.tsx` - Replace stub

## Test Files
- `src/components/chat/__tests__/ChatMessage.test.tsx`
- `src/components/chat/__tests__/ChatInput.test.tsx`
- `src/components/chat/__tests__/ConversationSidebar.test.tsx`
- `src/app/(dashboard)/chat/__tests__/page.test.tsx`
- `src/app/(dashboard)/dashboard/__tests__/page.test.tsx`
