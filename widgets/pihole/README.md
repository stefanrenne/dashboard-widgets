# Pi-hole

Today's DNS queries, how many were blocked (also as a share) and the number of domains on the
blocklist (gravity), as homepage's pihole widget.

Set `version: 6` for Pi-hole 6 or later (homepage's default is 5). With Pi-hole 6, `key` is the
web interface password or an app password (**Settings > Web interface / API > Configure app
password**); leave it out when Pi-hole has no password. With Pi-hole 5, `key` is the API token
from **Settings > API / Web interface > Show API token**.

Learn more about [Pi-hole](https://pi-hole.net/).

## Fields

`queries`, `blocked`, `blocked_percent`, `gravity`

## Example

```yaml
# services.yaml
- Network:
    - Pi-hole:
        href: http://pi.hole/admin
        icon: pi-hole
        widget:
          type: pihole
          url: http://pi.hole
          version: 6
          key: "{{DASHBOARD_VAR_PIHOLE_PASSWORD}}"
```
