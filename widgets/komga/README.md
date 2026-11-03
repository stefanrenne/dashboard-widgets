# Komga

The libraries (that are available), series and books in Komga, as homepage's komga widget. Log in
with a Komga user (`username` and `password`, as on the web) or an API key (`key`, from **Account
settings > API Keys**). Set `version: 2` when your Komga answers the newer search
(`POST /api/v1/series/list`), as homepage does for Komga's v2 API.

Learn more about [Komga](https://komga.org/).

## Fields

`libraries`, `series`, `books`

## Example

```yaml
# services.yaml
- Reading:
    - Komga:
        href: http://komga.lan:25600
        icon: komga
        widget:
          type: komga
          url: http://komga.lan:25600
          username: anna@example.com
          password: "{{DASHBOARD_VAR_KOMGA_PASSWORD}}"
```
