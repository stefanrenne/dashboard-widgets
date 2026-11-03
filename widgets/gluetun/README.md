# Gluetun

The public IP address the VPN gives you, with its region and country, and with `fields` the
forwarded port, as homepage's gluetun widget. It reads Gluetun's
[control server](https://github.com/qdm12/gluetun-wiki/blob/main/setup/advanced/control-server.md)
(port 8000). With the control server's API key authentication, put the key in `key` and allow
the route `GET /v1/publicip/ip` for it in Gluetun's `config.toml`, and for the forwarded port
`GET /v1/openvpn/portforwarded` (or `GET /v1/portforward` from Gluetun 3.40.1, with `version: 2`).

Learn more about [Gluetun](https://github.com/qdm12/gluetun).

## Fields

`public_ip`, `region`, `country`, `port_forwarded`

## Example

```yaml
# services.yaml
- Network:
    - Gluetun:
        icon: gluetun
        widget:
          type: gluetun
          url: http://gluetun.lan:8000
          key: "{{DASHBOARD_VAR_GLUETUN_KEY}}"
          version: 2
          fields: [public_ip, country, port_forwarded]
```
