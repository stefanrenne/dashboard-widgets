# Miniflux

The unread and read entries in Miniflux, as homepage's miniflux widget. Create a key under
**Settings > API Keys** and use it as `key`.

Learn more about [Miniflux](https://miniflux.app/).

## Fields

`unread`, `read`

## Example

```yaml
# services.yaml
- News:
    - Miniflux:
        href: http://miniflux.lan:8080
        icon: miniflux
        widget:
          type: miniflux
          url: http://miniflux.lan:8080
          key: "{{DASHBOARD_VAR_MINIFLUX_KEY}}"
```
