# Kavita

The series and files in Kavita, as homepage's kavita widget. The server statistics need an admin:
fill in an admin's `username` and `password`, or instead that user's API key (**User settings >
API Key**) as `key`.

Learn more about [Kavita](https://www.kavitareader.com/).

## Fields

`seriesCount`, `totalFiles`

## Example

```yaml
# services.yaml
- Reading:
    - Kavita:
        href: http://kavita.lan:5000
        icon: kavita
        widget:
          type: kavita
          url: http://kavita.lan:5000
          key: "{{DASHBOARD_VAR_KAVITA_KEY}}"
```
