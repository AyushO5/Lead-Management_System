'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, ALL_STATUSES } from '@/components/ui/StatusBadge';
import { LoadingSpinner, ErrorMessage, EmptyState } from '@/components/ui/Feedback';
import { Paginator } from '@/components/ui/Paginator';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Lead, LeadStatus, PaginatedResponse, User, ApiResponse } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LeadsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<User[]>([]);

  // Load members for ADMIN assignee filter
  useEffect(() => {
    if (!isAdmin) return;
    api.get<ApiResponse<User[]>>('/api/users').then((res) => {
      setMembers(res.data.filter((u) => u.role === 'MEMBER'));
    }).catch(() => {});
  }, [isAdmin]);

  const fetchLeads = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(p), limit: '15' });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (assignedTo && isAdmin) params.set('assignedTo', assignedTo);

    try {
      const res = await api.get<PaginatedResponse<Lead>>(`/api/leads?${params.toString()}`);
      setLeads(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, assignedTo, isAdmin]);

  useEffect(() => { fetchLeads(page); }, [fetchLeads, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchLeads(1);
  }

  function resetFilters() {
    setSearch('');
    setStatusFilter('');
    setAssignedTo('');
    setPage(1);
  }

  return (
    <AppShell title="Leads">
      <div className="space-y-4">
        {/* Filters */}
        <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                id="search"
                label="Search"
                placeholder="Name, email, company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                id="status-filter"
                label="Status"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            {isAdmin && members.length > 0 && (
              <div className="w-48">
                <Select
                  id="assigned-filter"
                  label="Assigned to"
                  value={assignedTo}
                  onChange={(e) => { setAssignedTo(e.target.value); setPage(1); }}
                >
                  <option value="">All members</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="md">Search</Button>
              <Button type="button" variant="secondary" size="md" onClick={resetFilters}>Clear</Button>
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="p-4"><ErrorMessage message={error} onRetry={() => fetchLeads(page)} /></div>
          ) : leads.length === 0 ? (
            <EmptyState title="No leads found" description="Try adjusting your filters." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="hidden md:table-cell px-4 py-3">Company</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="hidden lg:table-cell px-4 py-3">Assigned To</th>
                      <th className="hidden lg:table-cell px-4 py-3">Created</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                        <td className="px-4 py-3 text-gray-500 truncate max-w-[180px]">{lead.email}</td>
                        <td className="hidden md:table-cell px-4 py-3 text-gray-500">{lead.company ?? '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={lead.status as LeadStatus} />
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 text-gray-500">
                          {lead.assignedToId ? <span className="text-gray-700">{lead.assignedToId.slice(0, 8)}…</span> : <span className="text-gray-300">Unassigned</span>}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 text-gray-400">{formatDate(lead.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4">
                <Paginator pagination={pagination} onPageChange={(p) => { setPage(p); fetchLeads(p); }} />
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
