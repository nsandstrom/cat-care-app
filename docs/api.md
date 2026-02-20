# Cat Care REST API Reference

Base URL: `https://{api-id}.execute-api.{region}.amazonaws.com`

---

## Authentication

All requests require the `X-Household-Token` header.

```
X-Household-Token: your-shared-household-token
```

The token is stored as an environment variable on the Lambda (`HOUSEHOLD_TOKEN`), sourced from AWS SSM Parameter Store at deploy time.

### Smart Home / Integration Auth (Future)

For Home Assistant or Alexa integrations, a separate `X-Api-Key` header mechanism is planned. Each smart home integration gets its own key, stored in DynamoDB (`PK=APIKEY`, `SK=key#{key}`). The Lambda will check either the household token _or_ a valid API key, enabling integrations without exposing the household token.

---

## Endpoints

### `GET /tasks`

Returns all configured cat care tasks and their schedule windows.

**Response**

```json
{
  "tasks": [
    {
      "taskId": "am-food",
      "name": "Morning food",
      "emoji": "🍽️",
      "section": "Morning",
      "windowStart": "07:00",
      "windowEnd": "09:00",
      "notes": "Wet + dry portions"
    }
  ]
}
```

Tasks are returned sorted by section order (Morning → Midday → Evening) then by `windowStart`.

---

### `GET /checklist/{date}`

Returns today's (or any date's) checklist — all tasks merged with their completion state.

**Path params**

| Param | Format | Example |
|---|---|---|
| `date` | `YYYY-MM-DD` | `2026-02-20` |

**Response**

```json
{
  "date": "2026-02-20",
  "totalTasks": 8,
  "completedCount": 3,
  "checklist": [
    {
      "taskId": "am-food",
      "name": "Morning food",
      "emoji": "🍽️",
      "section": "Morning",
      "windowStart": "07:00",
      "windowEnd": "09:00",
      "notes": "Wet + dry portions",
      "done": true,
      "completedAt": "2026-02-20T08:12:34.000Z",
      "completedBy": "niklas"
    }
  ]
}
```

---

### `POST /checklist/{date}/{taskId}`

Marks a task as complete for the given date. Records exact timestamp.

**Path params**

| Param | Format |
|---|---|
| `date` | `YYYY-MM-DD` |
| `taskId` | e.g. `am-food` |

**Body** (optional)

```json
{ "completedBy": "niklas" }
```

**Response**

```json
{
  "taskId": "am-food",
  "date": "2026-02-20",
  "completedAt": "2026-02-20T08:12:34.000Z",
  "completedBy": "niklas"
}
```

This is an **upsert** — calling it again updates the timestamp.

---

### `DELETE /checklist/{date}/{taskId}`

Unchecks a task (removes the completion record).

**Response**

```json
{ "taskId": "am-food", "date": "2026-02-20", "done": false }
```

---

### `GET /history`

Returns the last 30 daily summary records (newest first).

**Response**

```json
{
  "history": [
    {
      "date": "2026-02-19",
      "totalTasks": 8,
      "completedCount": 7,
      "missedTaskIds": ["pm-check"],
      "createdAt": "2026-02-20T00:00:05.123Z"
    }
  ]
}
```

Summaries are written by the EventBridge midnight Lambda. A day with no summary yet has no entry (still in progress).

---

### `PUT /tasks/{taskId}`

Updates a task's name, emoji, schedule, or notes. Useful for editing tasks without re-deploying.

**Body**

```json
{
  "name": "Morning food",
  "emoji": "🍽️",
  "section": "Morning",
  "windowStart": "07:30",
  "windowEnd": "09:30",
  "notes": "Updated notes"
}
```

All fields are optional — only provided fields are updated.

**Response**

```json
{ "task": { ...updatedTask } }
```

---

## DynamoDB Schema

Single table: `CatCareTable`

| PK | SK | Item type |
|---|---|---|
| `TASK` | `task#{taskId}` | Task definition |
| `DATE#{YYYY-MM-DD}` | `task#{taskId}` | Completion record |
| `SUMMARY#{YYYY-MM-DD}` | `summary` | Daily summary (written at midnight) |

Old `DATE#` completion records are **never deleted** — they serve as the permanent history log.

---

## Error responses

All errors return JSON with an `error` field:

```json
{ "error": "Unauthorized" }
```

| Status | Meaning |
|---|---|
| 400 | Bad request (invalid body or missing fields) |
| 401 | Missing or invalid `X-Household-Token` |
| 404 | Route not found |
| 500 | Internal server error |

---

## Smart Home Integration Notes

The API is designed for easy Home Assistant integration:

```yaml
# Example Home Assistant REST sensor
sensor:
  - platform: rest
    name: "Cat care completed today"
    resource: "https://your-api.execute-api.region.amazonaws.com/checklist/{{ now().strftime('%Y-%m-%d') }}"
    headers:
      X-Household-Token: !secret cat_care_token
    value_template: "{{ value_json.completedCount }} / {{ value_json.totalTasks }}"

# Example automation to mark task complete
rest_command:
  cat_care_morning_food:
    url: "https://your-api.execute-api.region.amazonaws.com/checklist/{{ now().strftime('%Y-%m-%d') }}/am-food"
    method: POST
    headers:
      X-Household-Token: !secret cat_care_token
      Content-Type: application/json
    payload: '{"completedBy": "home-assistant"}'
```
