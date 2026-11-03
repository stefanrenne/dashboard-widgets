# Arcane

Containers running, stopped and in total, and images with an update (marked), as homepage's
arcane widget; the number of images, used and unused through `fields`. Make an API key in
Arcane with the permissions `containers:list`, `images:list` and `image-updates:read`. `env` is
the environment id (0 is the local one).

Learn more about [Arcane](https://github.com/getarcaneapp/arcane).

## Fields

`running`, `stopped`, `total`, `image_updates`, `images`, `images_used`, `images_unused`

## Example

```yaml
# services.yaml
- Infrastructure:
    - Arcane:
        href: http://arcane.lan:3552
        icon: arcane
        widget:
          type: arcane
          url: http://arcane.lan:3552
          key: "{{DASHBOARD_VAR_ARCANE_KEY}}"
          env: 0
```
