# authentik

The number of users, and the logins, failed logins (marked) and, with `version: 2` (authentik
2025.8 or later), application authorizations of the last 24 hours, as homepage's authentik
widget.

Make a token under **Admin interface > Directory > Tokens and App passwords > Create**, with
intent **API Token**. Its user needs the global permissions "Can view User" (authentik Core) and
"Can view Event" (authentik Events).

Learn more about [authentik](https://goauthentik.io/).

## Fields

`users`, `loginsLast24H`, `failedLoginsLast24H`, `authorizationsLast24H`

## Example

```yaml
# services.yaml
- Security:
    - authentik:
        href: https://auth.example.com
        icon: authentik
        widget:
          type: authentik
          url: https://auth.example.com
          key: "{{DASHBOARD_VAR_AUTHENTIK_TOKEN}}"
          version: 2
```
