# Karakeep

Your bookmarks, favorites, archived items and highlights in Karakeep (formerly Hoarder), and with
`fields` your lists and tags, as homepage's karakeep widget. Create a key under **User Settings >
API Keys** and use it as `key`.

Learn more about [Karakeep](https://karakeep.app/).

## Fields

`bookmarks`, `favorites`, `archived`, `highlights`, `lists`, `tags`

## Example

```yaml
# services.yaml
- Reading:
    - Karakeep:
        href: http://karakeep.lan:3000
        icon: karakeep
        widget:
          type: karakeep
          url: http://karakeep.lan:3000
          key: "{{DASHBOARD_VAR_KARAKEEP_KEY}}"
```
