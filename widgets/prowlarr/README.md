# Prowlarr

Grabs and queries over all indexers, and how many of them failed. The API key is under **Settings › General › Security** in Prowlarr.

Learn more about [Prowlarr](https://prowlarr.com).

## Fields

`grabs`, `queries`, `failGrabs`, `failQueries`

## Example

```yaml
# services.yaml
- Media:
    - Prowlarr:
        href: https://prowlarr.lan
        icon: prowlarr
        widget:
          type: prowlarr
          url: http://prowlarr:9696
          key: "{{DASHBOARD_VAR_PROWLARR_KEY}}"
```
