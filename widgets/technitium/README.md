# Technitium DNS Server

The queries a Technitium DNS server answered over the past `range` (default the last hour), and
how many of them were authoritative, cached and server failures (marked), as homepage's
technitium widget (without the share of each: that does not fit a block on a phone). `fields` also offers no error, NX domain, refused, recursive,
blocked, dropped and the clients. Create an API token (best for a user of its own) under
**Administration > Sessions > Create Token**. `node` picks a cluster node, or `cluster` for all
of them.

Learn more about [Technitium DNS Server](https://technitium.com/dns/).

## Fields

`totalQueries`, `totalNoError`, `totalServerFailure`, `totalNxDomain`, `totalRefused`,
`totalAuthoritative`, `totalRecursive`, `totalCached`, `totalBlocked`, `totalDropped`,
`totalClients`

## Example

```yaml
# services.yaml
- Network:
    - Technitium:
        href: http://dns.lan:5380
        icon: technitium
        widget:
          type: technitium
          url: http://dns.lan:5380
          key: "{{DASHBOARD_VAR_TECHNITIUM_TOKEN}}"
          range: LastDay
```
