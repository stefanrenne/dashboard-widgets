# Kopia

One snapshot source of a Kopia server: its state, the size of its last snapshot, how long ago
that ran (marked when it had errors) and when the next one runs, as homepage's kopia widget.
With several sources pick one with `snapshotHost` and `snapshotPath`. `username` and `password`
are the server's `--server-username` and `--server-password` (KopiaUI shows them under
**Repository > Server**).

Learn more about [Kopia](https://kopia.io/).

## Fields

`status`, `size`, `lastrun`, `nextrun`

## Example

```yaml
# services.yaml
- Backups:
    - Kopia:
        href: https://kopia.lan:51515
        icon: kopia
        widget:
          type: kopia
          url: https://kopia.lan:51515
          username: kopia
          password: "{{DASHBOARD_VAR_KOPIA_PASSWORD}}"
          snapshotHost: nas
          snapshotPath: /photos
          insecure: true
```
