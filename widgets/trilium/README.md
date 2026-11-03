# Trilium

The version of Trilium Notes, its notes and the size of its database, as homepage's trilium
widget. Needs TriliumNext 0.94 or later. Create a token under **Options > ETAPI > Create new
ETAPI token** and use it as `key`.

Learn more about [Trilium Notes](https://github.com/TriliumNext/Trilium).

## Fields

`version`, `notesCount`, `dbSize`

## Example

```yaml
# services.yaml
- Notes:
    - Trilium:
        href: https://trilium.lan
        icon: trilium
        widget:
          type: trilium
          url: https://trilium.lan
          key: "{{DASHBOARD_VAR_TRILIUM_TOKEN}}"
```
