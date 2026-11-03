# NetAlertX

The devices NetAlertX knows, those connected now, the new ones (marked) and the down alerts
(marked), as homepage's netalertx widget. Use the `API_TOKEN` from NetAlertX's settings as `key`.
From NetAlertX 26.1.17 set `version: 2` and point `url` at the backend's port (20212 by default).

Learn more about [NetAlertX](https://netalertx.com/).

## Fields

`total`, `connected`, `new_devices`, `down_alerts`

## Example

```yaml
# services.yaml
- Network:
    - NetAlertX:
        href: http://netalertx.lan:20211
        icon: netalertx
        widget:
          type: netalertx
          url: http://netalertx.lan:20212
          key: "{{DASHBOARD_VAR_NETALERTX_TOKEN}}"
          version: 2
```
