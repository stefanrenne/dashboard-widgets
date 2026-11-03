# Watchtower

The containers Watchtower scanned, updated and failed to update (marked) in its last run, as
homepage's watchtower widget. Turn the metrics on with `WATCHTOWER_HTTP_API_METRICS=true` and set a
token with `WATCHTOWER_HTTP_API_TOKEN`; give that token as `key`. The API listens on port 8080
in the container.

Learn more about [Watchtower](https://watchtower.nickfedor.com/).

## Fields

`containers_scanned`, `containers_updated`, `containers_failed`

## Example

```yaml
# services.yaml
- Infrastructure:
    - Watchtower:
        icon: watchtower
        widget:
          type: watchtower
          url: http://watchtower.lan:8080
          key: "{{DASHBOARD_VAR_WATCHTOWER_TOKEN}}"
```
