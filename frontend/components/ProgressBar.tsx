'use client';

interface ProgressBarProps {
  completed: number;
  total: number;
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="px-5 mt-2">
      <div className="bg-soft rounded-full h-1.5 overflow-hidden">
        <div
          className="progress-bar h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #e07b39, #6bbf8e)',
          }}
        />
      </div>
      <p className="mt-1 text-xs text-mid">
        {completed} of {total} done today
      </p>
    </div>
  );
}
