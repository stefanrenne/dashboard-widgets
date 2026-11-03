# Nginx Proxy Manager

Proxy hosts that are enabled, disabled and in total, as homepage's npm widget. Make a user with
view-only permissions (**Users > Add User**, then **Permissions**: Proxy Hosts "View Only") and
give its e-mail address as `username`.

Learn more about [Nginx Proxy Manager](https://nginxproxymanager.com/).

## Fields

`enabled`, `disabled`, `total`

## Example

```yaml
# services.yaml
- Network:
    - Nginx Proxy Manager:
        href: http://npm.lan:81
        icon: nginx-proxy-manager
        widget:
          type: npm
          url: http://npm.lan:81
          username: viewer@example.com
          password: "{{DASHBOARD_VAR_NPM_PASSWORD}}"
```
