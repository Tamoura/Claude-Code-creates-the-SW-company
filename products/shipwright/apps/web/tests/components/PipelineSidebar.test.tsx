import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PipelineSidebar } from '../../src/components/Pipeline/PipelineSidebar';
import { AgentStep } from '../../src/components/Pipeline/AgentStep';
import type { AgentState } from '../../src/lib/types';

describe('AgentStep', () => {
  it('should render agent role name', () => {
    const state: AgentState = {
      role: 'product-manager',
      status: 'waiting',
      tokensIn: 0,
      tokensOut: 0,
    };

    render(<AgentStep agent={state} />);

    expect(screen.getByText(/product manager/i)).toBeInTheDocument();
  });

  it('should show working status indicator', () => {
    const state: AgentState = {
      role: 'architect',
      status: 'working',
      tokensIn: 0,
      tokensOut: 0,
    };

    render(<AgentStep agent={state} />);

    expect(screen.getByText(/architect/i)).toBeInTheDocument();
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-blue-500');
  });

  it('should show done status', () => {
    const state: AgentState = {
      role: 'backend-engineer',
      status: 'done',
      tokensIn: 150,
      tokensOut: 300,
    };

    render(<AgentStep agent={state} />);

    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-green-500');
  });

  it('should show failed status', () => {
    const state: AgentState = {
      role: 'qa-engineer',
      status: 'failed',
      tokensIn: 0,
      tokensOut: 0,
    };

    render(<AgentStep agent={state} />);

    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-red-500');
  });
});

describe('PipelineSidebar', () => {
  const agents: AgentState[] = [
    { role: 'product-manager', status: 'done', tokensIn: 100, tokensOut: 200 },
    { role: 'architect', status: 'done', tokensIn: 150, tokensOut: 250 },
    { role: 'backend-engineer', status: 'working', tokensIn: 50, tokensOut: 0 },
    { role: 'frontend-engineer', status: 'waiting', tokensIn: 0, tokensOut: 0 },
    { role: 'qa-engineer', status: 'waiting', tokensIn: 0, tokensOut: 0 },
  ];

  it('should render all 5 agent steps', () => {
    render(<PipelineSidebar agents={agents} totalTokensIn={300} totalTokensOut={450} />);

    expect(screen.getByText(/product manager/i)).toBeInTheDocument();
    expect(screen.getByText(/architect/i)).toBeInTheDocument();
    expect(screen.getByText(/backend/i)).toBeInTheDocument();
    expect(screen.getByText(/frontend/i)).toBeInTheDocument();
    expect(screen.getByText(/qa engineer/i)).toBeInTheDocument();
  });

  it('should show total token count', () => {
    render(<PipelineSidebar agents={agents} totalTokensIn={300} totalTokensOut={450} />);

    expect(screen.getByText(/750/)).toBeInTheDocument();
  });

  it('should show completion count', () => {
    render(<PipelineSidebar agents={agents} totalTokensIn={300} totalTokensOut={450} />);

    expect(screen.getByText(/2.*\/.*5/)).toBeInTheDocument();
  });
});
