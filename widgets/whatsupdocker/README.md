# What's up Docker

Containers being watched and how many have an update. Set `username` and `password` only when WUD has basic authentication on.

Learn more about [What's up Docker](https://getwud.github.io/wud/).

## Fields

`monitoring`, `updates`

## Example

```yaml
# services.yaml
- Infrastructure:
    - What’s up Docker:
        href: https://wud.lan
        icon: whats-up-docker
        widget:
          type: whatsupdocker
          url: http://wud:3000
          username: admin
          password: "{{DASHBOARD_VAR_WUD_PASSWORD}}"
```
