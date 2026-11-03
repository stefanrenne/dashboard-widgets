# Sportarr

The events Sportarr still wants, those in its download queue and the leagues it follows, as
homepage's sportarr widget. The API key is under **Settings > General**.

Learn more about [Sportarr](https://github.com/Sportarr/Sportarr).

## Fields

`wanted`, `queued`, `leagues`

## Example

```yaml
# services.yaml
- Media:
    - Sportarr:
        href: http://sportarr.lan:1867
        icon: sportarr
        widget:
          type: sportarr
          url: http://sportarr.lan:1867
          key: "{{DASHBOARD_VAR_SPORTARR_KEY}}"
```
