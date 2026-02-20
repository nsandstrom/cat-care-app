/**
 * EventBridge cron handler — runs at midnight UTC.
 *
 * For yesterday's date:
 *  1. Query all tasks
 *  2. Query all completions for that date
 *  3. Write a SUMMARY# record (for history log)
 *
 * We do NOT delete DATE# records — they are the permanent history.
 */

import type { EventBridgeEvent } from 'aws-lambda';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLE_NAME } from '../lib/db';
import type { TaskRecord, CompletionRecord, SummaryRecord } from '../lib/types';

export const handler = async (
  _event: EventBridgeEvent<'Scheduled Event', unknown>,
): Promise<void> => {
  const yesterday = getYesterday();
  console.log(`Running daily reset for date: ${yesterday}`);

  // 1. Fetch all tasks
  const tasksResult = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'TASK' },
    }),
  );
  const tasks = (tasksResult.Items ?? []) as TaskRecord[];

  // 2. Fetch completions for yesterday
  const completionsResult = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `DATE#${yesterday}` },
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
    PK: `SUMMARY#${yesterday}`,
    SK: 'summary',
    date: yesterday,
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

  console.log(`Summary written for ${yesterday}:`, {
    totalTasks: summary.totalTasks,
    completedCount: summary.completedCount,
    missedCount: missedTaskIds.length,
  });
};

function getYesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
