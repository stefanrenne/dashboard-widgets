# NZBGet

The download rate (or paused, marked), what is left in the queue and what was downloaded, as
homepage's nzbget widget. `username` and `password` are NZBGet's control login
(**Settings > Security > ControlUsername / ControlPassword**), the one the web interface asks for.

Learn more about [NZBGet](https://nzbget.com/).

## Fields

`rate`, `remaining`, `downloaded`

## Example

```yaml
# services.yaml
- Downloads:
    - NZBGet:
        href: http://nzbget.lan:6789
        icon: nzbget
        widget:
          type: nzbget
          url: http://nzbget.lan:6789
          username: nzbget
          password: "{{DASHBOARD_VAR_NZBGET_PASSWORD}}"
```
