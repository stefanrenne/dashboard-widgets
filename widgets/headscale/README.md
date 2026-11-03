# Headscale

One node of Headscale: its name, first IP address, how long ago it was last seen and whether it
is online (marked when not), as homepage's headscale widget. Create an API key with
`headscale apikeys create` and use it as `key`; `headscale nodes list` shows the node's ID.

Learn more about [Headscale](https://headscale.net/).

## Fields

`name`, `address`, `last_seen`, `status`

## Example

```yaml
# services.yaml
- Network:
    - Headscale:
        icon: headscale
        widget:
          type: headscale
          url: https://headscale.lan
          nodeId: 3
          key: "{{DASHBOARD_VAR_HEADSCALE_KEY}}"
```
