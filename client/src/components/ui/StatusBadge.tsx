import { LeadStatus } from '@/types';

const config: Record<LeadStatus, { label: string; className: string }> = {
  NEW:       { label: 'New',       className: 'bg-blue-100 text-blue-800' },
  CONTACTED: { label: 'Contacted', className: 'bg-yellow-100 text-yellow-800' },
  QUALIFIED: { label: 'Qualified', className: 'bg-purple-100 text-purple-800' },
  PROPOSAL:  { label: 'Proposal',  className: 'bg-orange-100 text-orange-800' },
  WON:       { label: 'Won',       className: 'bg-green-100 text-green-800' },
  LOST:      { label: 'Lost',      className: 'bg-red-100 text-red-800' },
};

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { label, className: colorClass } = config[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}

export const ALL_STATUSES = Object.keys(config) as LeadStatus[];
