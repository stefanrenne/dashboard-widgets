# Transmission

Torrents that are still downloading (leech) and complete (seed), with the total download and
upload rate, as homepage's transmission widget. Give `username` and `password` when Transmission
has RPC authentication on (`rpc-authentication-required`). Change `rpcUrl` only when
Transmission's `rpc-url` is not `/transmission/`.

Learn more about [Transmission](https://transmissionbt.com/).

## Fields

`leech`, `download`, `seed`, `upload`

## Example

```yaml
# services.yaml
- Downloads:
    - Transmission:
        href: http://transmission.lan:9091
        icon: transmission
        widget:
          type: transmission
          url: http://transmission.lan:9091
          username: admin
          password: "{{DASHBOARD_VAR_TRANSMISSION_PASSWORD}}"
```
