# AdGuard Home

DNS queries, queries blocked by the filter lists, queries filtered by Safe Browsing, Safe Search
and parental control, and the average processing time, as homepage's adguard widget. Over the
statistics period set in AdGuard Home (**Settings > General settings > Statistics**).

`username` and `password` are the login of AdGuard Home's web interface.

Learn more about [AdGuard Home](https://github.com/AdguardTeam/AdGuardHome).

## Fields

`queries`, `blocked`, `filtered`, `latency`

## Example

```yaml
# services.yaml
- Network:
    - AdGuard Home:
        href: http://adguard.lan:3000
        icon: adguard-home
        widget:
          type: adguard
          url: http://adguard.lan:3000
          username: admin
          password: "{{DASHBOARD_VAR_ADGUARD_PASSWORD}}"
```
