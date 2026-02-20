import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db, TABLE_NAME } from '../lib/db';
import { requireToken, json } from '../lib/auth';
import type { TaskRecord, CompletionRecord, Task, ChecklistItem } from '../lib/types';

// ── Helpers ───────────────────────────────────────────────────────

function taskRecordToTask(r: TaskRecord): Task {
  return {
    taskId: r.taskId,
    name: r.name,
    emoji: r.emoji,
    section: r.section,
    windowStart: r.windowStart,
    windowEnd: r.windowEnd,
    notes: r.notes,
  };
}

// ── Handler ───────────────────────────────────────────────────────

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const authError = requireToken(event);
  if (authError) return authError;

  const method = event.requestContext.http.method.toUpperCase();
  const rawPath = event.rawPath;

  try {
    // GET /tasks
    if (method === 'GET' && rawPath === '/tasks') {
      return await getTasks();
    }

    // POST /tasks
    if (method === 'POST' && rawPath === '/tasks') {
      return await createTask(event.body ?? '{}');
    }

    // PUT/DELETE /tasks/{taskId}
    const taskUpdateMatch = rawPath.match(/^\/tasks\/([^/]+)$/);
    if (method === 'PUT' && taskUpdateMatch) {
      return await updateTask(taskUpdateMatch[1], event.body ?? '{}');
    }

    if (method === 'DELETE' && taskUpdateMatch) {
      return await deleteTask(taskUpdateMatch[1]);
    }

    // GET /checklist/{date}
    const checklistMatch = rawPath.match(/^\/checklist\/(\d{4}-\d{2}-\d{2})$/);
    if (method === 'GET' && checklistMatch) {
      return await getChecklist(checklistMatch[1]);
    }

    // POST /checklist/{date}/{taskId}
    const completionMatch = rawPath.match(/^\/checklist\/(\d{4}-\d{2}-\d{2})\/([^/]+)$/);
    if (method === 'POST' && completionMatch) {
      return await markComplete(completionMatch[1], completionMatch[2], event.body ?? '{}');
    }

    // DELETE /checklist/{date}/{taskId}
    if (method === 'DELETE' && completionMatch) {
      return await unmarkComplete(completionMatch[1], completionMatch[2]);
    }

    // GET /history
    if (method === 'GET' && rawPath === '/history') {
      return await getHistory();
    }

    return json(404, { error: 'Not found' });
  } catch (err) {
    console.error('Unhandled error', err);
    return json(500, { error: 'Internal server error' });
  }
};

// ── Route implementations ─────────────────────────────────────────

async function getTasks(): Promise<APIGatewayProxyResultV2> {
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'TASK' },
    }),
  );

  const tasks = (result.Items ?? []).map((item) =>
    taskRecordToTask(item as TaskRecord),
  );

  // Sort by section order then window start
  const sectionOrder = ['Morning', 'Midday', 'Evening'];
  tasks.sort((a, b) => {
    const si = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
    if (si !== 0) return si;
    return a.windowStart.localeCompare(b.windowStart);
  });

  return json(200, { tasks });
}

async function updateTask(
  taskId: string,
  body: string,
): Promise<APIGatewayProxyResultV2> {
  let updates: Partial<Task>;
  try {
    updates = JSON.parse(body);
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const allowedFields = ['name', 'emoji', 'section', 'windowStart', 'windowEnd', 'notes'];
  const expressionParts: string[] = [];
  const attrNames: Record<string, string> = {};
  const attrValues: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in updates) {
      const placeholder = `#${field}`;
      const valuePlaceholder = `:${field}`;
      expressionParts.push(`${placeholder} = ${valuePlaceholder}`);
      attrNames[placeholder] = field;
      attrValues[valuePlaceholder] = (updates as Record<string, unknown>)[field];
    }
  }

  if (expressionParts.length === 0) {
    return json(400, { error: 'No valid fields to update' });
  }

  await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'TASK', SK: `task#${taskId}` },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: attrNames,
      ExpressionAttributeValues: attrValues,
      ConditionExpression: 'attribute_exists(PK)',
    }),
  );

  // Fetch and return updated item
  const result = await db.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'TASK', SK: `task#${taskId}` },
    }),
  );

  return json(200, { task: taskRecordToTask(result.Item as TaskRecord) });
}

async function createTask(body: string): Promise<APIGatewayProxyResultV2> {
  let task: Task;
  try {
    task = JSON.parse(body);
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (!task.taskId || !task.name || !task.section || !task.windowStart || !task.windowEnd) {
    return json(400, { error: 'Missing required fields: taskId, name, section, windowStart, windowEnd' });
  }

  const record: TaskRecord = {
    PK: 'TASK',
    SK: `task#${task.taskId}`,
    taskId: task.taskId,
    name: task.name,
    emoji: task.emoji ?? '',
    section: task.section,
    windowStart: task.windowStart,
    windowEnd: task.windowEnd,
    ...(task.notes ? { notes: task.notes } : {}),
  };

  await db.send(new PutCommand({ TableName: TABLE_NAME, Item: record }));

  return json(201, { task: taskRecordToTask(record) });
}

async function deleteTask(taskId: string): Promise<APIGatewayProxyResultV2> {
  await db.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'TASK', SK: `task#${taskId}` },
    }),
  );

  return json(200, { taskId, deleted: true });
}

async function getChecklist(date: string): Promise<APIGatewayProxyResultV2> {
  // Fetch all tasks
  const tasksResult = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'TASK' },
    }),
  );

  // Fetch completions for date
  const completionsResult = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `DATE#${date}` },
    }),
  );

  const completionMap = new Map<string, CompletionRecord>();
  for (const item of completionsResult.Items ?? []) {
    const rec = item as CompletionRecord;
    completionMap.set(rec.taskId, rec);
  }

  const tasks = (tasksResult.Items ?? []) as TaskRecord[];
  const sectionOrder = ['Morning', 'Midday', 'Evening'];
  tasks.sort((a, b) => {
    const si = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
    if (si !== 0) return si;
    return a.windowStart.localeCompare(b.windowStart);
  });

  const checklist: ChecklistItem[] = tasks.map((task) => {
    const completion = completionMap.get(task.taskId);
    return {
      ...taskRecordToTask(task),
      done: !!completion,
      completedAt: completion?.completedAt,
      completedBy: completion?.completedBy,
    };
  });

  const completedCount = checklist.filter((t) => t.done).length;

  return json(200, {
    date,
    checklist,
    completedCount,
    totalTasks: checklist.length,
  });
}

async function markComplete(
  date: string,
  taskId: string,
  body: string,
): Promise<APIGatewayProxyResultV2> {
  let parsed: { completedBy?: string } = {};
  try {
    parsed = JSON.parse(body);
  } catch {
    // body is optional
  }

  const completedAt = new Date().toISOString();

  const record: CompletionRecord = {
    PK: `DATE#${date}`,
    SK: `task#${taskId}`,
    taskId,
    completedAt,
    ...(parsed.completedBy ? { completedBy: parsed.completedBy } : {}),
  };

  await db.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    }),
  );

  return json(200, {
    taskId,
    date,
    completedAt,
    completedBy: parsed.completedBy,
  });
}

async function unmarkComplete(
  date: string,
  taskId: string,
): Promise<APIGatewayProxyResultV2> {
  await db.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DATE#${date}`,
        SK: `task#${taskId}`,
      },
    }),
  );

  return json(200, { taskId, date, done: false });
}

async function getHistory(): Promise<APIGatewayProxyResultV2> {
  // Return the last 30 daily summaries
  const result = await db.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':start': 'SUMMARY#',
        ':end': 'SUMMARY#\uFFFF',
      },
      ScanIndexForward: false, // newest first
      Limit: 30,
    }),
  );

  return json(200, { history: result.Items ?? [] });
}
