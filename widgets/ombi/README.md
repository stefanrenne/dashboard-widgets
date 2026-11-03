# Ombi

Requests waiting for approval (marked), approved and available, as homepage's ombi widget. The
API key is under **Settings > Configuration > General > Api Key**.

Learn more about [Ombi](https://ombi.io/).

## Fields

`pending`, `approved`, `available`

## Example

```yaml
# services.yaml
- Media:
    - Ombi:
        href: http://ombi.lan:3579
        icon: ombi
        widget:
          type: ombi
          url: http://ombi.lan:3579
          key: "{{DASHBOARD_VAR_OMBI_KEY}}"
```
