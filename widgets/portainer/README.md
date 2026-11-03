# Portainer

Running, stopped and total containers of one Portainer environment. `env` is the environment id: open the environment in Portainer and take the number at the end of the URL (`#!/1/docker/dashboard` → `1`). Create an access token under **My account › Access tokens**.

Learn more about [Portainer](https://www.portainer.io).

## Fields

`running`, `stopped`, `total`

## Example

```yaml
# services.yaml
- Infrastructure:
    - Portainer:
        href: https://portainer.lan:9443
        icon: portainer
        widget:
          type: portainer
          url: https://portainer:9443
          env: 1
          key: "{{DASHBOARD_VAR_PORTAINER_KEY}}"
```
