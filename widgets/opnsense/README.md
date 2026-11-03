# OPNsense

The CPU use (above 90% marked), the active memory, and the bytes sent and received on the WAN
interface of an OPNsense firewall, as homepage's opnsense widget. Create a user under **System >
Access > Users** with a scrambled password and only the privileges **Diagnostics: System
Activity** and **Reporting: Traffic** (Status: Traffic Graph before 24.7), then create an API key
for it: the downloaded `apikey.txt` holds the `key` (use it as `username`) and the `secret` (as
`password`). `wan` names another interface, as under **Interfaces > Assignments** (`opt1`).

Learn more about [OPNsense](https://opnsense.org/).

## Fields

`cpu`, `memory`, `wanUpload`, `wanDownload`

## Example

```yaml
# services.yaml
- Network:
    - OPNsense:
        href: https://opnsense.lan
        icon: opnsense
        widget:
          type: opnsense
          url: https://opnsense.lan
          username: "{{DASHBOARD_VAR_OPNSENSE_KEY}}"
          password: "{{DASHBOARD_VAR_OPNSENSE_SECRET}}"
          insecure: true
```
