'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, ApiError } from '@/lib/api';
import { StatCards } from '@/components/StatCards';
import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TasksResponse {
  tasks: Task[];
  total: number;
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, pending: 0 });
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get<TasksResponse>('/api/v1/tasks');
      const taskList = response.tasks || [];
      setTasks(taskList);

      const completed = taskList.filter((t) => t.completed).length;
      setStats({
        total: taskList.length,
        completed,
        pending: taskList.length - completed,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        return;
      }
      setError('Failed to load tasks. Please try again.');
    } finally {
      setIsLoadingTasks(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated, fetchTasks]);

  const handleTaskCreated = () => {
    fetchTasks();
  };

  const handleTaskUpdated = () => {
    fetchTasks();
  };

  const handleTaskDeleted = () => {
    fetchTasks();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            TaskFlow
          </h1>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden text-sm text-gray-600 sm:inline" aria-label="Logged in user">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Error Banner */}
        {error && (
          <div
            className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-3 text-red-500 hover:text-red-700"
                aria-label="Dismiss error"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <StatCards
          total={stats.total}
          completed={stats.completed}
          pending={stats.pending}
        />

        {/* Add Task Form */}
        <div className="mt-6 sm:mt-8">
          <TaskForm onTaskCreated={handleTaskCreated} />
        </div>

        {/* Task List */}
        <div className="mt-6 sm:mt-8">
          {isLoadingTasks ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <p className="text-sm text-gray-500">Loading tasks...</p>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-900/5">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No tasks yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No tasks yet. Create your first task above!
              </p>
            </div>
          ) : (
            <TaskList
              tasks={tasks}
              onTaskUpdated={handleTaskUpdated}
              onTaskDeleted={handleTaskDeleted}
            />
          )}
        </div>
      </main>
    </div>
  );
}
