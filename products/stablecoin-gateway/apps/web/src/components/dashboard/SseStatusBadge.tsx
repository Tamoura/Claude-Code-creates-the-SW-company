type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SseStatusBadgeProps {
  state: ConnectionState;
}

/**
 * Badge showing SSE connection status
 *
 * Visual indicator for real-time connection state with appropriate
 * color coding and text for each state.
 */
export default function SseStatusBadge({ state }: SseStatusBadgeProps) {
  const config = {
    disconnected: {
      text: 'Offline',
      dotClass: 'bg-gray-400',
      textClass: 'text-text-muted',
      pulse: false,
    },
    connecting: {
      text: 'Connecting...',
      dotClass: 'bg-yellow-400',
      textClass: 'text-accent-yellow',
      pulse: true,
    },
    connected: {
      text: 'Live',
      dotClass: 'bg-green-400',
      textClass: 'text-accent-green',
      pulse: false,
    },
    error: {
      text: 'Disconnected',
      dotClass: 'bg-red-400',
      textClass: 'text-red-400',
      pulse: false,
    },
  }[state];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card-bg border border-card-border ${config.textClass}`}>
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
        {config.pulse && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${config.dotClass} animate-ping opacity-75`} />
        )}
      </div>
      <span className="text-xs font-medium">{config.text}</span>
    </div>
  );
}
