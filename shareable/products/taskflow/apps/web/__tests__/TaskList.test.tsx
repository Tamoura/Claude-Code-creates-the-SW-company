import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskList } from '@/components/TaskList';
import { Task } from '@/lib/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'a3f1c2d4-0000-4000-8000-000000000001',
    title: 'Write the spec',
    description: null,
    status: 'TODO',
    dueDate: null,
    projectId: 'b3f1c2d4-0000-4000-8000-000000000002',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('TaskList', () => {
  it('shows an empty state when there are no tasks [US-04][AC-14]', () => {
    render(<TaskList tasks={[]} onAdvance={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it('renders each task with its status [US-04][AC-15]', () => {
    render(
      <TaskList
        tasks={[makeTask(), makeTask({ id: 'x', title: 'Ship it', status: 'DONE' })]}
        onAdvance={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Write the spec')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /advance ship it/i })).toHaveTextContent('Done');
  });

  it('calls onAdvance when the status button is pressed [US-05][AC-16]', async () => {
    const onAdvance = vi.fn();
    const task = makeTask();
    render(<TaskList tasks={[task]} onAdvance={onAdvance} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /advance write the spec/i }));

    expect(onAdvance).toHaveBeenCalledWith(task);
  });

  it('calls onDelete when delete is pressed [US-05][AC-17]', async () => {
    const onDelete = vi.fn();
    const task = makeTask();
    render(<TaskList tasks={[task]} onAdvance={vi.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: /delete write the spec/i }));

    expect(onDelete).toHaveBeenCalledWith(task);
  });
});
