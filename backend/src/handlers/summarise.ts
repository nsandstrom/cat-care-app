/**
 * EventBridge Scheduler handler — runs at 04:00 Europe/Stockholm every day.
 *
 * For the household day that just ended (yesterday in Stockholm time):
 *  1. Query all tasks
 *  2. Query all completions for that date
 *  3. Write a SUMMARY# record (for history log)
 *
 * DATE# completion records are kept permanently — they are the history.
 */

import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLE_NAME } from '../lib/db';
import type { TaskRecord, CompletionRecord, SummaryRecord } from '../lib/types';

export const handler = async (_event: unknown): Promise<void> => {
  const date = getPreviousHouseholdDay();
  console.log(`Running daily summarise for date: ${date}`);

  // 1. Fetch all tasks
  const tasksResult = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'TASK' },
    }),
  );
  const tasks = (tasksResult.Items ?? []) as TaskRecord[];

  // 2. Fetch completions for the day
  const completionsResult = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `DATE#${date}` },
    }),
  );
  const completions = (completionsResult.Items ?? []) as CompletionRecord[];
  const completedTaskIds = new Set(completions.map((c) => c.taskId));

  // 3. Compute missed tasks
  const missedTaskIds = tasks
    .map((t) => t.taskId)
    .filter((id) => !completedTaskIds.has(id));

  // 4. Write summary record
  const summary: SummaryRecord = {
    PK: `SUMMARY#${date}`,
    SK: 'summary',
    date,
    totalTasks: tasks.length,
    completedCount: completions.length,
    missedTaskIds,
    createdAt: new Date().toISOString(),
  };

  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: summary,
    }),
  );

  console.log(`Summary written for ${date}:`, {
    totalTasks: summary.totalTasks,
    completedCount: summary.completedCount,
    missedCount: missedTaskIds.length,
  });
};

/**
 * Returns the date (YYYY-MM-DD) of the household day that just ended.
 *
 * The handler runs at 04:00 Europe/Stockholm = 02:00–03:00 UTC.
 * At that UTC time the UTC calendar date equals the Stockholm calendar date,
 * so subtracting one UTC day gives the correct previous household day.
 */
function getPreviousHouseholdDay(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
