# UniFi Drive

The total, used (above 90% marked) and free space of a UniFi NAS (UNAS) and the state of its
storage pools (degraded marked), as homepage's unifi_drive widget (`type: unifi_drive` works too). Create a local UniFi account
with read access for the dashboard (**UniFi OS > Admins & Users**, Restrict to local access only).
`insecure: true` accepts the device's self-signed certificate.

Learn more about [UniFi Drive](https://ui.com/integrations/network-storage).

## Fields

`total`, `used`, `available`, `status`

## Example

```yaml
# services.yaml
- Storage:
    - UNAS:
        href: https://unas.lan
        icon: unifi
        widget:
          type: unifi-drive
          url: https://unas.lan
          username: dashboard
          password: "{{DASHBOARD_VAR_UNAS_PASSWORD}}"
          insecure: true
```
