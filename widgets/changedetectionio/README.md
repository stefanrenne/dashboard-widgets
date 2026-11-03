# changedetection.io

Watches whose page changed and that you have not looked at yet (marked), and all watches, as
homepage's changedetectionio widget. The API key is under **Settings > API**.

Learn more about [changedetection.io](https://changedetection.io/).

## Fields

`diffsDetected`, `totalObserved`

## Example

```yaml
# services.yaml
- Tools:
    - changedetection.io:
        href: http://changedetection.lan:5000
        icon: changedetection-io
        widget:
          type: changedetectionio
          url: http://changedetection.lan:5000
          key: "{{DASHBOARD_VAR_CHANGEDETECTION_KEY}}"
```
