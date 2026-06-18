'use client';

import { useState } from 'react';
import {
  Send,
  Plus,
  Brain,
  Clock,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock conversation data
const conversations = [
  { id: '1', title: 'AWS to GCP migration', time: '2h ago', active: true },
  { id: '2', title: 'SOC2 compliance readiness', time: '5h ago', active: false },
  { id: '3', title: 'Kubernetes vs ECS decision', time: 'Yesterday', active: false },
  { id: '4', title: 'Tech debt prioritization Q2', time: '2 days ago', active: false },
  { id: '5', title: 'Build vs buy: Auth system', time: '3 days ago', active: false },
];

const messages = [
  {
    role: 'user' as const,
    content: 'Should we migrate our primary workload from AWS to GCP? We\'re a 50-person startup running 12 microservices on ECS.',
    time: '2:14 PM',
  },
  {
    role: 'assistant' as const,
    content: `Based on your company profile (50 engineers, 12 microservices on ECS, Series B), here's my analysis:

**Recommendation: Stay on AWS, but optimize**

The migration cost-benefit doesn't favor a move right now. Here's why:

### Migration Costs (Estimated)
- **Engineering time**: 3-6 months of 2-3 engineers = $180K-$540K loaded cost
- **Downtime risk**: Even with blue-green, expect 2-4 incidents during migration
- **Retraining**: Team needs GCP-specific knowledge (IAM, networking, monitoring differ significantly)
- **Vendor lock-in migration**: ECS → GKE requires container orchestration rework

### What to Do Instead
1. **Right-size instances** — Your CloudWatch data suggests 40% over-provisioning on 4 services
2. **Reserved Instances** — You're running 100% on-demand. RIs would save ~30% ($7,400/month)
3. **S3 lifecycle policies** — 2.1TB in Standard that should be in IA or Glacier

### When Migration WOULD Make Sense
- If you adopt BigQuery-heavy analytics (GCP's strongest differentiator)
- If Google Cloud offers >40% sustained discount vs AWS equivalent
- If your ML workload grows beyond 20% of compute (TPU advantage)

*Sources: [1] AWS Well-Architected Framework, [2] Flexera 2025 Cloud Report, [3] Your company profile data*`,
    time: '2:15 PM',
    citations: [
      { id: 1, title: 'AWS Well-Architected Framework', source: 'Knowledge Base' },
      { id: 2, title: 'Flexera 2025 Cloud Report', source: 'Knowledge Base' },
      { id: 3, title: 'Company Profile: TechCorp', source: 'Organization Data' },
    ],
  },
  {
    role: 'user' as const,
    content: 'What about the reserved instances — how do we calculate the right commitment level?',
    time: '2:18 PM',
  },
  {
    role: 'assistant' as const,
    content: `Great follow-up. Here's a framework for RI commitment:

### Step 1: Baseline Analysis (2 weeks of data minimum)
Look at your **steady-state utilization** — the minimum compute you need 24/7. For your 12 microservices:
- \`api-gateway\`: Always running → RI candidate
- \`user-service\`: Always running → RI candidate
- \`analytics-worker\`: Bursty (3x during business hours) → On-demand or Savings Plan

### Step 2: Commitment Strategy
| Service Type | Strategy | Savings |
|---|---|---|
| Core services (always-on) | 1-year Standard RI | ~30% |
| Predictable growth | Convertible RI | ~20% |
| Variable/bursty | Compute Savings Plan | ~15% |
| Dev/staging | Spot instances | ~60-80% |

### Step 3: Start Conservative
- **Month 1**: Commit to 60% of your steady-state baseline
- **Month 2**: Analyze utilization, add 10-15% more
- **Month 3**: Fine-tune with Convertible RIs for growth services

### Your Estimated Savings
Based on your current $24,580/month spend:
- Conservative (60% RI): **$4,425/month saved**
- Moderate (75% RI + Savings Plan): **$6,128/month saved**
- Aggressive (85% RI): **$7,374/month saved** but less flexibility

I'd recommend the **moderate approach** — it balances savings with the flexibility you need at your growth stage.

*AI-generated advisory — not professional financial advice*`,
    time: '2:19 PM',
    citations: [
      { id: 1, title: 'AWS RI Best Practices', source: 'Knowledge Base' },
      { id: 4, title: 'Cloud Cost Optimization Playbook', source: 'Knowledge Base' },
    ],
  },
];

export default function ChatPage() {
  const [input, setInput] = useState('');

  return (
    <div className="-mx-6 -my-8 flex h-[calc(100vh-64px)]">
      {/* Conversation sidebar */}
      <div className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-body-sm font-semibold text-slate-900">Conversations</h2>
          <button className="rounded-[8px] p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className={cn(
                'flex w-full items-start gap-3 rounded-[8px] px-3 py-2.5 text-left transition-colors',
                conv.active
                  ? 'bg-brand-light'
                  : 'hover:bg-slate-50'
              )}
            >
              <Brain
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  conv.active ? 'text-brand' : 'text-slate-400'
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate text-body-sm',
                    conv.active ? 'font-medium text-brand' : 'text-slate-700'
                  )}
                >
                  {conv.title}
                </p>
                <p className="text-caption text-slate-400">{conv.time}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area (dark) */}
      <div className="flex flex-1 flex-col bg-chat-bg">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-chat-border px-6 py-3">
          <div>
            <h2 className="text-body-sm font-semibold text-chat-text">
              AWS to GCP migration
            </h2>
            <p className="text-caption text-chat-muted">3 messages</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-chat-surface px-2.5 py-1">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
              <span className="text-micro text-chat-muted">AI Ready</span>
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-brand">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-2xl',
                    msg.role === 'user'
                      ? 'rounded-[12px_12px_4px_12px] bg-brand px-4 py-3 text-white'
                      : 'rounded-[4px_12px_12px_12px] border border-chat-border bg-chat-surface px-4 py-3'
                  )}
                >
                  <div
                    className={cn(
                      'text-body-sm whitespace-pre-line',
                      msg.role === 'assistant' ? 'text-chat-text' : 'text-white'
                    )}
                  >
                    {msg.content.split('\n').map((line, j) => {
                      if (line.startsWith('### ')) {
                        return (
                          <h4 key={j} className="mt-3 mb-1 text-body-sm font-semibold">
                            {line.replace('### ', '')}
                          </h4>
                        );
                      }
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <p key={j} className="mt-2 font-semibold">
                            {line.replace(/\*\*/g, '')}
                          </p>
                        );
                      }
                      if (line.startsWith('| ')) {
                        return (
                          <p key={j} className="font-mono text-caption text-chat-muted">
                            {line}
                          </p>
                        );
                      }
                      if (line.startsWith('- ') || line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                        return (
                          <p key={j} className="ml-2">
                            {line}
                          </p>
                        );
                      }
                      if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
                        return (
                          <p key={j} className="mt-3 text-caption italic text-chat-muted">
                            {line.replace(/\*/g, '')}
                          </p>
                        );
                      }
                      return line ? <p key={j}>{line}</p> : <br key={j} />;
                    })}
                  </div>

                  {/* AI message footer */}
                  {msg.role === 'assistant' && (
                    <div className="mt-3 flex items-center justify-between border-t border-chat-border pt-2">
                      <div className="flex items-center gap-2">
                        <button className="rounded p-1 text-chat-muted hover:bg-white/5 hover:text-chat-text">
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded p-1 text-chat-muted hover:bg-white/5 hover:text-chat-text">
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded p-1 text-chat-muted hover:bg-white/5 hover:text-chat-text">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-caption text-chat-muted">{msg.time}</span>
                    </div>
                  )}

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.citations.map((cit) => (
                        <button
                          key={cit.id}
                          className="inline-flex items-center gap-1 rounded-full border border-chat-border bg-white/5 px-2 py-0.5 text-micro text-chat-citation hover:bg-white/10"
                        >
                          <BookOpen className="h-2.5 w-2.5" />
                          [{cit.id}] {cit.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* User message time */}
                  {msg.role === 'user' && (
                    <p className="mt-1 text-right text-caption text-white/60">
                      {msg.time}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-chat-border bg-chat-surface px-6 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-3">
              <div className="flex-1 rounded-xl border border-chat-border bg-chat-bg px-4 py-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your AI advisor anything..."
                  rows={1}
                  className="w-full resize-none bg-transparent text-body-sm text-chat-text placeholder:text-chat-muted focus:outline-none"
                />
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-caption text-chat-muted">
                      <Sparkles className="h-3 w-3" />
                      Powered by Claude
                    </span>
                  </div>
                  <span className="text-caption text-chat-muted">
                    {input.length}/10,000
                  </span>
                </div>
              </div>
              <button
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                  input.trim()
                    ? 'bg-brand text-white hover:bg-brand-hover'
                    : 'bg-white/5 text-chat-muted'
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1 text-caption text-chat-muted">
              <AlertTriangle className="h-3 w-3" />
              AI-generated advisory — not a substitute for professional advice
            </p>
          </div>
        </div>
      </div>

      {/* Citations panel */}
      <div className="hidden w-80 shrink-0 border-l border-slate-200 bg-white xl:flex xl:flex-col">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-body-sm font-semibold text-slate-900">Sources & Context</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <p className="text-overline text-slate-400">KNOWLEDGE SOURCES</p>
              <div className="mt-2 space-y-2">
                {[
                  { title: 'AWS Well-Architected Framework', type: 'Best Practice Guide' },
                  { title: 'Flexera 2025 Cloud Report', type: 'Industry Report' },
                  { title: 'AWS RI Best Practices', type: 'Cost Optimization' },
                  { title: 'Cloud Cost Optimization Playbook', type: 'Playbook' },
                ].map((source) => (
                  <div
                    key={source.title}
                    className="flex items-start gap-2 rounded-[8px] border border-slate-100 p-2.5"
                  >
                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                    <div>
                      <p className="text-body-sm font-medium text-slate-900">{source.title}</p>
                      <p className="text-caption text-slate-500">{source.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-overline text-slate-400">YOUR CONTEXT</p>
              <div className="mt-2 space-y-2">
                <div className="rounded-[8px] border border-slate-100 p-2.5">
                  <p className="text-caption font-medium text-slate-700">Company Profile</p>
                  <p className="text-caption text-slate-500">
                    50 employees, Series B, 12 microservices on AWS ECS
                  </p>
                </div>
                <div className="rounded-[8px] border border-slate-100 p-2.5">
                  <p className="text-caption font-medium text-slate-700">Cloud Spend</p>
                  <p className="font-tabular text-caption text-slate-500">
                    $24,580/month (100% AWS)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-overline text-slate-400">LEARNED PREFERENCES</p>
              <div className="mt-2 space-y-1.5">
                {[
                  'Prefers pragmatic over theoretical advice',
                  'Values cost-benefit analysis with numbers',
                  'Conservative on infrastructure changes',
                ].map((pref) => (
                  <p key={pref} className="text-caption text-slate-600">
                    {pref}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
