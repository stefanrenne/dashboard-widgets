# UniFi Controller

Uptime, WAN status and the users and devices on LAN and WLAN, from a UniFi Network controller
(UniFi OS consoles such as the Dream Machine and Cloud Key, or a self-hosted controller). Without
`fields` it shows uptime, WAN, LAN users and WLAN users, as in homepage; subsystems the
controller does not report (no gateway, no access points) are left out, and a subsystem that is
down is marked.

Sign in with either:

- an API key (UniFi OS 4 and later): **Settings › Control Plane › Integrations**, put it in `key`;
- or a **local** account with read access (not a UI.com cloud account): `username` and `password`.
  The widget tries UniFi OS first and falls back to a classic controller.

`site` is the site's name or description as the controller shows it; without it, the default site.
Most controllers use a self-signed certificate: set `insecure: true` to accept it (the connection
stays encrypted, but the certificate is not checked).

In `widgets.yaml` the header form also works under homepage's name, `unifi_console`.

Learn more about [UniFi Network](https://help.ui.com/hc/en-us/categories/6583256751383).

## Fields

`uptime`, `wan`, `lan`, `lan_users`, `lan_devices`, `wlan`, `wlan_users`, `wlan_devices`

## Example

```yaml
# services.yaml
- Network:
    - UniFi:
        href: https://unifi.lan
        icon: unifi
        widget:
          type: unifi
          url: https://unifi.lan
          key: "{{DASHBOARD_VAR_UNIFI_KEY}}"
          insecure: true
          fields: [uptime, wan, wlan_users, wlan_devices]
```
