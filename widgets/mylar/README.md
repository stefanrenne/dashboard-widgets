# Mylar3

The comic series, their issues and the issues Mylar3 still wants (marked), as homepage's mylar
widget. Turn on the API under **Settings > Web Interface**, generate a key there and use it as
`key`.

Learn more about [Mylar3](https://github.com/mylar3/mylar3).

## Fields

`series`, `issues`, `wanted`

## Example

```yaml
# services.yaml
- Reading:
    - Mylar3:
        href: http://mylar.lan:8090
        icon: mylar
        widget:
          type: mylar
          url: http://mylar.lan:8090
          key: "{{DASHBOARD_VAR_MYLAR_KEY}}"
```
