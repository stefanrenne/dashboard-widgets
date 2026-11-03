# Synology Download Station

Downloads that are still running (leech) and done (seed), with the total download and upload
rate, as homepage's downloadstation widget. `username` and `password` are a DSM user allowed to
use Download Station, without two-step verification.

Learn more about [Download Station](https://www.synology.com/dsm/packages/DownloadStation).

## Fields

`leech`, `download`, `seed`, `upload`

## Example

```yaml
# services.yaml
- Downloads:
    - Download Station:
        href: http://nas.lan:5000
        icon: synology-download-station
        widget:
          type: downloadstation
          url: http://nas.lan:5000
          username: downloads
          password: "{{DASHBOARD_VAR_SYNOLOGY_PASSWORD}}"
```
