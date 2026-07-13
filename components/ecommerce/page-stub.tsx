'use client';

import type { ComponentType, ReactNode } from 'react';

interface PageStubProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  features: { name: string; description: string }[];
}

export default function PageStub({ title, icon: Icon, features }: PageStubProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {features.map((f, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{f.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
