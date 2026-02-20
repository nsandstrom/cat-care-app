'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import type { ChecklistItem } from '../lib/types';
import { ProgressBar } from '../components/ProgressBar';
import { Timeline } from '../components/Timeline';
import { TaskCard } from '../components/TaskCard';

const POLL_INTERVAL = 10_000; // 10 seconds

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function groupBySection(checklist: ChecklistItem[]): { section: string; items: ChecklistItem[] }[] {
  const sections = new Map<string, ChecklistItem[]>();
  for (const item of checklist) {
    const existing = sections.get(item.section);
    if (existing) {
      existing.push(item);
    } else {
      sections.set(item.section, [item]);
    }
  }
  return Array.from(sections.entries()).map(([section, items]) => ({ section, items }));
}

export default function HomePage() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const todayRef = useRef(getTodayDate());

  const fetchChecklist = useCallback(async () => {
    try {
      const data = await api.getChecklist(todayRef.current);
      setChecklist(data.checklist);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklist');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Polling every 10s
  useEffect(() => {
    const interval = setInterval(fetchChecklist, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchChecklist]);

  // Update "now" every minute for status/timeline
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = useCallback(async (taskId: string) => {
    const date = todayRef.current;
    const item = checklist.find((c) => c.taskId === taskId);
    if (!item) return;

    setToggleLoading((prev) => new Set(prev).add(taskId));

    // Optimistic update
    setChecklist((prev) =>
      prev.map((c) =>
        c.taskId === taskId
          ? { ...c, done: !c.done, completedAt: !c.done ? new Date().toISOString() : undefined }
          : c,
      ),
    );

    try {
      if (item.done) {
        await api.unmarkComplete(date, taskId);
      } else {
        await api.markComplete(date, taskId);
      }
      // Refresh to get server state
      await fetchChecklist();
    } catch {
      // Revert optimistic update
      setChecklist((prev) =>
        prev.map((c) => (c.taskId === taskId ? item : c)),
      );
    } finally {
      setToggleLoading((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, [checklist, fetchChecklist]);

  const handleReset = useCallback(async () => {
    if (!confirm('Reset all checkboxes for today?')) return;

    const date = todayRef.current;
    // Delete all completions for today
    const done = checklist.filter((c) => c.done);
    await Promise.all(done.map((c) => api.unmarkComplete(date, c.taskId)));
    await fetchChecklist();
  }, [checklist, fetchChecklist]);

  const completedCount = checklist.filter((c) => c.done).length;
  const totalTasks = checklist.length;
  const allDone = totalTasks > 0 && completedCount === totalTasks;
  const sections = groupBySection(checklist);

  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <>
      {/* Top stripe */}
      <div
        className="h-[5px]"
        style={{
          background:
            'repeating-linear-gradient(90deg, #e07b39 0 20px, #6bbf8e 20px 40px, #5c8de0 40px 60px)',
        }}
      />

      <header className="px-5 pt-[22px] pb-3.5">
        <p className="text-[0.72rem] uppercase tracking-widest text-mid mb-1">{dateLabel}</p>
        <h1 className="font-serif text-[1.8rem] font-bold leading-tight">
          Keep the cats<br />
          <em className="not-italic text-accent">alive.</em> 🐱
        </h1>
      </header>

      <ProgressBar completed={completedCount} total={totalTasks} />

      {error && (
        <div className="mx-4 mt-3 px-4 py-2 bg-[#fff0f0] border border-[#f0a0a0] rounded-xl text-sm text-red">
          {error}
        </div>
      )}

      {!loading && (
        <Timeline checklist={checklist} now={now} onToggle={handleToggle} />
      )}

      {/* Task list */}
      <div id="taskList">
        {loading ? (
          <div className="px-4 mt-6 text-center text-mid text-sm">Loading…</div>
        ) : (
          sections.map(({ section, items }) => (
            <div key={section} className="px-4 pt-5">
              <div className="flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-widest text-mid px-1 mb-2">
                {section}
                <span className="flex-1 h-px bg-soft" />
              </div>
              {items.map((item) => (
                <TaskCard
                  key={item.taskId}
                  item={item}
                  now={now}
                  onToggle={handleToggle}
                  loading={toggleLoading.has(item.taskId)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* All done banner */}
      {allDone && (
        <div className="mx-4 mt-5 px-6 py-6 text-center rounded-[18px] border-[1.5px] border-[#a8d8bc]"
          style={{ background: 'linear-gradient(135deg, #fff9f0, #f0fdf6)' }}
        >
          <div className="text-4xl mb-2">😻</div>
          <h2 className="font-serif text-[1.3rem] text-brown mb-1">All done for today!</h2>
          <p className="text-[0.8rem] text-mid">The cats are alive and thriving.<br />Good human.</p>
        </div>
      )}

      <button
        className="block mx-auto mt-5 bg-transparent border-[1.5px] border-soft rounded-full px-5 py-1.5 font-sans text-[0.75rem] text-mid cursor-pointer hover:border-accent hover:text-accent transition-colors"
        onClick={handleReset}
      >
        ↺ Reset today
      </button>

      {/* Paw watermark */}
      <div className="fixed bottom-[-15px] right-[-5px] text-[7rem] opacity-[0.04] pointer-events-none rotate-[15deg] select-none">
        🐾
      </div>
    </>
  );
}
