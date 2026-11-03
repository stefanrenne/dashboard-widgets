# Calibre-Web

The books, authors, categories and series in Calibre-Web (0.6.21 or later), as homepage's
calibreweb widget. `username` and `password` are a Calibre-Web login; OPDS must be on
(**Admin > Edit Basic Configuration > Feature Configuration**, it is on by default).

Learn more about [Calibre-Web](https://github.com/janeczku/calibre-web).

## Fields

`books`, `authors`, `categories`, `series`

## Example

```yaml
# services.yaml
- Media:
    - Calibre-Web:
        href: http://calibre-web.lan:8083
        icon: calibre-web
        widget:
          type: calibreweb
          url: http://calibre-web.lan:8083
          username: anna
          password: "{{DASHBOARD_VAR_CALIBREWEB_PASSWORD}}"
```
