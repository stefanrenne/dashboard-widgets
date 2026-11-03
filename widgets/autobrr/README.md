# autobrr

Releases autobrr pushed and that were approved or rejected by the download client, and the
number of filters and indexers, as homepage's autobrr widget. The API key is under
**Settings > API Keys**.

Learn more about [autobrr](https://autobrr.com/).

## Fields

`approvedPushes`, `rejectedPushes`, `filters`, `indexers`

## Example

```yaml
# services.yaml
- Downloads:
    - autobrr:
        href: http://autobrr.lan:7474
        icon: autobrr
        widget:
          type: autobrr
          url: http://autobrr.lan:7474
          key: "{{DASHBOARD_VAR_AUTOBRR_KEY}}"
```
