'use client';

import type { ChecklistItem, TaskStatus } from '../lib/types';
import { getTaskStatus } from '../lib/types';

interface TaskCardProps {
  item: ChecklistItem;
  now: Date;
  onToggle: (taskId: string) => void;
  loading?: boolean;
}

const BORDER_CLASSES: Record<TaskStatus, string> = {
  pending: 'task-card-pending border-soft',
  'active-window': 'task-card-active border-soft',
  done: 'task-card-done border-[#a8d8bc] bg-[#eef7f2]',
  overdue: 'task-card-overdue border-soft',
};

const BADGE: Record<TaskStatus, { text: string; className: string }> = {
  pending: { text: 'upcoming', className: 'bg-[rgba(140,106,78,0.08)] text-mid' },
  'active-window': { text: '● now', className: 'bg-[rgba(224,123,57,0.12)] text-accent' },
  done: { text: '', className: '' },
  overdue: { text: 'overdue', className: 'bg-[rgba(224,92,92,0.12)] text-red' },
};

export function TaskCard({ item, now, onToggle, loading }: TaskCardProps) {
  const status = getTaskStatus(item, now);

  const timeLabel = `${item.windowStart} – ${item.windowEnd}`;

  const doneTime = item.completedAt
    ? (() => {
        const d = new Date(item.completedAt);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })()
    : null;

  const badge = BADGE[status];

  return (
    <div
      className={`task-card flex items-center gap-3 bg-white border-[1.5px] rounded-2xl px-4 py-3 mb-2 cursor-pointer transition-transform active:scale-[0.98] select-none ${BORDER_CLASSES[status]}`}
      onClick={() => !loading && onToggle(item.taskId)}
    >
      <span className="text-xl flex-shrink-0">{item.emoji}</span>

      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-[0.95rem] ${
            status === 'done' ? 'text-mid line-through decoration-green' : 'text-brown'
          }`}
        >
          {item.name}
        </p>
        {item.notes && (
          <p className="text-[0.75rem] text-mid mt-0.5">{item.notes}</p>
        )}
        <p className="font-mono text-[0.68rem] text-mid mt-0.5">
          {timeLabel}
          {status === 'done' && doneTime ? (
            <span className="ml-1 px-1.5 py-px rounded text-[0.65rem] bg-[rgba(107,191,142,0.15)] text-[#3a9a68]">
              ✓ done at {doneTime}
            </span>
          ) : badge.text ? (
            <span className={`ml-1 px-1.5 py-px rounded text-[0.65rem] ${badge.className}`}>
              {badge.text}
            </span>
          ) : null}
        </p>
      </div>

      {/* Checkbox */}
      <div
        className={`w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center text-[0.8rem] flex-shrink-0 transition-all ${
          status === 'done'
            ? 'bg-green border-green check-pop text-white'
            : 'bg-white border-soft'
        } ${loading ? 'opacity-50' : ''}`}
      >
        {status === 'done' && '✓'}
      </div>
    </div>
  );
}
