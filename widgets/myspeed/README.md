# MySpeed

The download, upload and ping of MySpeed's latest speed test, as homepage's myspeed widget. Fill
in `password` when MySpeed has one. When the latest test failed, its error shows on the card.

Learn more about [MySpeed](https://myspeed.dev/).

## Fields

`download`, `upload`, `ping`

## Example

```yaml
# services.yaml
- Network:
    - MySpeed:
        href: http://myspeed.lan:5216
        icon: myspeed
        widget:
          type: myspeed
          url: http://myspeed.lan:5216
          password: "{{DASHBOARD_VAR_MYSPEED_PASSWORD}}"
```
