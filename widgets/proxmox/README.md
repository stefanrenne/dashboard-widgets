# Proxmox VE

Running and total virtual machines and LXC containers (templates left out), and the CPU and
memory in use over the online nodes, as homepage's proxmox widget. `node` limits it to one node.
For one VM or container on a service's card, use the dashboard's own `proxmoxNode` and
`proxmoxVMID` instead.

Make a read-only API token: **Datacenter > Permissions > API Tokens > Add** (with **Privilege
Separation** checked), then **Datacenter > Permissions > Add > API Token Permission** with path
`/`, that token and the role **PVEAuditor**. `username` is the token id (`api@pam!dashboard`),
`password` the secret Proxmox shows once. Proxmox uses a self-signed certificate by default,
so `insecure` is on, as in homepage; set `insecure: false` with a trusted certificate.

Learn more about [Proxmox VE](https://www.proxmox.com/en/proxmox-virtual-environment).

## Fields

`vms`, `lxc`, `resources.cpu`, `resources.mem`

## Example

```yaml
# services.yaml
- Infrastructure:
    - Proxmox:
        href: https://pve.lan:8006
        icon: proxmox
        widget:
          type: proxmox
          url: https://pve.lan:8006
          username: api@pam!dashboard
          password: "{{DASHBOARD_VAR_PROXMOX_SECRET}}"
          node: pve-1                  # optional: one node
```
