# pfSense

The load average, memory use and temperature of a pfSense firewall and whether its WAN is up
(marked when down), and with `fields` the WAN's address and the disk use (memory and disk above
90% marked), as homepage's pfsense widget. It needs the
[pfSense REST API package](https://github.com/jaredhendrickson13/pfsense-api) (set it to
read-only under **System > REST API > Settings**). Log in with an admin's `username` and
`password` (Local Database), or give the API key in `headers`: `X-API-Key` for version 2, or
`Authorization: <client id> <client token>` for version 1. `wan` is the WAN's device as shown
under **Interfaces > Assignments** (`igb0`).

Learn more about [pfSense](https://www.pfsense.org/).

## Fields

`load`, `memory`, `temp`, `wanStatus`, `wanIP`, `disk`

## Example

```yaml
# services.yaml
- Network:
    - pfSense:
        href: https://pfsense.lan
        icon: pfsense
        widget:
          type: pfsense
          url: https://pfsense.lan
          version: 2
          headers:
            X-API-Key: "{{DASHBOARD_VAR_PFSENSE_KEY}}"
          wan: igb0
          insecure: true
```
