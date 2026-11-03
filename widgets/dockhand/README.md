# Dockhand

Containers running and in total, and the CPU and memory in use, of one Dockhand environment or
all together, as homepage's dockhand widget; stopped (marked), paused, pending updates (marked),
images, volumes, stacks and today's events through `fields`. Log in with a local Dockhand user
(`username` and `password`) or give an API `key`.

Learn more about [Dockhand](https://dockhand.pro/).

## Fields

`running`, `total`, `cpu`, `memory`, `stopped`, `paused`, `pending_updates`, `images`, `volumes`, `stacks`, `events_today`

## Example

```yaml
# services.yaml
- Infrastructure:
    - Dockhand:
        href: http://dockhand.lan:3001
        icon: dockhand
        widget:
          type: dockhand
          url: http://dockhand.lan:3001
          environment: local
          username: admin
          password: "{{DASHBOARD_VAR_DOCKHAND_PASSWORD}}"
```
