import { User, Building2, Bell, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 text-slate-900">Settings</h1>
        <p className="text-body-sm mt-1 text-slate-500">
          Manage your account, company profile, and advisory preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          {
            icon: User,
            title: 'Account',
            description: 'Email, password, and authentication settings',
            href: '/settings/account',
          },
          {
            icon: Building2,
            title: 'Company Profile',
            description: 'Tech stack, challenges, and organizational context',
            href: '/settings/profile',
          },
          {
            icon: Bell,
            title: 'Notifications',
            description: 'Email alerts for risk changes and advisory updates',
            href: '/settings/notifications',
          },
          {
            icon: Palette,
            title: 'Preferences',
            description: 'Advisory tone, detail level, and response format',
            href: '/settings/preferences',
          },
        ].map((item) => (
          <a
            key={item.title}
            href={item.href}
            className="group flex items-start gap-4 rounded-[12px] border border-slate-200 bg-white p-6 shadow-ring transition-shadow hover:shadow-card-hover"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-brand-light">
              <item.icon className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h3 className="text-h3 text-slate-900 group-hover:text-brand">{item.title}</h3>
              <p className="text-body-sm mt-1 text-slate-500">{item.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
