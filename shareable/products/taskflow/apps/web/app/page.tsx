import { listProjects, listTasks } from '@/lib/api';
import { TaskBoard } from '@/components/TaskBoard';

/**
 * Server component: fetches the first page of tasks and hands them to the
 * client board. [US-04][FR-009]
 */
export default async function HomePage() {
  try {
    const [{ tasks }, { projects }] = await Promise.all([listTasks(), listProjects()]);

    return (
      <main>
        <h1 className="text-2xl font-semibold tracking-tight">TaskFlow</h1>
        <p className="mt-1 text-sm opacity-70">
          {tasks.length} task{tasks.length === 1 ? '' : 's'} across {projects.length} project
          {projects.length === 1 ? '' : 's'}
        </p>
        <TaskBoard initialTasks={tasks} projects={projects} />
      </main>
    );
  } catch {
    return (
      <main>
        <h1 className="text-2xl font-semibold tracking-tight">TaskFlow</h1>
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          The API is not reachable. Start it with <code>pnpm --filter @taskflow/api dev</code> and
          reload.
        </p>
      </main>
    );
  }
}
