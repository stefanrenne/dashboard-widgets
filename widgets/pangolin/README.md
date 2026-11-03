# Pangolin

The sites online, the healthy resources and targets (each of all; fewer marked) and the traffic
of a Pangolin organization, as homepage's pangolin widget; `fields` also offers the traffic in
and out. A resource counts as healthy when one of its targets is, or when it has none. Create an
API key with **List Sites** and **List Resources**; on a self-hosted Pangolin first turn on the
[Integration API](https://docs.pangolin.net/self-host/advanced/integration-api). The
organization's ID is in the address after logging in (`https://pangolin.lan/<org>/...`).

Learn more about [Pangolin](https://pangolin.net/).

## Fields

`sites`, `resources`, `targets`, `traffic`, `in`, `out`

## Example

```yaml
# services.yaml
- Network:
    - Pangolin:
        href: https://pangolin.lan
        icon: pangolin
        widget:
          type: pangolin
          url: https://api.pangolin.lan
          key: "{{DASHBOARD_VAR_PANGOLIN_KEY}}"
          org: homelab
```
