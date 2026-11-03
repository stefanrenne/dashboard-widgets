# PhotoPrism

The albums, photos, videos and people in PhotoPrism, as homepage's photoprism widget. Log in with
a user (`username` and `password`), or create an app password under **Settings > Account > Apps
and Devices** and use it as `key`.

Learn more about [PhotoPrism](https://www.photoprism.app/).

## Fields

`albums`, `photos`, `videos`, `people`

## Example

```yaml
# services.yaml
- Photos:
    - PhotoPrism:
        href: http://photoprism.lan:2342
        icon: photoprism
        widget:
          type: photoprism
          url: http://photoprism.lan:2342
          key: "{{DASHBOARD_VAR_PHOTOPRISM_APP_PASSWORD}}"
```
