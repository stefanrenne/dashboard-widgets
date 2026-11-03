# Firefly III

Your net worth (per currency, as Firefly III formats it) and what this month's budget has spent
of what is available, as homepage's firefly widget. An overspent budget is marked. Create a
token under **Options > Profile > OAuth > Personal Access Tokens** and use it as `key`.

Learn more about [Firefly III](https://www.firefly-iii.org/).

## Fields

`networth`, `budget`

## Example

```yaml
# services.yaml
- Finance:
    - Firefly III:
        href: https://firefly.lan
        icon: firefly
        widget:
          type: firefly
          url: https://firefly.lan
          key: "{{DASHBOARD_VAR_FIREFLY_TOKEN}}"
```
