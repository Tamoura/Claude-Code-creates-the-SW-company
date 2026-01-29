import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InsightsPanel } from '../InsightsPanel'

const mockSummary = [
  'Team reviewed Q1 API architecture',
  'Decided on GraphQL Federation'
]

const mockActionItems = [
  {
    id: 'ai-1',
    text: 'Create RFC document',
    owner: 'Sarah Chen',
    dueDate: '2026-02-05',
    timestamp: '00:15:23',
    timeInSeconds: 923,
    priority: 'high' as const
  }
]

const mockKeyMoments = [
  {
    id: 'km-1',
    timestamp: '00:02:34',
    timeInSeconds: 154,
    type: 'high_engagement',
    title: 'Active Discussion',
    description: 'Team discussing technical trade-offs',
    significance: 'high'
  }
]

describe('InsightsPanel', () => {
  it('renders summary section', () => {
    render(
      <InsightsPanel
        summary={mockSummary}
        actionItems={[]}
        keyMoments={[]}
      />
    )
    expect(screen.getByText('Meeting Summary')).toBeInTheDocument()
    expect(screen.getByText(/Team reviewed Q1 API architecture/)).toBeInTheDocument()
  })

  it('renders action items with count', () => {
    render(
      <InsightsPanel
        summary={[]}
        actionItems={mockActionItems}
        keyMoments={[]}
      />
    )
    expect(screen.getByText(/Action Items \(1\)/)).toBeInTheDocument()
    expect(screen.getByText('Create RFC document')).toBeInTheDocument()
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
  })

  it('renders key moments', () => {
    render(
      <InsightsPanel
        summary={[]}
        actionItems={[]}
        keyMoments={mockKeyMoments}
      />
    )
    expect(screen.getByText(/Key Moments \(1\)/)).toBeInTheDocument()
    expect(screen.getByText('Active Discussion')).toBeInTheDocument()
  })

  it('calls onTimeClick when action item is clicked', () => {
    const handleTimeClick = vi.fn()
    render(
      <InsightsPanel
        summary={[]}
        actionItems={mockActionItems}
        keyMoments={[]}
        onTimeClick={handleTimeClick}
      />
    )

    fireEvent.click(screen.getByText('Create RFC document'))
    expect(handleTimeClick).toHaveBeenCalledWith(923)
  })
})
