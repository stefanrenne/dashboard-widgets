# TP-Link Omada

The connected access points, clients, alerts (marked) and connected gateways of an Omada site,
and with `fields` its connected switches, as homepage's omada widget. Works with Omada controller
(software, OC hardware or cloud-less) 4, 5 and 6. Create a viewer account for the dashboard
under **Admin**, and fill in the site's name as shown in the controller (often `Default`).
`insecure: true` accepts the controller's self-signed certificate.

Learn more about [Omada](https://www.omadanetworks.com/).

## Fields

`connectedAp`, `activeUser`, `alerts`, `connectedGateways`, `connectedSwitches`

## Example

```yaml
# services.yaml
- Network:
    - Omada:
        href: https://omada.lan:8043
        icon: omada
        widget:
          type: omada
          url: https://omada.lan:8043
          username: dashboard
          password: "{{DASHBOARD_VAR_OMADA_PASSWORD}}"
          site: Default
          insecure: true
```
