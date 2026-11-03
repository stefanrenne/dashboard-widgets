# Mailcow

The domains, mailboxes, messages and storage used in Mailcow, as homepage's mailcow widget.
Turn on an API key under **System > Configuration > Access > API** (read-only is enough), add
the dashboard's IP address to the key's allowed IPs, and use the key as `key`.

Learn more about [Mailcow](https://mailcow.email/).

## Fields

`domains`, `mailboxes`, `mails`, `storage`

## Example

```yaml
# services.yaml
- Mail:
    - Mailcow:
        href: https://mail.lan
        icon: mailcow
        widget:
          type: mailcow
          url: https://mail.lan
          key: "{{DASHBOARD_VAR_MAILCOW_KEY}}"
```
