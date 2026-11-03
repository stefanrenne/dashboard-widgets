# Pulse

The Proxmox nodes, VMs and LXC containers that run of all of them (fewer marked), from Pulse, as
homepage's pulse widget; Pulse 6 (`version: 2`) gives the counts only. Create an API token with
the `monitoring:read` scope under **Settings > Security** and use it as `key`.

Learn more about [Pulse](https://github.com/rcourtman/Pulse).

## Fields

`nodes`, `vms`, `lxcs`

## Example

```yaml
# services.yaml
- Monitoring:
    - Pulse:
        href: http://pulse.lan:7655
        icon: pulse
        widget:
          type: pulse
          url: http://pulse.lan:7655
          key: "{{DASHBOARD_VAR_PULSE_TOKEN}}"
```
