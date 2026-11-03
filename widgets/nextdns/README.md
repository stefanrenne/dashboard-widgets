# NextDNS

The queries of a NextDNS profile by outcome: resolved, blocked, allowed (by an allowlist) and
relayed, as homepage's nextdns widget. The API key is under **Account > API**, the profile's ID
under **Setup > Endpoints > ID**.

Learn more about [NextDNS](https://nextdns.io/).

## Fields

`default`, `blocked`, `allowed`, `relayed`

## Example

```yaml
# services.yaml
- Network:
    - NextDNS:
        href: https://my.nextdns.io
        icon: nextdns
        widget:
          type: nextdns
          profile: abc123
          key: "{{DASHBOARD_VAR_NEXTDNS_KEY}}"
```
