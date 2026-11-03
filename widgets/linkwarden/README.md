# Linkwarden

The links, collections and tags in Linkwarden, as homepage's linkwarden widget. Create a token
under **Settings > Access Tokens** and use it as `key`.

Learn more about [Linkwarden](https://linkwarden.app/).

## Fields

`links`, `collections`, `tags`

## Example

```yaml
# services.yaml
- Reading:
    - Linkwarden:
        href: http://linkwarden.lan:3000
        icon: linkwarden
        widget:
          type: linkwarden
          url: http://linkwarden.lan:3000
          key: "{{DASHBOARD_VAR_LINKWARDEN_TOKEN}}"
```
