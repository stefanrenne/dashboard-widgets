# File Browser

The free, used and total space of File Browser's disk, as homepage's filebrowser widget. Less
than 10% free is marked. The widget logs in with a File Browser user; with
[proxy header authentication](https://filebrowser.org/configuration/authentication-method#proxy-header)
set `authHeader` to the header your proxy sends, and the user name in `username`.

Learn more about [File Browser](https://filebrowser.org).

## Fields

`available`, `used`, `total`

## Example

```yaml
# services.yaml
- Files:
    - File Browser:
        href: http://files.lan:8080
        icon: filebrowser
        widget:
          type: filebrowser
          url: http://files.lan:8080
          username: dashboard
          password: "{{DASHBOARD_VAR_FILEBROWSER_PASSWORD}}"
```
