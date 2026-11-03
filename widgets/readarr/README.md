# Readarr

Wanted (missing) books, the books in the download queue (marked when the queue has
errors or warnings) and the number of books you have a file for, as homepage's readarr widget.

The API key is under **Settings > General > Security > API Key**.

Learn more about [Readarr](https://github.com/Readarr/Readarr).

## Fields

`wanted`, `queued`, `books`

## Example

```yaml
# services.yaml
- Media:
    - Readarr:
        href: http://readarr.lan:8787
        icon: readarr
        widget:
          type: readarr
          url: http://readarr.lan:8787
          key: "{{DASHBOARD_VAR_READARR_KEY}}"
```
