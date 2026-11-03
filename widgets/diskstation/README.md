# Synology DiskStation

Uptime, the free space on a volume (marked below 10%), and the CPU and memory in use of a Synology
NAS, as homepage's diskstation widget. `volume` picks a volume when there are several:
`volume_1`, `volume_2`, ... (default the first one DSM lists).

These figures are only open to members of the **Administrators** group. Limit such a user: in
DSM 7, **Control Panel > User & Group > Create**, check **Administrators** under User Groups,
**No Access** on all shared folders under Permissions, and under Applications **Deny** all but
**DSM**. Two-step verification cannot be on for this user. If logins get blocked while you set
it up, uncheck **Control Panel > Security > Protection > Enable auto block** for a moment.

Learn more about [Synology DSM](https://www.synology.com/dsm).

## Fields

`uptime`, `volumeAvailable`, `resources.cpu`, `resources.mem`

## Example

```yaml
# services.yaml
- Storage:
    - DiskStation:
        href: http://nas.lan:5000
        icon: synology
        widget:
          type: diskstation
          url: http://nas.lan:5000
          username: remote_stats
          password: "{{DASHBOARD_VAR_SYNOLOGY_PASSWORD}}"
          volume: volume_1
```
