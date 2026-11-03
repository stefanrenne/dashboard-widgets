# Pterodactyl

The nodes and game servers in a Pterodactyl panel, as homepage's pterodactyl widget. Create an
application API key under **Admin > Application API** with read access to nodes and servers, and
use it as `key`.

Learn more about [Pterodactyl](https://pterodactyl.io/).

## Fields

`nodes`, `servers`

## Example

```yaml
# services.yaml
- Games:
    - Pterodactyl:
        href: https://panel.lan
        icon: pterodactyl
        widget:
          type: pterodactyl
          url: https://panel.lan
          key: "{{DASHBOARD_VAR_PTERODACTYL_KEY}}"
```
