# Speedtest Tracker

Download, upload and ping of the latest speed test, as homepage's speedtest widget. Version 1
(the default) works with both [alexjustesen's](https://github.com/alexjustesen/speedtest-tracker)
Speedtest Tracker before 1.2.1 and henrywhitaker3's Speedtest-Tracker. For alexjustesen's 1.2.1
or later set `version: 2` and give an API token from **Settings > API Tokens** as `key`.

Learn more about [Speedtest Tracker](https://docs.speedtest-tracker.dev/).

## Fields

`download`, `upload`, `ping`

## Example

```yaml
# services.yaml
- Network:
    - Speedtest Tracker:
        href: http://speedtest.lan:8080
        icon: speedtest-tracker
        widget:
          type: speedtest
          url: http://speedtest.lan:8080
          version: 2
          key: "{{DASHBOARD_VAR_SPEEDTEST_TOKEN}}"
          bitratePrecision: 1
```
