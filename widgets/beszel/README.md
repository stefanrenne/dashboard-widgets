# Beszel

How many systems Beszel watches and how many are up (marked when not all), or with `systemId` one
system: its name, status (down marked), how long ago it reported, and its CPU, memory, disk and
network use, as homepage's beszel widget. `systemId` is the system's name in Beszel, or its id
from PocketBase's admin panel.

Beszel's API needs a superuser: `username` is its e-mail address. Set `version: 2` for Beszel 0.9
or later.

Learn more about [Beszel](https://beszel.dev/).

## Fields

`systems`, `up`; with `systemId`: `name`, `status`, `updated`, `cpu`, `memory`, `disk`, `network`

## Example

```yaml
# services.yaml
- Monitoring:
    - Beszel:
        href: http://beszel.lan:8090
        icon: beszel
        widget:
          type: beszel
          url: http://beszel.lan:8090
          version: 2
          username: admin@example.com
          password: "{{DASHBOARD_VAR_BESZEL_PASSWORD}}"
          systemId: nas                # optional: one system
```
