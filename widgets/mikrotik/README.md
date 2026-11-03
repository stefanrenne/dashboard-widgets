# MikroTik

A MikroTik router's uptime, CPU load and memory used (above 90% marked) and its DHCP leases, as
homepage's mikrotik widget. It uses the REST API of RouterOS 7; turn on the `www-ssl` service
(**IP > Services**), since RouterOS only offers the REST API over https on most setups, and
`insecure: true` accepts the router's self-signed certificate. A read-only user is enough.

Learn more about [MikroTik RouterOS](https://help.mikrotik.com/docs/display/ROS/REST+API).

## Fields

`uptime`, `cpuLoad`, `memoryUsed`, `numberOfLeases`

## Example

```yaml
# services.yaml
- Network:
    - Router:
        href: https://router.lan
        icon: mikrotik
        widget:
          type: mikrotik
          url: https://router.lan
          username: dashboard
          password: "{{DASHBOARD_VAR_MIKROTIK_PASSWORD}}"
          insecure: true
```
