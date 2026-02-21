export interface Task {
  taskId: string;
  name: string;
  emoji: string;
  windowStart: string; // "HH:MM"
  windowEnd: string;   // "HH:MM"
  notes?: string;
}

export function getSectionFromTime(windowStart: string): string {
  const [h] = windowStart.split(':').map(Number);
  if (h >= 18) return 'Evening';
  if (h >= 12) return 'Midday';
  return 'Morning';
}

export interface ChecklistItem extends Task {
  done: boolean;
  completedAt?: string;  // ISO timestamp
  completedBy?: string;
}

export interface ChecklistResponse {
  date: string;
  checklist: ChecklistItem[];
  completedCount: number;
  totalTasks: number;
}

export interface TasksResponse {
  tasks: Task[];
}

export type TaskStatus = 'pending' | 'active-window' | 'done' | 'overdue';

export function getTaskStatus(item: ChecklistItem, now: Date): TaskStatus {
  if (item.done) return 'done';

  const nowH = now.getHours() + now.getMinutes() / 60;
  const [startH, startM] = item.windowStart.split(':').map(Number);
  const [endH, endM] = item.windowEnd.split(':').map(Number);
  const start = startH + startM / 60;
  const end = endH + endM / 60;

  if (nowH > end) return 'overdue';
  if (nowH >= start) return 'active-window';
  return 'pending';
}
