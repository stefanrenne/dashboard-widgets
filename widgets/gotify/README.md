# Gotify

The applications, clients and messages in Gotify, as homepage's gotify widget. Messages are
counted up to 200. Create a client under **Clients** in Gotify's web interface (or use an
existing one) and use its token as `key`.

Learn more about [Gotify](https://gotify.net/).

## Fields

`apps`, `clients`, `messages`

## Example

```yaml
# services.yaml
- Notifications:
    - Gotify:
        href: http://gotify.lan
        icon: gotify
        widget:
          type: gotify
          url: http://gotify.lan
          key: "{{DASHBOARD_VAR_GOTIFY_CLIENT_TOKEN}}"
```
