"use client";

import Link from "next/link";
import {
  MessageSquare,
  Shield,
  Zap,
  User,
  ArrowRight,
  BarChart3,
  Globe,
} from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { useRiskSummary } from "@/hooks/useRisks";
import { getScoreColor, RISK_CATEGORY_META } from "@/types/risks";
import type { RiskCategory } from "@/types/risks";

/**
 * Main dashboard page with summary cards:
 * - Recent Conversations
 * - Risk Posture
 * - Quick Actions
 * - Profile Completeness
 *
 * [US-04][FR-029]
 */
export default function DashboardPage() {
  const { conversations, isLoading: isLoadingConvs } = useConversations();
  const { data: riskData, isLoading: isLoadingRisks } = useRiskSummary();

  const recentConversations = conversations.slice(0, 3);
  const profileCompleteness = 35; // TODO: compute from user profile data

  return (
    <div>
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome to CTOaaS
        </h1>
        <p className="text-muted-foreground mt-1">
          Your AI-powered CTO advisory dashboard. Get strategic guidance
          tailored to your organization.
        </p>
      </div>

      {/* Summary cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Recent Conversations */}
        <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare
              className="w-5 h-5 text-primary-600"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold text-foreground">
              Recent Conversations
            </h2>
          </div>

          {isLoadingConvs && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}

          {!isLoadingConvs && recentConversations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No conversations yet. Start chatting with your AI advisor.
            </p>
          )}

          {!isLoadingConvs && recentConversations.length > 0 && (
            <ul className="space-y-2">
              {recentConversations.map((conv) => (
                <li key={conv.id}>
                  <Link
                    href={`/chat/${conv.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] transition-colors"
                  >
                    <span className="text-sm text-foreground truncate">
                      {conv.title}
                    </span>
                    <ArrowRight
                      className="w-4 h-4 text-muted-foreground flex-shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/chat"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            View all conversations
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Card 2: Risk Posture */}
        <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Shield
              className="w-5 h-5 text-primary-600"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold text-foreground">
              Risk Posture
            </h2>
          </div>

          {isLoadingRisks && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}

          {!isLoadingRisks && riskData && (
            <div className="space-y-3">
              {riskData.categories.map((cat) => {
                const meta =
                  RISK_CATEGORY_META[cat.category as RiskCategory];
                const scoreColor = getScoreColor(cat.score);
                return (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-foreground">
                      {meta?.label ?? cat.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${scoreColor.bg} border ${scoreColor.border}`}
                        aria-label={`Score ${cat.score}`}
                      />
                      <span className="text-sm font-medium text-foreground w-6 text-right">
                        {cat.score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/risks"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            View risk dashboard
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Card 3: Quick Actions */}
        <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Zap
              className="w-5 h-5 text-primary-600"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold text-foreground">
              Quick Actions
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/chat"
              aria-label="New Chat"
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[48px] transition-colors"
            >
              <MessageSquare
                className="w-5 h-5 text-primary-600"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-foreground">
                New Chat
              </span>
            </Link>
            <Link
              href="/risks"
              aria-label="View Risks"
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[48px] transition-colors"
            >
              <Shield
                className="w-5 h-5 text-primary-600"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-foreground">
                View Risks
              </span>
            </Link>
            <Link
              href="/costs/tco"
              aria-label="TCO Calculator"
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[48px] transition-colors"
            >
              <BarChart3
                className="w-5 h-5 text-primary-600"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-foreground">
                TCO Calculator
              </span>
            </Link>
            <Link
              href="/radar"
              aria-label="Tech Radar"
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[48px] transition-colors"
            >
              <Globe
                className="w-5 h-5 text-primary-600"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-foreground">
                Tech Radar
              </span>
            </Link>
          </div>
        </div>

        {/* Card 4: Profile Completeness */}
        <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <User
              className="w-5 h-5 text-primary-600"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold text-foreground">
              Profile Completeness
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Complete your profile for better recommendations
              </span>
              <span className="text-sm font-bold text-foreground">
                {profileCompleteness}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={profileCompleteness}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completeness"
              className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-primary-600 rounded-full transition-all duration-300"
                style={{ width: `${profileCompleteness}%` }}
              />
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Company basics completed
              </li>
              <li className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                Tech stack partially set
              </li>
              <li className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                Challenges not configured
              </li>
            </ul>
          </div>

          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Complete profile
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
