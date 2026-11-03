# Emby

What is playing on Emby, one row per stream with its position and a progress bar (paused
streams get a pause icon), as homepage's emby widget. With `enableBlocks: true` it also shows
the number of movies, series, episodes and songs; `enableNowPlaying: false` leaves the
streams out. Pausing a stream from the card (homepage's `enableMediaControl`) is not offered:
the widgets only read.

Make an API key in Emby under **Settings > Advanced > API Keys**.

Learn more about [Emby](https://emby.media/).

## Fields

`movies`, `series`, `episodes`, `songs`

## Example

```yaml
# services.yaml
- Media:
    - Emby:
        href: http://emby.lan:8096
        icon: emby
        widget:
          type: emby
          url: http://emby.lan:8096
          key: "{{DASHBOARD_VAR_EMBY_KEY}}"
          enableBlocks: true
          enableUser: true
          showEpisodeNumber: true
```
