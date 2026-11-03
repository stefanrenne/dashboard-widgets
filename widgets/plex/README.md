# Plex

Active streams and the number of movies, TV shows and music albums over all libraries of a Plex
Media Server, as homepage's plex widget. The library counts are refreshed every 10 minutes.
For who is watching what, use the `tautulli` widget.

`key` is an X-Plex-Token: sign in to Plex Web, open any item's **Get Info > View XML**, and copy
the `X-Plex-Token` value from the address bar (see
[Plex's support article](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)).

Learn more about [Plex](https://www.plex.tv/).

## Fields

`streams`, `albums`, `movies`, `tv`

## Example

```yaml
# services.yaml
- Media:
    - Plex:
        href: http://plex.lan:32400/web
        icon: plex
        widget:
          type: plex
          url: http://plex.lan:32400
          key: "{{DASHBOARD_VAR_PLEX_TOKEN}}"
```
