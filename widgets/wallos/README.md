# Wallos

Your active subscriptions in Wallos, the next to renew, and what this and next month cost (and
with `fields` last month), as homepage's wallos widget. The cost is the total of the payments in
that month, not a monthly average. With subscriptions in more than one currency set a Fixer API
key in Wallos (**Settings > Fixer API Key**). The API key is under **Profile > API Key**.

Learn more about [Wallos](https://github.com/ellite/wallos).

## Fields

`activeSubscriptions`, `nextRenewingSubscription`, `previousMonthlyCost`, `thisMonthlyCost`,
`nextMonthlyCost`

## Example

```yaml
# services.yaml
- Finance:
    - Wallos:
        href: http://wallos.lan:8282
        icon: wallos
        widget:
          type: wallos
          url: http://wallos.lan:8282
          key: "{{DASHBOARD_VAR_WALLOS_KEY}}"
```
