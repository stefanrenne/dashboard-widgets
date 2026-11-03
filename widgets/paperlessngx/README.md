# Paperless-ngx

Documents in the inbox (marked when there are any; only with an inbox tag) and in total, as
homepage's paperlessngx widget.

Use an API token as `key`: your profile (top right) > **My Profile > API Auth Token**. Or give
`username` and `password`.

Learn more about [Paperless-ngx](https://docs.paperless-ngx.com/).

## Fields

`inbox`, `total`

## Example

```yaml
# services.yaml
- Documents:
    - Paperless-ngx:
        href: http://paperless.lan:8000
        icon: paperless-ngx
        widget:
          type: paperlessngx
          url: http://paperless.lan:8000
          key: "{{DASHBOARD_VAR_PAPERLESS_TOKEN}}"
```
