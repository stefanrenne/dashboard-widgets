# Tracearr

The streams playing now across your Plex, Jellyfin and Emby servers, from Tracearr: a row per
stream with its title, play or pause and its progress, as homepage's tracearr widget.
`view: summary` shows the streams, transcodes, direct plays and the total bitrate instead, and
`view: both` both. `enableUser` adds the user, `showEpisodeNumber` the season and episode. Create
a public API key under **Settings > API** and use it as `key`.

Learn more about [Tracearr](https://www.tracearr.com/).

## Fields

With `view: summary` or `both`: `streams`, `transcodes`, `directplay`, `bitrate`.

## Example

```yaml
# services.yaml
- Media:
    - Tracearr:
        href: http://tracearr.lan:3000
        icon: tracearr
        widget:
          type: tracearr
          url: http://tracearr.lan:3000
          key: "{{DASHBOARD_VAR_TRACEARR_KEY}}"
          view: both
          enableUser: true
```
