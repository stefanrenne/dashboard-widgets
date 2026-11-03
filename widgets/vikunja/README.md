# Vikunja

Your projects in Vikunja and the open tasks due within a week, overdue (marked) and in progress,
as homepage's vikunja widget. `enableTaskList: true` adds the next five tasks by due date as rows.
Create a token under **Settings > API Tokens** with read access to projects and tasks, and use
it as `key`. For Vikunja 1.0.0-rc4 and later set `version: 2`.

Learn more about [Vikunja](https://vikunja.io/).

## Fields

`projects`, `tasks7d`, `tasksOverdue`, `tasksInProgress`

## Example

```yaml
# services.yaml
- Home:
    - Vikunja:
        href: https://vikunja.lan
        icon: vikunja
        widget:
          type: vikunja
          url: https://vikunja.lan
          key: "{{DASHBOARD_VAR_VIKUNJA_TOKEN}}"
          version: 2
          enableTaskList: true
```
