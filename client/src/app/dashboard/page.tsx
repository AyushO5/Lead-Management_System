'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner, ErrorMessage } from '@/components/ui/Feedback';
import { api, ApiClientError } from '@/lib/api';
import { Lead, LeadStatus, PaginatedResponse } from '@/types';

interface StatusCounts {
  total: number;
  NEW: number;
  CONTACTED: number;
  QUALIFIED: number;
  WON: number;
}

const STAT_CARDS = [
  { key: 'total',     label: 'Total Leads',  color: 'bg-slate-100 text-slate-700' },
  { key: 'NEW',       label: 'New',           color: 'bg-blue-100 text-blue-700'   },
  { key: 'CONTACTED', label: 'Contacted',     color: 'bg-yellow-100 text-yellow-700'},
  { key: 'QUALIFIED', label: 'Qualified',     color: 'bg-purple-100 text-purple-700'},
  { key: 'WON',       label: 'Won',           color: 'bg-green-100 text-green-700'  },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ total: 0, NEW: 0, CONTACTED: 0, QUALIFIED: 0, WON: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      // Fetch up to 100 leads to derive counts; also grab recent 5
      const res = await api.get<PaginatedResponse<Lead>>('/api/leads?page=1&limit=100');
      const all = res.data;
      const c: StatusCounts = { total: res.pagination.total, NEW: 0, CONTACTED: 0, QUALIFIED: 0, WON: 0 };
      all.forEach((l) => {
        if (l.status in c) (c as unknown as Record<string, number>)[l.status]++;
      });
      setCounts(c);
      setLeads(all.slice(0, 6)); // show 6 most recent
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <AppShell title="Dashboard">
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {STAT_CARDS.map(({ key, label, color }) => (
              <div key={key} className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                <p className={`mt-2 text-3xl font-bold ${color.split(' ')[1]}`}>
                  {key === 'total' ? counts.total : (counts as unknown as Record<string, number>)[key] ?? 0}
                </p>
                <div className={`mt-3 h-1 rounded-full ${color.split(' ')[0]} opacity-60`} />
              </div>
            ))}
          </div>

          {/* Recent leads */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">Recent Leads</h2>
              <Link href="/leads" className="text-sm text-blue-600 hover:underline font-medium">
                View all →
              </Link>
            </div>
            {leads.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-500 text-center">No leads yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                    </div>
                    <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                      <StatusBadge status={lead.status as LeadStatus} />
                      <span className="hidden sm:block text-xs text-gray-400">{formatDate(lead.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
