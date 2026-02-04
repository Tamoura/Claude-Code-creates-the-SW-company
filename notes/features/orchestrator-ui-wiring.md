# Orchestrator UI Wiring

## Feature Summary

Connect the existing multi-agent orchestrator to the chat UI with a toggle
button, and add an agent activity sidebar panel.

## Key Decisions

- **No new API routes needed** - `api.orchestrator.ts` already exists and streams
  SSE in the AI SDK data stream format
- **Follow existing chatMode toggle pattern** in ChatBox for the orchestrator toggle
- **Use nanostores atom** for `orchestratorModeStore` with localStorage persistence
  (matches existing pattern in settings.ts)
- **`useChat({ api })` prop** controls routing - simplest integration point
- **ProgressAnnotation data already flows** from orchestrator -> ProgressCompilation
- **Agent sidebar** parses ProgressAnnotation[] to show role-based status

## Architecture

```
ChatBox toggle -> orchestratorMode state
    -> Chat.client.tsx: useChat({ api: orchestratorMode ? '/api/orchestrator' : '/api/chat' })
    -> BaseChat.tsx: conditionally render AgentActivityPanel
    -> AgentActivityPanel reads progressAnnotations to show agent status
```

## Files Modified

### Step 6 - Orchestrator Toggle
- `app/lib/stores/settings.ts` - orchestratorModeStore atom + persistence
- `app/lib/hooks/useSettings.ts` - expose orchestratorMode + setter
- `app/components/chat/Chat.client.tsx` - conditional useChat api prop
- `app/components/chat/BaseChat.tsx` - new props, pass to ChatBox
- `app/components/chat/ChatBox.tsx` - toggle button (i-ph:users-three)

### Step 7 - Agent Activity Panel
- `app/components/chat/AgentActivityPanel.tsx` (new)
- `app/components/chat/BaseChat.tsx` - conditionally render panel

## Test Files
- `app/components/chat/__tests__/orchestrator-toggle.test.tsx` (10 tests)
- `app/components/chat/__tests__/agent-activity-panel.test.tsx` (11 tests)

## Status
- PR: https://github.com/Tamoura/Claude-Code-creates-the-SW-company/pull/98
- Branch: `feature/shipwright/orchestrator-ui`
- Base: `feature/shipwright/dev`
- Tests: 117/117 passing (96 existing + 21 new)
