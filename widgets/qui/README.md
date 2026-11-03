# qui

The torrents downloading and seeding (active of all) with the download and upload rates across
all qBittorrent instances that qui manages, or with `instance` one of them, as homepage's qui
widget. `fields` also offers the total, the errored torrents (marked) and, for one instance, the
share ratio and free disk space. Create a key under **Settings > API Keys** and use it as `key`;
an instance's ID is shown in qui.

Learn more about [qui](https://github.com/autobrr/qui).

## Fields

`leech`, `download`, `seed`, `upload`, `total`, `errored`, `ratio`, `freeSpace`

## Example

```yaml
# services.yaml
- Downloads:
    - qui:
        href: http://qui.lan:7476
        icon: qui
        widget:
          type: qui
          url: http://qui.lan:7476
          key: "{{DASHBOARD_VAR_QUI_KEY}}"
```
