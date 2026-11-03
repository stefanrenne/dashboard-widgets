# Medusa

The episodes Medusa still wants (missed, today, soon and later), the snatched ones and the active
shows, as homepage's medusa widget. The key is under **Settings > General > Interface > API
Key**.

Learn more about [Medusa](https://pymedusa.com/).

## Fields

`wanted`, `queued`, `series`

## Example

```yaml
# services.yaml
- Media:
    - Medusa:
        href: http://medusa.lan:8081
        icon: medusa
        widget:
          type: medusa
          url: http://medusa.lan:8081
          key: "{{DASHBOARD_VAR_MEDUSA_KEY}}"
```
