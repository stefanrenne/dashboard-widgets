# Tautulli

The streams playing on Plex right now, one row each with its progress. `enableUser` adds who is watching, `showEpisodeNumber` shows S01E02 instead of the episode title. The API key is under **Settings › Web Interface › API** in Tautulli.

Learn more about [Tautulli](https://tautulli.com).

## Fields

No blocks: one row per stream

## Example

```yaml
# services.yaml
- Media:
    - Plex:
        href: https://plex.lan
        icon: plex
        widget:
          type: tautulli
          url: http://tautulli:8181
          key: "{{DASHBOARD_VAR_TAUTULLI_KEY}}"
          enableUser: true
```
