# Plant-it

The diary events, plants, photos and species in Plant-it, as homepage's plantit widget. Use the
API's port (8080 by default) in `url`. An API key is created through Plant-it's REST API
(`POST /api/api-key` while logged in; see its Swagger page at `/api/swagger-ui/index.html`).

Learn more about [Plant-it](https://github.com/MDeLuise/plant-it).

## Fields

`events`, `plants`, `photos`, `species`

## Example

```yaml
# services.yaml
- Home:
    - Plant-it:
        href: http://plantit.lan:3000
        icon: plant-it
        widget:
          type: plantit
          url: http://plantit.lan:8080
          key: "{{DASHBOARD_VAR_PLANTIT_KEY}}"
```
