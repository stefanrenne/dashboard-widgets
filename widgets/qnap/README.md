# QNAP

A QNAP NAS's CPU and memory use, its temperature, and the use of all its volumes together, or
with `volume` of one volume (named as in **Storage & Snapshots**), as homepage's qnap widget.
CPU, memory and volume use above 90% are marked. The widget logs in with a QTS user; two-step
verification must be off for that user. `insecure: true` accepts the NAS's self-signed
certificate.

Learn more about [QNAP](https://www.qnap.com/).

## Fields

`cpuUsage`, `memUsage`, `systemTempC`, `poolUsage`, `volumeUsage`

## Example

```yaml
# services.yaml
- Storage:
    - QNAP:
        href: https://nas.lan
        icon: qnap
        widget:
          type: qnap
          url: https://nas.lan
          username: dashboard
          password: "{{DASHBOARD_VAR_QNAP_PASSWORD}}"
          volume: DataVol1
```
