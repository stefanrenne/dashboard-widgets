# Proxmox Backup Server

How full the datastores are (together, or one `datastore`), the tasks that failed in the last 24
hours (marked when there are any; 99+ from 100), and the CPU and memory in use, as homepage's
proxmoxbackupserver widget.

Make an API token: **Configuration > Access Control > API Token > Add**, then give both the user
and the token the role **Audit** on `/` (**Configuration > Access Control > Permissions > Add**;
for the user and the token themselves, not a group). `username` is the token id
(`api@pbs!dashboard`), `password` its secret. The server uses a self-signed certificate by
default, so `insecure` is on, as in homepage.

Learn more about [Proxmox Backup Server](https://www.proxmox.com/en/proxmox-backup-server).

## Fields

`datastore_usage`, `failed_tasks_24h`, `cpu_usage`, `memory_usage`

## Example

```yaml
# services.yaml
- Infrastructure:
    - Backups:
        href: https://pbs.lan:8007
        icon: proxmox
        widget:
          type: proxmoxbackupserver
          url: https://pbs.lan:8007
          username: api@pbs!dashboard
          password: "{{DASHBOARD_VAR_PBS_SECRET}}"
          datastore: backup            # optional
```
