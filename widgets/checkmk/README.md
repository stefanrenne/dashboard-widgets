# Checkmk

The services that are not OK (marked) and the hosts that are not up (marked) in a Checkmk site,
as homepage's checkmk widget. Use an automation user (**Setup > Users > Add user**, with
**Automation secret for machine accounts**): `username` is its name, `password` its secret.
`site` is the site's name, as in its address (`/cmk/check_mk/`).

Learn more about [Checkmk](https://checkmk.com/).

## Fields

`serviceErrors`, `hostErrors`

## Example

```yaml
# services.yaml
- Monitoring:
    - Checkmk:
        href: http://checkmk.lan:5000/cmk/check_mk/
        icon: checkmk
        widget:
          type: checkmk
          url: http://checkmk.lan:5000
          site: cmk
          username: automation
          password: "{{DASHBOARD_VAR_CHECKMK_SECRET}}"
```
