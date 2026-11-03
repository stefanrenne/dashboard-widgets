# Komodo

The containers Komodo manages (total, running, stopped, unhealthy), or with `showStacks: true`
its stacks (total, running, down, unhealthy), or with `showSummary: true` the servers, stacks
and containers that run of all of them, as homepage's komodo widget. Stopped, down and unhealthy
ones are marked. Create an API key and secret in Komodo under **Settings > API Keys**.

Learn more about [Komodo](https://komo.do/).

## Fields

`total`, `running`, `stopped`, `down`, `unhealthy`, `unknown`, `servers`, `stacks`, `containers`

## Example

```yaml
# services.yaml
- Containers:
    - Komodo:
        href: http://komodo.lan:9120
        icon: komodo
        widget:
          type: komodo
          url: http://komodo.lan:9120
          key: "{{DASHBOARD_VAR_KOMODO_KEY}}"
          secret: "{{DASHBOARD_VAR_KOMODO_SECRET}}"
          showSummary: true
```
