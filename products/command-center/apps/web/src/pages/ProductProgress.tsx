import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';

interface SprintTask {
  id: string;
  type: string;
  title: string;
  status: 'done' | 'in-progress' | 'pending';
  traceability: string;
}

interface Sprint {
  name: string;
  status: 'complete' | 'in-progress' | 'future';
  tasks: SprintTask[];
  progress: { done: number; total: number; percent: number };
}

interface UserStory {
  id: string;
  title: string;
  priority: string;
  persona: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  implemented: boolean;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  createdAt: string;
  url: string;
}

interface ProductProgressData {
  product: string;
  sprints: Sprint[];
  stories: UserStory[];
  issues: GitHubIssue[];
  summary: {
    totalTasks: number;
    doneTasks: number;
    totalStories: number;
    implementedStories: number;
    openIssues: number;
    closedIssues: number;
  };
}

type Tab = 'sprints' | 'stories' | 'issues';

export default function ProductProgress() {
  const { name } = useParams<{ name: string }>();
  const { data, loading } = useApi<ProductProgressData>(
    `/products/${name}/progress`,
  );
  const [activeTab, setActiveTab] = useState<Tab>('sprints');
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(
    new Set(),
  );
  const [expandedStories, setExpandedStories] = useState<Set<string>>(
    new Set(),
  );

  if (loading) return <LoadingSkeleton />;
  if (!data)
    return (
      <p className="text-red-400">
        Failed to load progress data for {name}
      </p>
    );

  const { summary } = data;

  const toggleSprint = (sprintName: string) => {
    const next = new Set(expandedSprints);
    if (next.has(sprintName)) next.delete(sprintName);
    else next.add(sprintName);
    setExpandedSprints(next);
  };

  const toggleStory = (storyId: string) => {
    const next = new Set(expandedStories);
    if (next.has(storyId)) next.delete(storyId);
    else next.add(storyId);
    setExpandedStories(next);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sprints', label: 'Sprints' },
    { key: 'stories', label: 'User Stories' },
    { key: 'issues', label: 'Issues' },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link
          to="/products"
          className="hover:text-gray-300 transition-colors"
        >
          Products
        </Link>
        <span>/</span>
        <Link
          to={`/products/${name}`}
          className="hover:text-gray-300 transition-colors"
        >
          {name}
        </Link>
        <span>/</span>
        <span className="text-gray-300">Progress</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-1">
        Progress Tracking
      </h1>
      <p className="text-gray-500 mb-8">
        Sprint tasks, user stories, and issues for {name}
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Tasks"
          value={`${summary.doneTasks}/${summary.totalTasks}`}
          sublabel={
            summary.totalTasks > 0
              ? `${Math.round((summary.doneTasks / summary.totalTasks) * 100)}% complete`
              : undefined
          }
          color="blue"
        />
        <StatCard
          label="Stories"
          value={`${summary.implementedStories}/${summary.totalStories}`}
          sublabel={
            summary.totalStories > 0
              ? `${Math.round((summary.implementedStories / summary.totalStories) * 100)}% implemented`
              : undefined
          }
          color="purple"
        />
        <StatCard
          label="Open Issues"
          value={summary.openIssues}
          color="orange"
        />
        <StatCard
          label="Closed Issues"
          value={summary.closedIssues}
          color="green"
        />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'text-blue-400 border-blue-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'sprints' && (
        <SprintsTab
          sprints={data.sprints}
          expanded={expandedSprints}
          onToggle={toggleSprint}
        />
      )}
      {activeTab === 'stories' && (
        <StoriesTab
          stories={data.stories}
          expanded={expandedStories}
          onToggle={toggleStory}
        />
      )}
      {activeTab === 'issues' && <IssuesTab issues={data.issues} />}
    </div>
  );
}

// --- Sprints Tab ---

function SprintsTab({
  sprints,
  expanded,
  onToggle,
}: {
  sprints: Sprint[];
  expanded: Set<string>;
  onToggle: (name: string) => void;
}) {
  if (sprints.length === 0) {
    return (
      <EmptyState message="No sprint data available. Add a docs/tasks.md to this product." />
    );
  }

  return (
    <div className="space-y-3">
      {sprints.map((sprint) => {
        const isOpen = expanded.has(sprint.name);
        return (
          <div
            key={sprint.name}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            {/* Sprint header */}
            <button
              onClick={() => onToggle(sprint.name)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors text-left"
            >
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-semibold text-white truncate">
                    {sprint.name}
                  </span>
                  <SprintStatusBadge status={sprint.status} />
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        sprint.status === 'complete'
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${sprint.progress.percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {sprint.progress.done}/{sprint.progress.total}
                  </span>
                </div>
              </div>
            </button>

            {/* Task list */}
            {isOpen && (
              <div className="border-t border-gray-800 px-5 py-3 space-y-2">
                {sprint.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 py-1.5"
                  >
                    <TaskStatusIcon status={task.status} />
                    <Badge variant="default">{task.id}</Badge>
                    <span className="text-xs text-gray-500 font-mono">
                      {task.type}
                    </span>
                    <span
                      className={`text-sm flex-1 ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-300'}`}
                    >
                      {task.title}
                    </span>
                    {task.traceability && (
                      <span className="text-xs text-gray-600">
                        {task.traceability}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SprintStatusBadge({
  status,
}: {
  status: Sprint['status'];
}) {
  if (status === 'complete') return <Badge variant="success">Complete</Badge>;
  if (status === 'in-progress')
    return <Badge variant="info">In Progress</Badge>;
  return <Badge variant="default">Future</Badge>;
}

function TaskStatusIcon({ status }: { status: SprintTask['status'] }) {
  if (status === 'done') {
    return (
      <svg
        className="w-4 h-4 text-emerald-500 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    );
  }
  if (status === 'in-progress') {
    return (
      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
      </div>
    );
  }
  return (
    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
      <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-600" />
    </div>
  );
}

// --- Stories Tab ---

function StoriesTab({
  stories,
  expanded,
  onToggle,
}: {
  stories: UserStory[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (stories.length === 0) {
    return (
      <EmptyState message="No user stories found. Add specs to docs/specs/ for this product." />
    );
  }

  return (
    <div className="space-y-3">
      {stories.map((story) => {
        const isOpen = expanded.has(story.id);
        return (
          <div
            key={story.id}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => onToggle(story.id)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors text-left"
            >
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    {story.id}: {story.title}
                  </span>
                  <Badge
                    variant={
                      story.priority === 'P1' ? 'warning' : 'default'
                    }
                  >
                    {story.priority}
                  </Badge>
                  {story.implemented ? (
                    <Badge variant="success">Implemented</Badge>
                  ) : (
                    <Badge variant="default">Pending</Badge>
                  )}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                {/* As a / I want / So that */}
                {story.asA && (
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>
                      <span className="text-gray-500 font-medium">
                        As a
                      </span>{' '}
                      {story.asA}
                    </p>
                    <p>
                      <span className="text-gray-500 font-medium">
                        I want to
                      </span>{' '}
                      {story.iWant}
                    </p>
                    <p>
                      <span className="text-gray-500 font-medium">
                        So that
                      </span>{' '}
                      {story.soThat}
                    </p>
                  </div>
                )}

                {/* Acceptance criteria */}
                {story.acceptanceCriteria.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Acceptance Criteria
                    </h4>
                    <div className="space-y-1.5">
                      {story.acceptanceCriteria.map((ac, idx) => (
                        <p
                          key={idx}
                          className="text-sm text-gray-400 pl-4 border-l-2 border-gray-700"
                        >
                          {ac}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {story.persona && (
                  <div className="text-xs text-gray-600">
                    Persona: {story.persona}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Issues Tab ---

function IssuesTab({ issues }: { issues: GitHubIssue[] }) {
  if (issues.length === 0) {
    return (
      <EmptyState message="No GitHub issues found for this product." />
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <a
          key={issue.number}
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {issue.state === 'open' ? (
              <svg
                className="w-4 h-4 text-green-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-purple-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.751.751 0 0 0-1.06-1.06L6.25 9.69 5.28 8.72a.751.751 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.06 0l5-5Z" />
              </svg>
            )}

            <span className="text-sm text-gray-500 font-mono">
              #{issue.number}
            </span>
            <span className="text-sm font-medium text-white flex-1">
              {issue.title}
            </span>
            <Badge
              variant={issue.state === 'open' ? 'warning' : 'success'}
            >
              {issue.state}
            </Badge>
          </div>

          {issue.labels.length > 0 && (
            <div className="flex gap-2 mt-2 ml-7">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className="text-xs bg-gray-800 text-gray-400 rounded-full px-2 py-0.5"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-600 mt-2 ml-7">
            Opened {new Date(issue.createdAt).toLocaleDateString()}
          </div>
        </a>
      ))}
    </div>
  );
}

// --- Shared ---

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
      <svg
        className="w-12 h-12 mx-auto mb-4 text-gray-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-48 mb-6" />
      <div className="h-8 bg-gray-800 rounded w-56 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-800 rounded-xl" />
        ))}
      </div>
      <div className="h-10 bg-gray-800 rounded w-64 mb-6" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
