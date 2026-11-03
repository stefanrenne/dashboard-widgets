# Atsumeru

The series, archives, chapters and categories in an Atsumeru manga and comics server, as
homepage's atsumeru widget. `username` and `password` are the login you use in the web
interface or the apps.

Learn more about [Atsumeru](https://github.com/AtsumeruDev/Atsumeru).

## Fields

`series`, `archives`, `chapters`, `categories`

## Example

```yaml
# services.yaml
- Media:
    - Atsumeru:
        href: http://atsumeru.lan:31337
        icon: atsumeru
        widget:
          type: atsumeru
          url: http://atsumeru.lan:31337
          username: anna
          password: "{{DASHBOARD_VAR_ATSUMERU_PASSWORD}}"
```
