# Widget catalogue

Widget packages outside the [widgets collection](https://github.com/stefanrenne/dashboard-widgets):
written and published by others, installed through `plugins:` in
[settings.yaml](https://getdashboard.dev/configuration/settings.html#plugins). They run on your server with the
dashboard's rights: read [Security](https://getdashboard.dev/extend/security.html) and look at the source before you add one.

| Package | Widgets | What it shows | `plugins:` |
|---|---|---|---|
| [dashboard-widget-example](https://github.com/stefanrenne/dashboard-widget-example) | `example-counter` | A number from a JSON API, with its change since the last refresh. The starting point for a widget of your own. | `source: git+https://github.com/stefanrenne/dashboard-widget-example#latest` |

```yaml
# settings.yaml
plugins:
  - source: git+https://github.com/stefanrenne/dashboard-widget-example#latest
```

Wrote one yourself? See [Remote widget › Get listed](https://getdashboard.dev/extend/custom-widget/remote.html#4-get-listed).
