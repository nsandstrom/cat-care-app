/**
 * One-time seed script — populates the 8 starter tasks.
 *
 * Run with:
 *   TABLE_NAME=CatCareTable HOUSEHOLD_TOKEN=xxx \
 *   npx ts-node src/seeds/seed.ts
 */

import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLE_NAME } from '../lib/db';
import type { TaskRecord } from '../lib/types';

const TASKS: Omit<TaskRecord, 'PK' | 'SK'>[] = [
  {
    taskId: 'am-food',
    name: 'Morning food',
    emoji: '🍽️',
    section: 'Morning',
    windowStart: '07:00',
    windowEnd: '09:00',
    notes: 'Wet + dry portions',
  },
  {
    taskId: 'am-water',
    name: 'Fresh water',
    emoji: '💧',
    section: 'Morning',
    windowStart: '07:00',
    windowEnd: '10:00',
    notes: 'Rinse and refill',
  },
  {
    taskId: 'am-med',
    name: 'Morning medication',
    emoji: '💊',
    section: 'Morning',
    windowStart: '07:00',
    windowEnd: '09:00',
    notes: 'Check dosage',
  },
  {
    taskId: 'litter',
    name: 'Clean litter box',
    emoji: '🪣',
    section: 'Midday',
    windowStart: '11:00',
    windowEnd: '14:00',
    notes: 'Scoop & check',
  },
  {
    taskId: 'play',
    name: 'Playtime',
    emoji: '🧶',
    section: 'Midday',
    windowStart: '12:00',
    windowEnd: '17:00',
    notes: '10+ mins',
  },
  {
    taskId: 'pm-food',
    name: 'Evening food',
    emoji: '🍽️',
    section: 'Evening',
    windowStart: '17:00',
    windowEnd: '19:00',
    notes: 'Wet portion',
  },
  {
    taskId: 'pm-med',
    name: 'Evening medication',
    emoji: '💊',
    section: 'Evening',
    windowStart: '17:00',
    windowEnd: '19:00',
    notes: 'Check dosage',
  },
  {
    taskId: 'pm-check',
    name: 'Health check',
    emoji: '🩺',
    section: 'Evening',
    windowStart: '19:00',
    windowEnd: '21:00',
    notes: 'Eyes, coat, mood',
  },
];

async function seed() {
  console.log(`Seeding ${TASKS.length} tasks into table: ${TABLE_NAME}`);

  for (const task of TASKS) {
    const record: TaskRecord = {
      PK: 'TASK',
      SK: `task#${task.taskId}`,
      ...task,
    };

    await db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: record,
      }),
    );

    console.log(`  ✓ ${task.emoji} ${task.name} (${task.taskId})`);
  }

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
