# Stash

Counts from your Stash library. Without `fields` it shows scenes, performers and tags. The API key is under **Settings › Security › Authentication**; leave `key` out when Stash has no login.

Learn more about [Stash](https://stashapp.cc).

## Fields

`scenes`, `images`, `galleries`, `performers`, `studios`, `tags`

## Example

```yaml
# services.yaml
- Media:
    - Stash:
        href: https://stash.lan
        icon: stash
        widget:
          type: stash
          url: http://stash:9999
          key: "{{DASHBOARD_VAR_STASH_KEY}}"
          fields: [scenes, studios, performers]
```
