# UptimeRobot

With a **Read-Only API Key** the monitors that are up and down (marked) in your UptimeRobot
account; with a **Monitor-Specific API Key** that monitor's state (down marked), how long it has
been up, and how long ago and for how long it was last down, as homepage's uptimerobot widget. Both keys are
under **My Settings > API Settings**.

Learn more about [UptimeRobot](https://uptimerobot.com/).

## Fields

`sitesUp`, `sitesDown`, `status`, `uptime`, `lastDown`, `downDuration`

## Example

```yaml
# services.yaml
- Monitoring:
    - UptimeRobot:
        href: https://dashboard.uptimerobot.com
        icon: uptimerobot
        widget:
          type: uptimerobot
          key: "{{DASHBOARD_VAR_UPTIMEROBOT_KEY}}"
```
