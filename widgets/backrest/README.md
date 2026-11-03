# Backrest

Per plan whether its latest backup succeeded or failed (marked), the failed backups of the last
30 days (marked) and what was added in those 30 days, as homepage's backrest widget; the number
of plans and the successful backups of 30 days through `fields`. Give `username` and `password`
when Backrest has authentication on.

Learn more about [Backrest](https://garethgeorge.github.io/backrest/).

## Fields

`num_success_latest`, `num_failure_latest`, `num_failure_30`, `bytes_added_30`, `num_plans`, `num_success_30`

## Example

```yaml
# services.yaml
- Backups:
    - Backrest:
        href: http://backrest.lan:9898
        icon: backrest
        widget:
          type: backrest
          url: http://backrest.lan:9898
          username: admin
          password: "{{DASHBOARD_VAR_BACKREST_PASSWORD}}"
```
