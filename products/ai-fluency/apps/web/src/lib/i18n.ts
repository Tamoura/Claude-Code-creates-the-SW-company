// Simple i18n placeholder — returns key until full i18n library is integrated.
// Replace with next-intl or react-i18next in a future sprint.

const translations: Record<string, string> = {
  // Navigation
  'nav.home': 'Home',
  'nav.dashboard': 'Dashboard',
  'nav.assessment': 'Assessment',
  'nav.profile': 'My Profile',
  'nav.learning': 'Learning Paths',
  'nav.org': 'Organization',
  'nav.admin': 'Admin',
  'nav.settings': 'Settings',
  'nav.login': 'Sign In',
  'nav.register': 'Get Started',
  'nav.logout': 'Sign Out',

  // Home page
  'home.hero.title': 'Measure and Grow Your AI Fluency',
  'home.hero.subtitle':
    'AI Fluency assesses your team\'s ability to work effectively with AI across four key dimensions: Delegation, Description, Discernment, and Diligence.',
  'home.hero.cta.primary': 'Start Free Assessment',
  'home.hero.cta.secondary': 'Learn More',
  'home.features.title': 'Why AI Fluency?',
  'home.features.assess.title': '4-Dimension Assessment',
  'home.features.assess.description':
    'Measure Delegation, Description, Discernment, and Diligence — the four dimensions of AI fluency.',
  'home.features.paths.title': 'Personalized Learning Paths',
  'home.features.paths.description':
    'AI-generated learning recommendations based on your unique fluency profile.',
  'home.features.org.title': 'Organization-Wide Insights',
  'home.features.org.description':
    'Understand your team\'s AI readiness with aggregate dashboards and benchmarking.',

  // Auth
  'auth.login.title': 'Sign in to AI Fluency',
  'auth.login.email.label': 'Email address',
  'auth.login.email.placeholder': 'you@example.com',
  'auth.login.password.label': 'Password',
  'auth.login.password.placeholder': 'Your password',
  'auth.login.submit': 'Sign In',
  'auth.login.no_account': "Don't have an account?",
  'auth.login.register_link': 'Create one',
  'auth.register.title': 'Create your account',
  'auth.register.name.label': 'Full name',
  'auth.register.name.placeholder': 'Alex Johnson',
  'auth.register.email.label': 'Email address',
  'auth.register.email.placeholder': 'you@example.com',
  'auth.register.password.label': 'Password',
  'auth.register.password.placeholder': 'Minimum 8 characters',
  'auth.register.submit': 'Create Account',
  'auth.register.has_account': 'Already have an account?',
  'auth.register.login_link': 'Sign in',

  // Dashboard
  'dashboard.title': 'Your Dashboard',
  'dashboard.welcome': 'Welcome back',
  'dashboard.fluency_score': 'Fluency Score',
  'dashboard.take_assessment': 'Take Assessment',
  'dashboard.view_profile': 'View Profile',
  'dashboard.continue_learning': 'Continue Learning',

  // Assessment
  'assessment.title': 'AI Fluency Assessment',
  'assessment.description':
    'This assessment evaluates your AI fluency across four dimensions. It takes approximately 20-30 minutes.',
  'assessment.start': 'Start Assessment',
  'assessment.in_progress': 'Assessment In Progress',
  'assessment.complete.title': 'Assessment Complete',
  'assessment.complete.description': 'View your results and personalized recommendations.',
  'assessment.complete.view_profile': 'View Your Profile',

  // Profile
  'profile.title': 'My Fluency Profile',
  'profile.overall_score': 'Overall Score',
  'profile.dimensions.DELEGATION': 'Delegation',
  'profile.dimensions.DESCRIPTION': 'Description',
  'profile.dimensions.DISCERNMENT': 'Discernment',
  'profile.dimensions.DILIGENCE': 'Diligence',
  'profile.no_assessment': 'No assessment completed yet.',
  'profile.take_assessment': 'Take your first assessment',

  // Learning
  'learning.title': 'Learning Paths',
  'learning.description': 'AI-curated paths tailored to your fluency profile.',
  'learning.empty': 'No learning paths available yet.',
  'learning.start_assessment': 'Complete an assessment to unlock personalized paths.',

  // Org
  'org.dashboard.title': 'Organization Dashboard',
  'org.teams.title': 'Teams',
  'org.templates.title': 'Assessment Templates',

  // Admin
  'admin.organizations.title': 'Organizations',

  // Settings
  'settings.profile.title': 'Profile Settings',
  'settings.privacy.title': 'Privacy Settings',
  'settings.privacy.export': 'Export My Data',
  'settings.privacy.delete': 'Delete My Account',
  'settings.privacy.gdpr_description':
    'Under GDPR, you have the right to access, export, and delete your personal data.',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'An error occurred.',
  'common.retry': 'Retry',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.submit': 'Submit',
  'common.coming_soon_section': 'This section is being built.',
  'common.skip_to_content': 'Skip to main content',
  'common.required': 'Required',
};

export function t(key: string, fallback?: string): string {
  return translations[key] ?? fallback ?? key;
}
