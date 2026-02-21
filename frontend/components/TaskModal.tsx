'use client';

import { useState } from 'react';
import type { Task } from '../lib/types';

interface Props {
  task?: Task;
  onSave: (task: Task) => void;
  onClose: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function TaskModal({ task, onSave, onClose }: Props) {
  const isEdit = !!task;

  const [emoji, setEmoji] = useState(task?.emoji ?? '');
  const [name, setName] = useState(task?.name ?? '');
  const [windowStart, setWindowStart] = useState(task?.windowStart ?? '08:00');
  const [windowEnd, setWindowEnd] = useState(task?.windowEnd ?? '09:00');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!windowStart || !windowEnd) {
      setError('Window start and end are required.');
      return;
    }

    const taskId = isEdit ? task!.taskId : slugify(name);
    if (!taskId) {
      setError('Could not generate a task ID from the name. Use letters or numbers.');
      return;
    }

    onSave({
      taskId,
      name: name.trim(),
      emoji: emoji.trim(),
      windowStart,
      windowEnd,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(61,44,30,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
        style={{ background: 'var(--cream)', color: 'var(--brown)' }}
      >
        <h2 className="mb-5 text-lg font-semibold" style={{ fontFamily: 'var(--font-fraunces)' }}>
          {isEdit ? 'Edit task' : 'New task'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1" style={{ width: '4rem' }}>
              <label className="text-xs font-medium" style={{ color: 'var(--mid)' }}>Emoji</label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🐱"
                maxLength={4}
                className="rounded-lg border px-2 py-2 text-center text-lg focus:outline-none"
                style={{ borderColor: 'var(--soft)', background: 'var(--warm)' }}
              />
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--mid)' }}>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Morning food"
                required
                className="rounded-lg border px-3 py-2 focus:outline-none"
                style={{ borderColor: 'var(--soft)', background: 'var(--warm)' }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--mid)' }}>Window start *</label>
              <input
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                required
                className="rounded-lg border px-3 py-2 focus:outline-none"
                style={{ borderColor: 'var(--soft)', background: 'var(--warm)' }}
              />
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--mid)' }}>Window end *</label>
              <input
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                required
                className="rounded-lg border px-3 py-2 focus:outline-none"
                style={{ borderColor: 'var(--soft)', background: 'var(--warm)' }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--mid)' }}>Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional details…"
              className="rounded-lg border px-3 py-2 focus:outline-none"
              style={{ borderColor: 'var(--soft)', background: 'var(--warm)' }}
            />
          </div>

          {isEdit && (
            <p className="text-xs" style={{ color: 'var(--mid)' }}>
              Task ID: <code style={{ fontFamily: 'var(--font-mono)' }}>{task!.taskId}</code>
            </p>
          )}

          {error && (
            <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>{error}</p>
          )}

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium"
              style={{ background: 'var(--warm)', color: 'var(--mid)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              {isEdit ? 'Save changes' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
