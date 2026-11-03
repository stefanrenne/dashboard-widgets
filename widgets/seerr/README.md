# Seerr

Pending, approved and completed requests. Works with Seerr, Overseerr and Jellyseerr; the API key is under **Settings › General** there. homepage's `type: overseerr` (and `jellyseerr`) is this widget too.

Learn more about [Seerr](https://github.com/seerr-team/seerr).

## Fields

`pending`, `approved`, `completed`

## Example

```yaml
# services.yaml
- Media:
    - Seerr:
        href: https://requests.lan
        icon: overseerr
        widget:
          type: seerr
          url: http://seerr:5055
          key: "{{DASHBOARD_VAR_SEERR_KEY}}"
```
