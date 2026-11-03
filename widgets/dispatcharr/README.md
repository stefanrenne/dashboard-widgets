# Dispatcharr

The channels in Dispatcharr and the streams that are active, as homepage's dispatcharr widget.
With `enableActiveStreams: true` the streams follow one per row with the number of clients and
the average bit rate. `username` and `password` are a Dispatcharr login.

Learn more about [Dispatcharr](https://github.com/Dispatcharr/Dispatcharr).

## Fields

`channels`, `streams`

## Example

```yaml
# services.yaml
- Media:
    - Dispatcharr:
        href: http://dispatcharr.lan:9191
        icon: dispatcharr
        widget:
          type: dispatcharr
          url: http://dispatcharr.lan:9191
          username: admin
          password: "{{DASHBOARD_VAR_DISPATCHARR_PASSWORD}}"
          enableActiveStreams: true
```
