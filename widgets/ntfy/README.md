# ntfy

The latest notification of an ntfy topic: its title, message, priority (high marked, urgent as an
error), how long ago it came, and with `fields` its tags, as homepage's ntfy widget. Works with a
self-hosted ntfy and with ntfy.sh. For a protected topic give an access token (`tk_...`) as
`key`, or a `username` and `password`.

Learn more about [ntfy](https://ntfy.sh/).

## Fields

`title`, `message`, `priority`, `lastReceived`, `tags`

## Example

```yaml
# services.yaml
- Notifications:
    - ntfy:
        href: https://ntfy.lan/backups
        icon: ntfy
        widget:
          type: ntfy
          url: https://ntfy.lan
          topic: backups
          key: "{{DASHBOARD_VAR_NTFY_TOKEN}}"
```
