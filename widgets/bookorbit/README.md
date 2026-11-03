# BookOrbit

The books and authors in BookOrbit and how many books you are reading and have finished, as
homepage's bookorbit widget; series and storage through `fields`. `username` and `password` are
your BookOrbit login.

Learn more about [BookOrbit](https://github.com/bookorbit/bookorbit).

## Fields

`books`, `authors`, `reading`, `finished`, `series`, `storage`

## Example

```yaml
# services.yaml
- Media:
    - BookOrbit:
        href: http://bookorbit.lan:3000
        icon: bookorbit
        widget:
          type: bookorbit
          url: http://bookorbit.lan:3000
          username: anna
          password: "{{DASHBOARD_VAR_BOOKORBIT_PASSWORD}}"
```
