# Agent experiences

One JSON file per agent, written by the agent itself after a task completes.
The files start empty in a fresh fork and fill up as your agents work.

```json
{
  "agent": "backend-engineer",
  "version": "1.0.0",
  "experiences": [
    {
      "id": "EXP-001",
      "date": "2026-01-15",
      "product": "taskflow",
      "task": "T016",
      "situation": "Needed to stop completed tasks being edited in place",
      "action": "Put the rule in TaskService.update and covered it with two integration tests",
      "outcome": "success",
      "lesson": "Rules that live in services get one clear test each; the same rule in a route handler needs an HTTP round trip to test"
    }
  ]
}
```

`outcome` is `success` or `failure` — failures are the more valuable entries, so
record them. `.claude/scripts/extract-patterns.sh` promotes repeated lessons
into `company-knowledge.json`, which every agent reads at the start of a task.
