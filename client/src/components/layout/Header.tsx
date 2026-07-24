'use client';

import { useAuth } from '@/context/AuthContext';

const roleBadge: Record<string, string> = {
  ADMIN:  'bg-purple-100 text-purple-700',
  MEMBER: 'bg-blue-100 text-blue-700',
};

export function Header({ title }: { title: string }) {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-gray-900 lg:ml-0 ml-10">{title}</h1>
      {user && (
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge[user.role] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {user.role}
          </span>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">
              {user.name}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
