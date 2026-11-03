# Cloudflare Tunnel

The status of a Cloudflare Tunnel (degraded and down marked) and the IP address it connects
from, as homepage's cloudflared widget. Make an API token on
[your profile's API tokens](https://dash.cloudflare.com/profile/api-tokens) with only
**Account > Cloudflare Tunnel > Read**. The account id is in the Zero Trust dashboard's address,
the tunnel id under the tunnel's name in **Networks > Tunnels**.

Learn more about [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/).

## Fields

`status`, `origin_ip`

## Example

```yaml
# services.yaml
- Network:
    - Tunnel:
        icon: cloudflare-zero-trust
        widget:
          type: cloudflared
          accountid: 0123456789abcdef0123456789abcdef
          tunnelid: 01234567-89ab-cdef-0123-456789abcdef
          key: "{{DASHBOARD_VAR_CLOUDFLARE_TOKEN}}"
```
