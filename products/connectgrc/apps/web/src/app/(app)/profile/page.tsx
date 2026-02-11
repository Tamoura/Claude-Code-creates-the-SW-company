export default function ProfilePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile</h1>
      <p className="text-gray-600 mb-8">
        Manage your professional profile and certifications.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Profile Management
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Coming soon. You will be able to manage your experience,
            certifications, and framework expertise here.
          </p>
        </div>
      </div>
    </div>
  );
}
