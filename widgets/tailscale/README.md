# Tailscale

One device in your tailnet: its Tailscale address, when it was last seen and when its key
expires (marked within a week, or when expired), as homepage's tailscale widget. More through
`fields`: the user, host name, name, client version, operating system, creation date, whether it
is authorized (marked when not), external, and has an update available (marked), and its tags.
Times show as spans ("2d 3h").

Make an API access token on the [keys page](https://login.tailscale.com/admin/settings/keys)
(it expires after at most 90 days). The device ID is under the machine's **Machine Details** in
the [machines page](https://login.tailscale.com/admin/machines) and ends in `CNTRL`.

Learn more about [Tailscale](https://tailscale.com/).

## Fields

`address`, `last_seen`, `expires`, `user`, `hostname`, `name`, `client_version`, `os`, `created`, `authorized`, `is_external`, `update_available`, `tags`

## Example

```yaml
# services.yaml
- Network:
    - Tailscale NAS:
        href: https://login.tailscale.com/admin/machines
        icon: tailscale
        widget:
          type: tailscale
          deviceid: n1234567CNTRL
          key: "{{DASHBOARD_VAR_TAILSCALE_KEY}}"
          fields: [address, last_seen, expires, update_available]
```
