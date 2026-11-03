# Duplicati

The number of backup jobs, the size of what they store, how long ago the last backup finished
and when the next one runs, a running backup, and the warnings and errors that Duplicati
reported for a backup, as homepage's duplicati widget. Errors and warnings are marked. The
widget logs in with the password of Duplicati's web interface (Duplicati 2.1 or later).

Learn more about [Duplicati](https://www.duplicati.com/).

## Fields

`jobs`, `stored`, `lastBackup`, `nextRun`, `running`, `warnings`, `errors`

## Example

```yaml
# services.yaml
- Backups:
    - Duplicati:
        href: http://duplicati.lan:8200
        icon: duplicati
        widget:
          type: duplicati
          url: http://duplicati.lan:8200
          password: "{{DASHBOARD_VAR_DUPLICATI_PASSWORD}}"
```
