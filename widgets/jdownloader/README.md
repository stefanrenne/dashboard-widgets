# JDownloader

The packages in JDownloader's download list, their total size, what is left to download and the
download rate, as homepage's jdownloader widget. Like homepage it goes through
[My.JDownloader](https://my.jdownloader.org/): connect JDownloader to your account under
**Settings > My.JDownloader**, then fill in the account's e-mail address and password and the
device name shown there as `client`. JDownloader needs no open port for this.

Learn more about [JDownloader](https://jdownloader.org/).

## Fields

`downloadCount`, `downloadTotalBytes`, `downloadBytesRemaining`, `downloadSpeed`

## Example

```yaml
# services.yaml
- Downloads:
    - JDownloader:
        href: https://my.jdownloader.org/
        icon: jdownloader
        widget:
          type: jdownloader
          username: anna@example.com
          password: "{{DASHBOARD_VAR_MYJD_PASSWORD}}"
          client: JDownloader@nas
```
