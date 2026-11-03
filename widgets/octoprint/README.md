# OctoPrint

A 3D printer's state in OctoPrint (an error marked), the tool and bed temperatures, and while
printing the job's progress, as homepage's octoprint widget. Create a key under **Settings >
Application Keys** (or use the global API key under **Settings > API**) and use it as `key`.

Learn more about [OctoPrint](https://octoprint.org/).

## Fields

`printer_state`, `temp_tool`, `temp_bed`, `job_completion`

## Example

```yaml
# services.yaml
- 3D printing:
    - OctoPrint:
        href: http://octopi.lan
        icon: octoprint
        widget:
          type: octoprint
          url: http://octopi.lan
          key: "{{DASHBOARD_VAR_OCTOPRINT_KEY}}"
```
