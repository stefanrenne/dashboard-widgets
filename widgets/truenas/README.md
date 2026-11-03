# TrueNAS

The load average, uptime and alerts that are not dismissed (marked) of TrueNAS, as homepage's
truenas widget. With `enablePools: true` a row per pool follows with its used and total space,
unhealthy pools first and marked.

Set `version: 2` for TrueNAS 25.04 or later: it uses the WebSocket API that replaces the REST
API (which TrueNAS 26.04 removes). Make an API key under your user (top right) > **API Keys**;
with `version: 2` TrueNAS only accepts an API key over HTTPS. Or give `username` and
`password`. `insecure: true` accepts TrueNAS's self-signed certificate.

Learn more about [TrueNAS](https://www.truenas.com/).

## Fields

`load`, `uptime`, `alerts`

## Example

```yaml
# services.yaml
- Storage:
    - TrueNAS:
        href: https://truenas.lan
        icon: truenas
        widget:
          type: truenas
          url: https://truenas.lan
          version: 2
          key: "{{DASHBOARD_VAR_TRUENAS_KEY}}"
          enablePools: true
          insecure: true
```
