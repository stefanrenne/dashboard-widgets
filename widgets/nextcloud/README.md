# Nextcloud

Free disk space, users active in the last 24 hours, the number of files and the number of shares,
as homepage's nextcloud widget. homepage's older `cpuload` (the load average) and `memoryusage`
are there too: pick them with `fields`.

Use the token from **Administration settings > System** (at the bottom, "Monitoring endpoint
with token") as `key`, or an admin's `username` with an app password from **Personal settings >
Security**. The serverinfo app must be enabled (it is by default).

Learn more about [Nextcloud](https://nextcloud.com/).

## Fields

`freespace`, `activeusers`, `numfiles`, `numshares`, `cpuload`, `memoryusage`

## Example

```yaml
# services.yaml
- Cloud:
    - Nextcloud:
        href: https://cloud.example.com
        icon: nextcloud
        widget:
          type: nextcloud
          url: https://cloud.example.com
          key: "{{DASHBOARD_VAR_NEXTCLOUD_TOKEN}}"
```
