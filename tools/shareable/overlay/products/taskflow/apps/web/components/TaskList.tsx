import { Task } from '@/lib/types';

const STATUS_LABEL: Record<Task['status'], string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

interface TaskListProps {
  tasks: Task[];
  onAdvance: (task: Task) => void;
  onDelete: (task: Task) => void;
}

/** Presentational list — no data fetching, so it is trivial to test. [US-04] */
export function TaskList({ tasks, onAdvance, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="mt-8 text-sm opacity-70">No tasks yet. Add the first one above.</p>;
  }

  return (
    <ul className="mt-8 divide-y divide-current/10">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-3 py-3">
          <span className="flex-1 text-sm">{task.title}</span>
          <button
            type="button"
            onClick={() => onAdvance(task)}
            aria-label={`Advance ${task.title}`}
            className="rounded-full border border-current/20 px-3 py-1 text-xs"
          >
            {STATUS_LABEL[task.status]}
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            aria-label={`Delete ${task.title}`}
            className="text-xs opacity-60 hover:opacity-100"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
