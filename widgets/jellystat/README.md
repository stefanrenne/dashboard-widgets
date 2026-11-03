# Jellystat

The songs, movies, episodes and other items played on your Jellyfin server in the past `days`
(default 30), from Jellystat, as homepage's jellystat widget. Create a key under **Settings >
API Keys** in Jellystat and use it as `key`.

Learn more about [Jellystat](https://github.com/CyferShepard/Jellystat).

## Fields

`songs`, `movies`, `episodes`, `other`

## Example

```yaml
# services.yaml
- Media:
    - Jellystat:
        href: http://jellystat.lan:3000
        icon: jellystat
        widget:
          type: jellystat
          url: http://jellystat.lan:3000
          key: "{{DASHBOARD_VAR_JELLYSTAT_KEY}}"
          days: 7
```
