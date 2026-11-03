# Audiobookshelf

The number of podcasts and books over all libraries, and how long they play in total, as
homepage's audiobookshelf widget. The API token of an admin is under **Settings > Users**: click
your account.

Learn more about [Audiobookshelf](https://www.audiobookshelf.org/).

## Fields

`podcasts`, `podcastsDuration`, `books`, `booksDuration`

## Example

```yaml
# services.yaml
- Media:
    - Audiobookshelf:
        href: http://audiobookshelf.lan:13378
        icon: audiobookshelf
        widget:
          type: audiobookshelf
          url: http://audiobookshelf.lan:13378
          key: "{{DASHBOARD_VAR_AUDIOBOOKSHELF_TOKEN}}"
```
