'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, ALL_STATUSES } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Input';
import { LoadingSpinner, ErrorMessage } from '@/components/ui/Feedback';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Lead, Note, Activity, ActivityType, User,
  LeadStatus, ApiResponse,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  LEAD_CREATED:  'Lead created',
  LEAD_ASSIGNED: 'Lead assigned',
  STATUS_CHANGED:'Status changed',
  NOTE_ADDED:    'Note added',
  LEAD_UPDATED:  'Lead updated',
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  LEAD_CREATED:  'bg-blue-500',
  LEAD_ASSIGNED: 'bg-purple-500',
  STATUS_CHANGED:'bg-orange-500',
  NOTE_ADDED:    'bg-green-500',
  LEAD_UPDATED:  'bg-gray-400',
};

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

function NotesSection({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [noteError, setNoteError] = useState('');

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Note[]>>(`/api/leads/${leadId}/notes`);
      setNotes(res.data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setNoteError('');
    try {
      await api.post(`/api/leads/${leadId}/notes`, { content: content.trim() });
      setContent('');
      fetchNotes();
    } catch (err) {
      setNoteError(err instanceof ApiClientError ? err.message : 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
      </div>
      <div className="p-6 space-y-4">
        {loading ? <LoadingSpinner className="py-4" /> : error ? (
          <ErrorMessage message={error} onRetry={fetchNotes} />
        ) : notes.length === 0 ? (
          <p className="text-sm text-gray-400">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {note.author.name} · {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add note form */}
        <form onSubmit={addNote} className="border-t border-gray-100 pt-4 space-y-3">
          {noteError && (
            <p className="text-xs text-red-600">{noteError}</p>
          )}
          <Textarea
            id="note-content"
            placeholder="Add a note…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button type="submit" size="sm" loading={submitting} disabled={!content.trim()}>
            Add note
          </Button>
        </form>
      </div>
    </div>
  );
}

function ActivityTimeline({ leadId }: { leadId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<ApiResponse<Activity[]>>(`/api/leads/${leadId}/activities`)
      .then((res) => setActivities(res.data))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : 'Failed to load activity'))
      .finally(() => setLoading(false));
  }, [leadId]);

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Activity</h2>
      </div>
      <div className="p-6">
        {loading ? <LoadingSpinner className="py-4" /> : error ? (
          <ErrorMessage message={error} />
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-400">No activity recorded.</p>
        ) : (
          <ol className="space-y-4">
            {activities.map((act, i) => (
              <li key={act.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1 ${ACTIVITY_COLORS[act.type]}`} />
                  {i < activities.length - 1 && <span className="flex-1 w-px bg-gray-200 mt-1" />}
                </div>
                <div className="pb-4 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">{ACTIVITY_LABELS[act.type]}</span>
                    {act.type === 'STATUS_CHANGED' && act.oldValue && act.newValue && (
                      <span className="text-gray-500 ml-1">
                        <StatusBadge status={act.oldValue as LeadStatus} className="mx-1" />
                        →
                        <StatusBadge status={act.newValue as LeadStatus} className="mx-1" />
                      </span>
                    )}
                    {act.type === 'LEAD_ASSIGNED' && act.newValue && (
                      <span className="text-gray-500 ml-1">to user {act.newValue.slice(0, 8)}…</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {act.user ? `${act.user.name} · ` : ''}{formatDate(act.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status update
  const [newStatus, setNewStatus] = useState<LeadStatus | ''>('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Assignment (ADMIN only)
  const [members, setMembers] = useState<User[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  // Delete (ADMIN only)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<ApiResponse<Lead>>(`/api/leads/${id}`);
      setLead(res.data);
      setNewStatus(res.data.status);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  useEffect(() => {
    if (!isAdmin) return;
    api.get<ApiResponse<User[]>>('/api/users')
      .then((res) => setMembers(res.data.filter((u) => u.role === 'MEMBER')))
      .catch(() => {});
  }, [isAdmin]);

  async function saveStatus() {
    if (!newStatus || newStatus === lead?.status) return;
    setStatusSaving(true);
    setStatusMsg('');
    try {
      await api.patch(`/api/leads/${id}`, { status: newStatus });
      setStatusMsg('Status updated');
      fetchLead();
    } catch (err) {
      setStatusMsg(err instanceof ApiClientError ? err.message : 'Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  }

  async function saveAssignment() {
    if (!selectedMember) return;
    setAssignSaving(true);
    setAssignMsg('');
    try {
      await api.patch(`/api/leads/${id}/assign`, { userId: selectedMember });
      setAssignMsg('Lead assigned successfully');
      fetchLead();
    } catch (err) {
      setAssignMsg(err instanceof ApiClientError ? err.message : 'Failed to assign lead');
    } finally {
      setAssignSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/api/leads/${id}`);
      router.replace('/leads');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to delete lead');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <AppShell title="Lead Detail">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/leads" className="hover:text-blue-600">← Back to Leads</Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchLead} />
        ) : !lead ? (
          <p className="text-gray-500">Lead not found.</p>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Lead info card */}
              <div className="rounded-xl bg-white border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{lead.name}</h2>
                    <p className="text-sm text-gray-500">{lead.email}</p>
                  </div>
                  <StatusBadge status={lead.status as LeadStatus} />
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-6 py-5">
                  <InfoRow label="Company" value={lead.company} />
                  <InfoRow label="Phone" value={lead.phone} />
                  <InfoRow label="Created" value={formatShortDate(lead.createdAt)} />
                  <InfoRow label="Last updated" value={formatShortDate(lead.updatedAt)} />
                  {lead.message && (
                    <div className="col-span-2">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message</dt>
                      <dd className="mt-0.5 text-sm text-gray-800 whitespace-pre-wrap">{lead.message}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <NotesSection leadId={id} />
              <ActivityTimeline leadId={id} />
            </div>

            {/* Right column — actions */}
            <div className="space-y-4">
              {/* Status control */}
              <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Update Status</h3>
                <Select
                  id="status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
                {statusMsg && (
                  <p className={`mt-2 text-xs ${statusMsg.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                    {statusMsg}
                  </p>
                )}
                <Button
                  className="mt-3 w-full justify-center"
                  size="sm"
                  loading={statusSaving}
                  disabled={newStatus === lead.status}
                  onClick={saveStatus}
                >
                  Save status
                </Button>
              </div>

              {/* Assignment — ADMIN only */}
              {isAdmin && (
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Assign Lead</h3>
                  {lead.assignedToId && (
                    <p className="text-xs text-gray-400 mb-3">
                      Currently assigned to user {lead.assignedToId.slice(0, 8)}…
                    </p>
                  )}
                  <Select
                    id="member-select"
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                  >
                    <option value="">Select member…</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </Select>
                  {assignMsg && (
                    <p className={`mt-2 text-xs ${assignMsg.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                      {assignMsg}
                    </p>
                  )}
                  <Button
                    className="mt-3 w-full justify-center"
                    size="sm"
                    loading={assignSaving}
                    disabled={!selectedMember}
                    onClick={saveAssignment}
                  >
                    Assign
                  </Button>
                </div>
              )}

              {/* Delete — ADMIN only */}
              {isAdmin && (
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Danger Zone</h3>
                  <p className="text-xs text-gray-500 mb-3">Deleting a lead is permanent and cannot be undone.</p>
                  {!showDeleteConfirm ? (
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete lead
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-red-600 font-medium">Are you sure?</p>
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          loading={deleting}
                          onClick={handleDelete}
                        >
                          Yes, delete
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
