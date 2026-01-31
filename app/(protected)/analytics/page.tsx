export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          View detailed analytics and insights.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Traffic Chart */}
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/50 rounded-lg p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Traffic Overview</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded">
            <p className="text-gray-500 dark:text-gray-400">Chart Component Placeholder</p>
          </div>
        </div>

        {/* User Engagement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/50 rounded-lg p-6 border border-transparent dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">User Engagement</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">Page Views</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">12,345</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full" style={{ width: '75%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">Unique Visitors</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">8,432</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 dark:bg-green-500 h-2 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">Bounce Rate</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">32%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '32%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/50 rounded-lg p-6 border border-transparent dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Top Pages</h3>
            <div className="space-y-3">
              {[
                { page: '/web', views: 4521 },
                { page: '/admin', views: 3214 },
                { page: '/login', views: 2876 },
                { page: '/admin/users', views: 1543 },
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.page}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
