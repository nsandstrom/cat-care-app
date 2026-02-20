// ── Domain types ──────────────────────────────────────────────────

export interface Task {
  taskId: string;       // e.g. "am-food"
  name: string;         // e.g. "Morning food"
  emoji: string;        // e.g. "🍽️"
  section: string;      // e.g. "Morning"
  windowStart: string;  // "HH:MM" e.g. "07:00"
  windowEnd: string;    // "HH:MM" e.g. "09:00"
  notes?: string;       // e.g. "Wet + dry portions"
}

export interface Completion {
  taskId: string;
  completedAt: string;  // ISO 8601 timestamp
  completedBy?: string; // optional — smart home integrations can set this
}

export interface ChecklistItem extends Task {
  done: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface DailySummary {
  date: string;           // YYYY-MM-DD
  totalTasks: number;
  completedCount: number;
  missedTaskIds: string[];
}

// ── DynamoDB record shapes ────────────────────────────────────────

export interface TaskRecord {
  PK: 'TASK';
  SK: string;           // "task#{taskId}"
  taskId: string;
  name: string;
  emoji: string;
  section: string;
  windowStart: string;
  windowEnd: string;
  notes?: string;
}

export interface CompletionRecord {
  PK: string;           // "DATE#{YYYY-MM-DD}"
  SK: string;           // "task#{taskId}"
  taskId: string;
  completedAt: string;
  completedBy?: string;
}

export interface SummaryRecord {
  PK: string;           // "SUMMARY#{YYYY-MM-DD}"
  SK: 'summary';
  date: string;
  totalTasks: number;
  completedCount: number;
  missedTaskIds: string[];
  createdAt: string;
}
