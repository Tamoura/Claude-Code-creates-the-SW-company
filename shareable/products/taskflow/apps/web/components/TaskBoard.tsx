'use client';

import { useState } from 'react';
import { createTask, deleteTask, updateTask } from '@/lib/api';
import { Project, Task, TaskStatus } from '@/lib/types';
import { TaskList } from './TaskList';

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'TODO',
};

interface TaskBoardProps {
  initialTasks: Task[];
  projects: Project[];
}

/**
 * Owns task state for the page: add, advance status, delete. Errors from the
 * API are surfaced inline rather than thrown away. [US-04][US-05][FR-009..011]
 */
export function TaskBoard({ initialTasks, projects }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const projectId = projects[0]?.id;

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !projectId) return;

    setPending(true);
    setError(null);
    try {
      const { task } = await createTask({ title: title.trim(), projectId });
      setTasks((current) => [task, ...current]);
      setTitle('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add the task');
    } finally {
      setPending(false);
    }
  }

  async function handleAdvance(task: Task) {
    setError(null);
    try {
      const { task: updated } = await updateTask(task.id, { status: NEXT_STATUS[task.status] });
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the task');
    }
  }

  async function handleDelete(task: Task) {
    setError(null);
    try {
      await deleteTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the task');
    }
  }

  return (
    <section className="mt-8">
      <form onSubmit={handleAdd} className="flex gap-2">
        <label htmlFor="new-task" className="sr-only">
          New task title
        </label>
        <input
          id="new-task"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          className="flex-1 rounded-md border border-current/20 bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !projectId}
          className="rounded-md border border-current/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add task'}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <TaskList tasks={tasks} onAdvance={handleAdvance} onDelete={handleDelete} />
    </section>
  );
}
