# Argo CD

The applications in Argo CD, and how many are synced, out of sync (marked) and healthy, as
homepage's argocd widget; progressing, degraded (marked), suspended and missing (marked) through
`fields`.

Make a read-only account for the dashboard: add `accounts.dashboard: apiKey` to the
`argocd-cm` ConfigMap and `g, dashboard, role:readonly` to `policy.csv` in `argocd-rbac-cm`, then
under **Settings > Accounts > dashboard > Tokens > Generate New** make the token.

Learn more about [Argo CD](https://argo-cd.readthedocs.io/).

## Fields

`apps`, `synced`, `outOfSync`, `healthy`, `progressing`, `degraded`, `suspended`, `missing`

## Example

```yaml
# services.yaml
- Kubernetes:
    - Argo CD:
        href: https://argocd.example.com
        icon: argo-cd
        widget:
          type: argocd
          url: https://argocd.example.com
          key: "{{DASHBOARD_VAR_ARGOCD_TOKEN}}"
```
