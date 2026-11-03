# Homebridge

Whether Homebridge is up (marked when not), whether an update for Homebridge or one of its
plugins is available (marked), and the child bridges that run of all of them (when there are
any), as homepage's homebridge widget. The API comes from the Homebridge UI
(homebridge-config-ui-x, part of Homebridge); the widget logs in with a user of that UI.

Learn more about [Homebridge](https://homebridge.io/).

## Fields

`status`, `updates`, `child_bridges`

## Example

```yaml
# services.yaml
- Home:
    - Homebridge:
        href: http://homebridge.lan:8581
        icon: homebridge
        widget:
          type: homebridge
          url: http://homebridge.lan:8581
          username: admin
          password: "{{DASHBOARD_VAR_HOMEBRIDGE_PASSWORD}}"
```
