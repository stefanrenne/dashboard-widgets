# Syncthing

The devices connected out of all, how far everything is in sync (marked below 100%), errors
(marked) and the size of the shared data, as homepage's syncthing widget. The API key is under
**Actions > Settings > General > API Key**.

Learn more about [Syncthing](https://syncthing.net/).

## Fields

`connected`, `synced`, `errors`, `storage`

## Example

```yaml
# services.yaml
- Storage:
    - Syncthing:
        href: http://syncthing.lan:8384
        icon: syncthing
        widget:
          type: syncthing
          url: http://syncthing.lan:8384
          key: "{{DASHBOARD_VAR_SYNCTHING_KEY}}"
```
