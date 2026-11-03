# Health checks

The checks that are up and down (marked) in a Healthchecks.io project, or with `uuid` one
check's state (down and in its grace period marked) and how long ago it last pinged, as
homepage's healthchecks widget. Create a key in your project under **Settings > API Access >
Create API key** (read-only is enough) and use it as `key`. Works with a self-hosted
Healthchecks and with healthchecks.io.

Learn more about [Healthchecks](https://healthchecks.io/).

## Fields

`up`, `down`, `status`, `last_ping`

## Example

```yaml
# services.yaml
- Monitoring:
    - Backups ping:
        href: https://healthchecks.lan
        icon: healthchecks
        widget:
          type: healthchecks
          url: https://healthchecks.lan
          key: "{{DASHBOARD_VAR_HEALTHCHECKS_KEY}}"
          uuid: 5f1c3a2e-8b7d-4e6f-9a0b-1c2d3e4f5a6b
```
