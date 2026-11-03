# FreshRSS

The unread articles and the subscriptions of a FreshRSS user, as homepage's freshrss widget.
Turn on **Administration > Authentication > Allow API access**, then set an API password under
**Profile > API management** and use it as `password` (not the login password); see
[Enable the API in FreshRSS](https://freshrss.github.io/FreshRSS/en/users/06_Mobile_access.html#enable-the-api-in-freshrss).

Learn more about [FreshRSS](https://freshrss.org/).

## Fields

`unread`, `subscriptions`

## Example

```yaml
# services.yaml
- News:
    - FreshRSS:
        href: http://freshrss.lan:8080
        icon: freshrss
        widget:
          type: freshrss
          url: http://freshrss.lan:8080
          username: anna
          password: "{{DASHBOARD_VAR_FRESHRSS_API_PASSWORD}}"
```
