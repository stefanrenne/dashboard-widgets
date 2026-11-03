# Mealie

The recipes, users, categories and tags in Mealie, as homepage's mealie widget. Create a token
under **Profile > Manage Your API Tokens > Generate** and use it as `key`. For Mealie 2 and later
set `version: 2`.

Learn more about [Mealie](https://mealie.io/).

## Fields

`recipes`, `users`, `categories`, `tags`

## Example

```yaml
# services.yaml
- Home:
    - Mealie:
        href: http://mealie.lan:9000
        icon: mealie
        widget:
          type: mealie
          url: http://mealie.lan:9000
          key: "{{DASHBOARD_VAR_MEALIE_TOKEN}}"
          version: 2
```
