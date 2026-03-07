'use client';

// Re-export the context hook as useAuth for backward compatibility.
// All auth state is managed by AuthContext — this hook is a thin wrapper.
export { useAuthContext as useAuth } from '@/context/AuthContext';
