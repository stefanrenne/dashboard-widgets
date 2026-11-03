# Jellyfin

What is playing on Jellyfin, one row per stream with its position and a progress bar (paused
streams get a pause icon), as homepage's jellyfin widget. With `enableBlocks: true` it also shows
the number of movies, series, episodes, songs and albums; `enableNowPlaying: false` leaves the
streams out. Pausing a stream from the card (homepage's `enableMediaControl`) is not offered:
the widgets only read.

Make an API key in Jellyfin under **Dashboard > API Keys** (Jellyfin 10.12: **Administration >
Dashboard > Advanced > API Keys**). homepage's `version: 2` is accepted but not needed.

Learn more about [Jellyfin](https://jellyfin.org/).

## Fields

`movies`, `series`, `episodes`, `songs`, `albums`

## Example

```yaml
# services.yaml
- Media:
    - Jellyfin:
        href: http://jellyfin.lan:8096
        icon: jellyfin
        widget:
          type: jellyfin
          url: http://jellyfin.lan:8096
          key: "{{DASHBOARD_VAR_JELLYFIN_KEY}}"
          enableBlocks: true
          enableUser: true
          showEpisodeNumber: true
```
