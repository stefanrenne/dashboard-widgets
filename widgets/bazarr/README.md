# Bazarr

Episodes and movies that are still missing subtitles. The API key is under **Settings › General › Security** in Bazarr.

Learn more about [Bazarr](https://www.bazarr.media).

## Fields

`missingEpisodes`, `missingMovies`

## Example

```yaml
# services.yaml
- Media:
    - Bazarr:
        href: https://bazarr.lan
        icon: bazarr
        widget:
          type: bazarr
          url: http://bazarr:6767
          key: "{{DASHBOARD_VAR_BAZARR_KEY}}"
```
