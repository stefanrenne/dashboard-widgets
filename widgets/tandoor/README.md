# Tandoor

The users, recipes and keywords of your space in Tandoor Recipes, as homepage's tandoor widget.
Create a token under **Settings > API > Generate** with the `read` scope and use it as `key`.

Learn more about [Tandoor Recipes](https://tandoor.dev/).

## Fields

`users`, `recipes`, `keywords`

## Example

```yaml
# services.yaml
- Home:
    - Tandoor:
        href: http://tandoor.lan:8080
        icon: tandoor-recipes
        widget:
          type: tandoor
          url: http://tandoor.lan:8080
          key: "{{DASHBOARD_VAR_TANDOOR_TOKEN}}"
```
