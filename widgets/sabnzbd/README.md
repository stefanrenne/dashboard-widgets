# SABnzbd

Download speed, items in the queue and the time left; a paused queue is marked. The API key is under **Config › General › Security** in SABnzbd.

Learn more about [SABnzbd](https://sabnzbd.org).

## Fields

`rate`, `queue`, `timeleft`

## Example

```yaml
# services.yaml
- Downloads:
    - SABnzbd:
        href: https://sabnzbd.lan
        icon: sabnzbd
        widget:
          type: sabnzbd
          url: http://sabnzbd:8080
          key: "{{DASHBOARD_VAR_SABNZBD_KEY}}"
```
