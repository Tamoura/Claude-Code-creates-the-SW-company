export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        User Management
      </h1>
      <p className="text-gray-600 mb-8">
        View and manage platform users.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search users by name or email..."
              disabled
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 w-72 disabled:bg-gray-50"
            />
            <select
              disabled
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
            >
              <option>All Roles</option>
              <option>Talent</option>
              <option>Employer</option>
              <option>Admin</option>
            </select>
          </div>
          <button
            disabled
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Export Users
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Joined</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  No users registered yet. Users will appear here once they sign up.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <p>Showing 0 users</p>
        <div className="flex gap-2">
          <button disabled className="px-3 py-1 border border-gray-300 rounded text-gray-400">
            Previous
          </button>
          <button disabled className="px-3 py-1 border border-gray-300 rounded text-gray-400">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
