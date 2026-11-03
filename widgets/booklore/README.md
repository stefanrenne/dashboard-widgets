# BookLore

The libraries and books of your BookLore account, and how many you are reading and have
finished, as homepage's booklore widget. `username` and `password` are your BookLore login.

Learn more about [BookLore](https://github.com/booklore-app/booklore).

## Fields

`libraries`, `books`, `reading`, `finished`

## Example

```yaml
# services.yaml
- Media:
    - BookLore:
        href: http://booklore.lan:6060
        icon: booklore
        widget:
          type: booklore
          url: http://booklore.lan:6060
          username: anna
          password: "{{DASHBOARD_VAR_BOOKLORE_PASSWORD}}"
```
