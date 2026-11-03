# NetBird

The peers online of all peers (marked when some are not), the users, and with `fields` the peers
whose login expired (marked), as homepage's netbird widget. Create a
[personal access token](https://docs.netbird.io/manage/public-api) for a user with the Admin role
(preferably a service user, under **Team > Service Users**) and use it as `key`. For NetBird
Cloud use `https://api.netbird.io` as `url`.

Learn more about [NetBird](https://netbird.io/).

## Fields

`online`, `users`, `login_expired`

## Example

```yaml
# services.yaml
- Network:
    - NetBird:
        href: https://app.netbird.io
        icon: netbird
        widget:
          type: netbird
          url: https://api.netbird.io
          key: "{{DASHBOARD_VAR_NETBIRD_TOKEN}}"
          fields: [online, users, login_expired]
```
