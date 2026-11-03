# slskd

Whether slskd is connected to Soulseek (marked when not), the users it downloads from and uploads
to, its shared files, and with `fields` whether an update is available (marked), as homepage's
slskd widget. Generate a key (`openssl rand -base64 48`) and add it to `slskd.yml` under
`web > authentication > api_keys` with `role: readonly` and the dashboard's subnet as `cidr`.

Learn more about [slskd](https://github.com/slskd/slskd).

## Fields

`slskStatus`, `updateStatus`, `downloads`, `uploads`, `sharedFiles`

## Example

```yaml
# services.yaml
- Downloads:
    - slskd:
        href: http://slskd.lan:5030
        icon: slskd
        widget:
          type: slskd
          url: http://slskd.lan:5030
          key: "{{DASHBOARD_VAR_SLSKD_KEY}}"
```
