# Your Spotify

The songs you played, how long you listened and how many artists, over the past `interval`
(`day`, `week`, `month`, `year` or `all`; default `week`, the past 7 days), from Your Spotify, as
homepage's yourspotify widget. Generate a public token under **Settings > Account > Public
token** and use the part after `?token=` as `key`. `url` is Your Spotify's API (with
linuxserver's image add `/api`).

Learn more about [Your Spotify](https://github.com/Yooooomi/your_spotify).

## Fields

`songs`, `time`, `artists`

## Example

```yaml
# services.yaml
- Media:
    - Your Spotify:
        href: http://spotify.lan
        icon: spotify
        widget:
          type: yourspotify
          url: http://spotify.lan/api
          key: "{{DASHBOARD_VAR_YOURSPOTIFY_TOKEN}}"
          interval: month
```
