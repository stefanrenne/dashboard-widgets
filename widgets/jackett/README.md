# Jackett

The configured indexers and how many of them failed on their last search (marked), as homepage's
jackett widget. `key` is the **API Key** at the top of Jackett's page. When Jackett has an
**Admin password** set, give it as `password` too.

Learn more about [Jackett](https://github.com/Jackett/Jackett).

## Fields

`configured`, `errored`

## Example

```yaml
# services.yaml
- Downloads:
    - Jackett:
        href: http://jackett.lan:9117
        icon: jackett
        widget:
          type: jackett
          url: http://jackett.lan:9117
          key: "{{DASHBOARD_VAR_JACKETT_KEY}}"
          password: "{{DASHBOARD_VAR_JACKETT_PASSWORD}}"   # only with an admin password
```
