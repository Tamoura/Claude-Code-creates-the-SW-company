import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
  beforeSend(event) {
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
    }
    return event;
  },
});
