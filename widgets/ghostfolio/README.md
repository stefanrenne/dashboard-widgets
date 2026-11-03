# Ghostfolio

How your portfolio did today, over the past year and since the start (a loss is marked), and
with `fields` its net worth, as homepage's ghostfolio widget. The widget needs a bearer token:
take the security token of your account (**My Ghostfolio > Access**) and exchange it once with

```
curl -X POST http://ghostfolio.lan:3333/api/v1/auth/anonymous -H 'Content-Type: application/json' -d '{ "accessToken": "<security token>" }'
```

The `authToken` in the answer is the `key`; it is valid for six months.

Learn more about [Ghostfolio](https://ghostfol.io/).

## Fields

`gross_percent_today`, `gross_percent_1y`, `gross_percent_max`, `net_worth`

## Example

```yaml
# services.yaml
- Finance:
    - Ghostfolio:
        href: http://ghostfolio.lan:3333
        icon: ghostfolio
        widget:
          type: ghostfolio
          url: http://ghostfolio.lan:3333
          key: "{{DASHBOARD_VAR_GHOSTFOLIO_TOKEN}}"
          fields: [gross_percent_today, gross_percent_max, net_worth]
```
