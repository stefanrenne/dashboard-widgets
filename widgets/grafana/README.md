# Grafana

Dashboards, data sources, alert rules and the alerts that are firing (marked), as homepage's
grafana widget. Set `version: 2` for Grafana after 10.4; it then reads the alerts from Grafana's
own alertmanager, or with `alerts: alertmanager` from an external Alertmanager set up as a data
source.

The counts come from `/api/admin/stats`, so `username` and `password` are those of a Grafana
server admin.

Learn more about [Grafana](https://grafana.com/oss/grafana/).

## Fields

`dashboards`, `datasources`, `totalalerts`, `alertstriggered`

## Example

```yaml
# services.yaml
- Monitoring:
    - Grafana:
        href: http://grafana.lan:3000
        icon: grafana
        widget:
          type: grafana
          url: http://grafana.lan:3000
          version: 2
          username: admin
          password: "{{DASHBOARD_VAR_GRAFANA_PASSWORD}}"
```
