'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import type { Task } from '../../lib/types';
import { getSectionFromTime } from '../../lib/types';
import TaskModal from '../../components/TaskModal';

export default function AdminPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; task: Task } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchTasks() {
    try {
      const res = await api.getTasks();
      const sorted = [...res.tasks].sort((a, b) =>
        a.windowStart.localeCompare(b.windowStart),
      );
      setTasks(sorted);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function handleSave(task: Task) {
    setSaving(true);
    try {
      if (modal?.mode === 'edit') {
        await api.updateTask(task.taskId, task);
      } else {
        await api.createTask(task);
      }
      setModal(null);
      await fetchTasks();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(taskId: string) {
    setSaving(true);
    try {
      await api.deleteTask(taskId);
      setConfirmDelete(null);
      await fetchTasks();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      className="mx-auto min-h-screen max-w-[430px] px-4 py-6"
      style={{ background: 'var(--cream)', color: 'var(--brown)' }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium"
          style={{ color: 'var(--mid)' }}
        >
          ← Back
        </Link>
        <h1
          className="text-xl font-semibold"
          style={{ fontFamily: 'var(--font-fraunces)' }}
        >
          Admin
        </h1>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          + Add task
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#fde8e8', color: 'var(--red)' }}>
          {error}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm" style={{ color: 'var(--mid)' }}>Loading…</p>
      )}

      {/* Task list */}
      {!loading && tasks.length === 0 && !error && (
        <p className="text-sm" style={{ color: 'var(--mid)' }}>No tasks yet. Add one!</p>
      )}

      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <div
            key={task.taskId}
            className="rounded-2xl px-4 py-3 shadow-sm"
            style={{ background: 'var(--warm)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {task.emoji && <span className="mr-1.5">{task.emoji}</span>}
                  {task.name}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--mid)', fontFamily: 'var(--font-mono)' }}>
                  {getSectionFromTime(task.windowStart)} · {task.windowStart}–{task.windowEnd}
                </p>
                {task.notes && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--mid)' }}>{task.notes}</p>
                )}
                <p className="mt-1 text-xs" style={{ color: 'var(--soft)', fontFamily: 'var(--font-mono)' }}>
                  {task.taskId}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => { setConfirmDelete(null); setModal({ mode: 'edit', task }); }}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  Edit
                </button>

                {confirmDelete === task.taskId ? (
                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--red)' }}>
                    Sure?
                    <button
                      onClick={() => handleDelete(task.taskId)}
                      disabled={saving}
                      className="rounded px-1.5 py-0.5 font-bold"
                      style={{ background: 'var(--red)', color: '#fff' }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="rounded px-1.5 py-0.5"
                      style={{ background: 'var(--soft)', color: 'var(--brown)' }}
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(task.taskId)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ background: 'var(--red)' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <TaskModal
          task={modal.mode === 'edit' ? modal.task : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
