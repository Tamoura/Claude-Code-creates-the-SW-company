const TEAM_FEATURES = [
  {
    title: "Invite Members",
    description:
      "Send email invitations to your team members. They will receive a link to join your organization workspace and access shared advisory resources.",
    icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  },
  {
    title: "Role Assignment",
    description:
      "Assign roles such as Admin, Editor, or Viewer to control who can create ADRs, modify risk assessments, and generate reports.",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "Shared Conversations",
    description:
      "Share advisory conversation threads with team members for collaborative decision-making. Add comments and tag colleagues for input.",
    icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z",
  },
] as const;

export default function TeamPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Team Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your team members and collaboration settings to get the most
          out of CTOaaS across your organization.
        </p>
      </div>

      {/* Feature cards */}
      <section aria-label="Team features">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Collaboration Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TEAM_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-background rounded-xl p-6 shadow-sm border border-border"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={feature.icon}
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Team members empty state */}
      <section className="mt-10" aria-label="Team members">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Team Members
          </h2>
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] cursor-not-allowed opacity-60"
            aria-label="Invite team member"
          >
            Invite Member
          </button>
        </div>
        <div className="bg-background rounded-xl p-8 border border-border text-center">
          <svg
            className="w-12 h-12 text-muted-foreground mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-muted-foreground font-medium">
            No team members yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to a Pro or Enterprise plan to invite team members and
            collaborate on technology decisions.
          </p>
        </div>
      </section>
    </div>
  );
}
