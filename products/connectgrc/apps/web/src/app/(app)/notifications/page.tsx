export default function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Notifications
      </h1>
      <p className="text-gray-600 mb-8">
        Stay up to date with your account activity.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No Notifications
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            You are all caught up. Notifications about assessments,
            career updates, and account activity will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
