'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import type { Task } from '@/app/dashboard/page';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
}

interface TaskItemProps {
  task: Task;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
}

function TaskItem({ task, onTaskUpdated, onTaskDeleted }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleComplete = async () => {
    setIsToggling(true);
    setError(null);
    try {
      await apiClient.put(`/api/v1/tasks/${task.id}`, {
        completed: !task.completed,
      });
      onTaskUpdated();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update task.');
      }
    } finally {
      setIsToggling(false);
    }
  };

  const startEditing = () => {
    setEditTitle(task.title);
    setIsEditing(true);
    setError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setError(null);
  };

  const saveEdit = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setError('Task title cannot be empty.');
      return;
    }

    if (trimmedTitle === task.title) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await apiClient.put(`/api/v1/tasks/${task.id}`, { title: trimmedTitle });
      setIsEditing(false);
      onTaskUpdated();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update task.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      deleteTimeoutRef.current = setTimeout(() => {
        setConfirmDelete(false);
      }, 3000);
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await apiClient.delete(`/api/v1/tasks/${task.id}`);
      onTaskDeleted();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to delete task.');
      }
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <li className="group">
      <div className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-gray-50 sm:px-4">
        {/* Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
          disabled={isToggling}
          onClick={handleToggleComplete}
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            task.completed
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-gray-300 hover:border-blue-400'
          } ${isToggling ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
        >
          {task.completed && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>

        {/* Title / Edit Input */}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <label htmlFor={`edit-task-${task.id}`} className="sr-only">
                Edit task title
              </label>
              <input
                id={`edit-task-${task.id}`}
                ref={editInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleEditKeyDown}
                onBlur={cancelEditing}
                disabled={isSaving}
                className="w-full rounded-md border border-blue-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Edit task title"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className={`block w-full truncate text-left text-sm transition-colors ${
                task.completed
                  ? 'text-gray-400 line-through'
                  : 'text-gray-900'
              }`}
              title="Click to edit"
              aria-label={`Edit "${task.title}"`}
            >
              {task.title}
            </button>
          )}
        </div>

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={startEditing}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Edit "${task.title}"`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={`rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${
                confirmDelete
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'text-gray-400 hover:bg-gray-200 hover:text-red-500'
              } ${isDeleting ? 'cursor-wait opacity-60' : ''}`}
              aria-label={confirmDelete ? `Confirm delete "${task.title}"` : `Delete "${task.title}"`}
            >
              {isDeleting ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Inline Error */}
      {error && (
        <div className="mx-3 mb-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600 sm:mx-4" role="alert">
          {error}
        </div>
      )}
    </li>
  );
}

export function TaskList({ tasks, onTaskUpdated, onTaskDeleted }: TaskListProps) {
  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Tasks
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({tasks.length})
          </span>
        </h2>
      </div>

      <ul className="divide-y divide-gray-100" role="list" aria-label="Task list">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onTaskUpdated={onTaskUpdated}
            onTaskDeleted={onTaskDeleted}
          />
        ))}
      </ul>
    </div>
  );
}
