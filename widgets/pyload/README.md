# pyLoad

The download rate and the active, queued and total downloads in pyLoad, as homepage's pyload
widget. Works with pyload-ng (with an API key as `key`, or a user) and with the older pyLoad 0.4
(with a user).

Learn more about [pyLoad](https://pyload.net/).

## Fields

`speed`, `active`, `queue`, `total`

## Example

```yaml
# services.yaml
- Downloads:
    - pyLoad:
        href: http://pyload.lan:8000
        icon: pyload
        widget:
          type: pyload
          url: http://pyload.lan:8000
          username: admin
          password: "{{DASHBOARD_VAR_PYLOAD_PASSWORD}}"
```
