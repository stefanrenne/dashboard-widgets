# Tube Archivist

The downloads waiting in Tube Archivist's queue and the videos, channels and playlists it holds,
as homepage's tubearchivist widget. Needs Tube Archivist 0.4.4 or later. The token is under
**Settings > Application > API Token**.

Learn more about [Tube Archivist](https://www.tubearchivist.com/).

## Fields

`downloads`, `videos`, `channels`, `playlists`

## Example

```yaml
# services.yaml
- Media:
    - Tube Archivist:
        href: http://tubearchivist.lan:8000
        icon: tube-archivist
        widget:
          type: tubearchivist
          url: http://tubearchivist.lan:8000
          key: "{{DASHBOARD_VAR_TUBEARCHIVIST_TOKEN}}"
```
