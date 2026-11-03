# OpenMediaVault

One of three views of OpenMediaVault, chosen with `method`, as homepage's openmediavault widget:

- `services.getStatus`: services running, stopped (marked) and in total.
- `smart.getListBg`: disks whose S.M.A.R.T. check passed and failed (marked); only disks with
  monitoring on count.
- `downloader.getDownloadList`: downloads of the Downloader plugin in progress and in total.

`username` and `password` are a web interface login (the `admin` user, or a user in the
`openmediavault-admin` group).

Learn more about [OpenMediaVault](https://www.openmediavault.org/).

## Fields

`running`, `stopped`, `total`, `passed`, `failed`, `downloading`

## Example

```yaml
# services.yaml
- Storage:
    - OpenMediaVault:
        href: http://omv.lan
        icon: openmediavault
        widget:
          type: openmediavault
          url: http://omv.lan
          username: admin
          password: "{{DASHBOARD_VAR_OMV_PASSWORD}}"
          method: services.getStatus
```
