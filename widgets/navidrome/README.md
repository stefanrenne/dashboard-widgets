# Navidrome

What is playing on Navidrome, one row per listener with artist, title and album, as homepage's
navidrome widget.

Navidrome speaks the Subsonic API, which takes a token instead of the password: pick a random
`salt` and set `token` to the MD5 of your password followed by that salt, for example
`echo -n "mypasswordc19b2d" | md5sum` with salt `c19b2d`. See the
[Subsonic API](http://www.subsonic.org/pages/api.jsp) under Authentication.

Learn more about [Navidrome](https://www.navidrome.org/).

## Fields

No blocks: one row per stream.

## Example

```yaml
# services.yaml
- Media:
    - Navidrome:
        href: http://navidrome.lan:4533
        icon: navidrome
        widget:
          type: navidrome
          url: http://navidrome.lan:4533
          user: anna
          token: "{{DASHBOARD_VAR_NAVIDROME_TOKEN}}"
          salt: c19b2d
```
