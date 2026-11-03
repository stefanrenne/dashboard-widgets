# FileFlows

The files waiting, being processed and processed by FileFlows, and the processing time (before
FileFlows 26.10) or the failed files (26.10 and later, marked), as homepage's fileflows widget.
For FileFlows 26.10 and later set `version: 2`, turn on **Settings > General > Fenrus Dashboard
Endpoint** and use the token shown there as `key`.

Learn more about [FileFlows](https://fileflows.com/).

## Fields

`queue`, `processing`, `processed`, `time`, `failed`

## Example

```yaml
# services.yaml
- Media:
    - FileFlows:
        href: http://fileflows.lan:19200
        icon: fileflows
        widget:
          type: fileflows
          url: http://fileflows.lan:19200
          version: 2
          key: "{{DASHBOARD_VAR_FILEFLOWS_TOKEN}}"
```
