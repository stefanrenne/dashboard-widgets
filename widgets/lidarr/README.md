# Lidarr

Wanted (missing) albums, the albums in the download queue (marked when the queue has
errors or warnings) and the number of artists, as homepage's lidarr widget.

The API key is under **Settings > General > Security > API Key**.

Learn more about [Lidarr](https://lidarr.audio/).

## Fields

`wanted`, `queued`, `artists`

## Example

```yaml
# services.yaml
- Media:
    - Lidarr:
        href: http://lidarr.lan:8686
        icon: lidarr
        widget:
          type: lidarr
          url: http://lidarr.lan:8686
          key: "{{DASHBOARD_VAR_LIDARR_KEY}}"
```
