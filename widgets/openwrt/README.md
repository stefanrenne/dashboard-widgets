# OpenWrt

An OpenWrt router's uptime and 5-minute load average, or with `interfaceName` (a device such as
`eth0` or `br-lan`) that interface's state (marked when down) and the bytes sent and received, as
homepage's openwrt widget. The widget talks to ubus over `/ubus`, which needs a user with a read
ACL. Create `/usr/share/rpcd/acl.d/dashboard.json`:

```json
{ "dashboard": { "description": "Dashboard", "read": { "ubus": { "network.device": ["status"], "system": ["info"] } } } }
```

make a password hash with `uhttpd -m "<password>"`, and add the user to `/etc/config/rpcd`:

```
config login
        option username 'dashboard'
        option password '<the hash>'
        list read dashboard
```

then `service rpcd restart`.

Learn more about [OpenWrt](https://openwrt.org/docs/techref/ubus).

## Fields

`uptime`, `cpuLoad`, `status`, `bytesTx`, `bytesRx`

## Example

```yaml
# services.yaml
- Network:
    - Router:
        href: http://router.lan
        icon: openwrt
        widget:
          type: openwrt
          url: http://router.lan
          username: dashboard
          password: "{{DASHBOARD_VAR_OPENWRT_PASSWORD}}"
```
