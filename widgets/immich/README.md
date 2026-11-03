# Immich

The number of users, photos and videos and the storage they use, as homepage's immich widget.
Set `version: 2` for Immich 1.118 or later (homepage's default is 1).

Make an API key as an admin under **Account Settings > API Keys**, with at least the permission
`server.statistics`.

Learn more about [Immich](https://immich.app/).

## Fields

`users`, `photos`, `videos`, `storage`

## Example

```yaml
# services.yaml
- Media:
    - Immich:
        href: http://immich.lan:2283
        icon: immich
        widget:
          type: immich
          url: http://immich.lan:2283
          key: "{{DASHBOARD_VAR_IMMICH_KEY}}"
          version: 2
```
