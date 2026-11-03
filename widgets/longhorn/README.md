# Longhorn

How full the [Longhorn](https://longhorn.io) storage in your Kubernetes cluster is: all nodes
together and per node, summed over each node's disks as the Longhorn dashboard does. A node from
90% is marked. As in homepage, put Longhorn's address (its UI, which also serves the API) and any
basic-auth login once under `providers` in settings.yaml and use `provider: longhorn`; or set
`url`, `username` and `password` on the entry. `include` limits it to some nodes, `labels: false`
numbers them instead of naming them, and `expanded` adds free and total space per node as rows.

Learn more about [Longhorn](https://longhorn.io/docs/).

## Fields

`total`, `node1`, `node2`, `node3`, … (one per node, in Longhorn's order; the block shows the node's name)

## Example

```yaml
# settings.yaml
providers:
  longhorn:
    url: https://longhorn.lan
    username: admin
    password: "{{DASHBOARD_VAR_LONGHORN_PASSWORD}}"

# services.yaml
- Storage:
    - Longhorn:
        href: https://longhorn.lan
        icon: longhorn
        widget:
          type: longhorn
          provider: longhorn
          expanded: true
          include: [node-a, node-b]
```
