# SparkyFitness

Today's calories eaten, burned and remaining (over the goal marked) and steps in SparkyFitness,
as homepage's sparkyfitness widget. Create an API key in SparkyFitness's settings and use it as
`key`.

Learn more about [SparkyFitness](https://github.com/CodeWithCJ/SparkyFitness).

## Fields

`eaten`, `burned`, `remaining`, `steps`

## Example

```yaml
# services.yaml
- Health:
    - SparkyFitness:
        href: http://sparkyfitness.lan:3004
        icon: sparkyfitness
        widget:
          type: sparkyfitness
          url: http://sparkyfitness.lan:3004
          key: "{{DASHBOARD_VAR_SPARKYFITNESS_KEY}}"
```
