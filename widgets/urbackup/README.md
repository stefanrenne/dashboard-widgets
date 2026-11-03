# UrBackup

The clients whose backups are fine, failed (marked) or not recent (marked), and with `fields`
the space all backups take, as homepage's urbackup widget. A client is fine when its file backup,
and its image backup when it makes those, ran within `maxDays` (default 3) without errors. The
widget logs in with a user of UrBackup's web interface (or anonymously without one); it sees the
clients that user may see.

Learn more about [UrBackup](https://www.urbackup.org/).

## Fields

`ok`, `errored`, `noRecent`, `totalUsed`

## Example

```yaml
# services.yaml
- Backups:
    - UrBackup:
        href: http://urbackup.lan:55414
        icon: urbackup
        widget:
          type: urbackup
          url: http://urbackup.lan:55414
          username: dashboard
          password: "{{DASHBOARD_VAR_URBACKUP_PASSWORD}}"
          maxDays: 5
```
