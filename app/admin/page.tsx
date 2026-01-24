'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  const stats = [
    { name: 'Total Users', value: '1,234', change: '+12%', changeType: 'positive' },
    { name: 'Active Sessions', value: '89', change: '+5%', changeType: 'positive' },
    { name: 'Revenue', value: '$45,231', change: '+18%', changeType: 'positive' },
    { name: 'Avg. Response Time', value: '1.2s', change: '-8%', changeType: 'negative' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Welcome back, {user?.name}! Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((item) => (
          <div
            key={item.name}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow dark:shadow-gray-900/50 rounded-lg border border-transparent dark:border-gray-700"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {item.name}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                    {item.value}
                  </dd>
                </div>
              </div>
              <div className="mt-4">
                <span
                  className={`inline-flex items-center text-sm font-semibold ${item.changeType === 'positive'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                    }`}
                >
                  {item.change}
                </span>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">vs last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/50 rounded-lg border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
            Recent Activity
          </h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {[
                { id: 1, action: 'New user registered', user: 'John Doe', time: '2 hours ago' },
                { id: 2, action: 'System backup completed', user: 'System', time: '5 hours ago' },
                { id: 3, action: 'Settings updated', user: 'Admin', time: '1 day ago' },
                { id: 4, action: 'New report generated', user: 'Jane Smith', time: '2 days ago' },
              ].map((event, eventIdx, arr) => (
                <li key={event.id}>
                  <div className="relative pb-8">
                    {eventIdx !== arr.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                          <span className="text-white text-xs">✓</span>
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {event.action}{' '}
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {event.user}
                            </span>
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                          {event.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
