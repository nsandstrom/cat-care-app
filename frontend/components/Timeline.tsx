'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { ChecklistItem, TaskStatus } from '../lib/types';
import { getTaskStatus } from '../lib/types';

const PX_PER_HOUR = 64;
const TOTAL_WIDTH = 24 * PX_PER_HOUR; // 1536px
const ROW_TOP = 36;      // px from container top where first task row starts
const ROW_PITCH = 24;    // px between row starts (task height 36px → 12px overlap)
const TASK_H = 36;       // matches h-9
const ROW_BOTTOM_PAD = 10;

interface TimelineProps {
  checklist: ChecklistItem[];
  now: Date;
  onToggle: (taskId: string) => void;
}

function hourToX(h: number): number {
  return h * PX_PER_HOUR;
}

function windowToX(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return hourToX(h + m / 60);
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: 'bg-white border-soft text-brown',
  'active-window': 'bg-[#fff8f0] border-accent shadow-[0_0_0_3px_rgba(224,123,57,0.12)]',
  done: 'bg-[#eeebe6] border-[#d5d0ca] text-[#c0b8b0] line-through opacity-50',
  overdue: 'bg-[#fff0f0] border-[#f0a0a0] text-red',
};

export function Timeline({ checklist, now, onToggle }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  // Scroll "now" into center on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const nowH = now.getHours() + now.getMinutes() / 60;
    const x = hourToX(nowH);
    const center = scrollRef.current.clientWidth / 2;
    scrollRef.current.scrollLeft = Math.max(0, x - center);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag-to-scroll
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX;
    startScrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
    scrollRef.current?.classList.add('cursor-grabbing');
  }, []);

  useEffect(() => {
    const onMouseUp = () => {
      isDragging.current = false;
      scrollRef.current?.classList.remove('cursor-grabbing');
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !scrollRef.current) return;
      scrollRef.current.scrollLeft = startScrollLeft.current - (e.pageX - startX.current);
    };
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  const nowH = now.getHours() + now.getMinutes() / 60;
  const nowX = hourToX(nowH);
  const nowLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Greedy row packing: sort by start time, assign each task to the first row
  // whose last task has already ended.
  const sorted = [...checklist].sort((a, b) => a.windowStart.localeCompare(b.windowStart));
  const rowEndTimes: string[] = [];
  const taskRowMap = new Map<string, number>();
  for (const item of sorted) {
    let row = rowEndTimes.findIndex((end) => end <= item.windowStart);
    if (row === -1) {
      row = rowEndTimes.length;
      rowEndTimes.push(item.windowEnd);
    } else {
      rowEndTimes[row] = item.windowEnd;
    }
    taskRowMap.set(item.taskId, row);
  }
  const numRows = Math.max(1, rowEndTimes.length);
  const containerHeight = ROW_TOP + (numRows - 1) * ROW_PITCH + TASK_H + ROW_BOTTOM_PAD;

  return (
    <div className="relative mt-4 pb-1">
      <div
        ref={scrollRef}
        className="hide-scrollbar overflow-x-auto px-5 pb-2.5 cursor-grab select-none"
        onMouseDown={onMouseDown}
      >
        <div className="relative" style={{ width: TOTAL_WIDTH, height: containerHeight }}>
          {/* Hour ticks */}
          {Array.from({ length: 25 }, (_, h) => (
            <div key={h}>
              <div
                className="absolute top-0 w-px h-3 bg-soft"
                style={{ left: hourToX(h) }}
              />
              {h % 2 === 0 && h < 24 && (
                <span
                  className="absolute top-3.5 font-mono text-[0.65rem] text-[#c4a882] -translate-x-1/2 whitespace-nowrap"
                  style={{ left: hourToX(h) }}
                >
                  {h === 0 ? '00:00' : `${String(h).padStart(2, '0')}:00`}
                </span>
              )}
            </div>
          ))}

          {/* Task blocks */}
          {checklist.map((item) => {
            const status = getTaskStatus(item, now);
            const left = windowToX(item.windowStart);
            const right = windowToX(item.windowEnd);
            const width = right - left;
            const top = ROW_TOP + (taskRowMap.get(item.taskId) ?? 0) * ROW_PITCH;

            return (
              <div
                key={item.taskId}
                className={`absolute h-9 rounded-lg flex items-center gap-1 px-2.5 border-[1.5px] cursor-pointer transition-transform active:scale-y-95 overflow-hidden whitespace-nowrap ${STATUS_STYLES[status]}`}
                style={{ left, width, top }}
                onClick={() => onToggle(item.taskId)}
              >
                <span className="text-sm flex-shrink-0">{item.emoji}</span>
                <span className="text-[0.72rem] font-medium overflow-hidden text-ellipsis">
                  {item.name}
                </span>
              </div>
            );
          })}

          {/* Now line */}
          <div
            className="absolute bottom-0 w-0.5 bg-accent rounded-sm pointer-events-none z-10"
            style={{ left: nowX, top: 30 }}
          >
            {/* Label */}
            <span
              className="absolute left-1/2 -translate-x-1/2 -top-6 bg-accent text-white text-[0.6rem] font-mono px-1.5 py-px rounded whitespace-nowrap"
            >
              {nowLabel}
            </span>
            {/* Dot */}
            <span className="absolute -top-1.5 -left-1 w-2.5 h-2.5 bg-accent rounded-full shadow-[0_0_0_3px_rgba(224,123,57,0.25)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
