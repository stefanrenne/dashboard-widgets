# Homebox

The items in your Homebox inventory, their total value (in the currency set in Homebox), and
with `fields` the items under warranty, locations, labels and users, as homepage's homebox
widget. The widget logs in with the e-mail address and password you use on the web.

Learn more about [Homebox](https://homebox.software/).

## Fields

`items`, `totalWithWarranty`, `locations`, `labels`, `users`, `totalValue`

## Example

```yaml
# services.yaml
- Home:
    - Homebox:
        href: http://homebox.lan:7745
        icon: homebox
        widget:
          type: homebox
          url: http://homebox.lan:7745
          username: anna@example.com
          password: "{{DASHBOARD_VAR_HOMEBOX_PASSWORD}}"
```
