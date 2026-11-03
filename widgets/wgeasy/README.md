# wg-easy

The WireGuard clients in wg-easy that are connected (a handshake within `threshold` minutes,
default 2), enabled and in total, and with `fields` the disabled ones, as homepage's wgeasy
widget. Before wg-easy 15 only the web interface's `password` is needed; from 15 set
`version: 2` and fill in `username` too.

Learn more about [wg-easy](https://github.com/wg-easy/wg-easy).

## Fields

`connected`, `enabled`, `disabled`, `total`

## Example

```yaml
# services.yaml
- Network:
    - WireGuard:
        href: http://wg.lan:51821
        icon: wireguard
        widget:
          type: wgeasy
          url: http://wg.lan:51821
          version: 2
          username: admin
          password: "{{DASHBOARD_VAR_WGEASY_PASSWORD}}"
```
