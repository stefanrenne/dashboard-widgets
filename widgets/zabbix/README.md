# Zabbix

The problems in Zabbix (monitored triggers in a problem state) per severity: warning and average
(marked as warnings), high and disaster (marked as errors), and with `fields` unclassified and
information, as homepage's zabbix widget. Needs Zabbix 7 or later. Create a token under **Users >
API tokens** and use it as `key`; `url` is the front end's address (often ending in `/zabbix`).

Learn more about [Zabbix](https://www.zabbix.com/).

## Fields

`unclassified`, `information`, `warning`, `average`, `high`, `disaster`

## Example

```yaml
# services.yaml
- Monitoring:
    - Zabbix:
        href: http://zabbix.lan/zabbix
        icon: zabbix
        widget:
          type: zabbix
          url: http://zabbix.lan/zabbix
          key: "{{DASHBOARD_VAR_ZABBIX_TOKEN}}"
```
