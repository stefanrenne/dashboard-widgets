# Button

A button on a card or in the header that opens a link, or runs a script or a shell command on the
dashboard's server, for jobs such as pulling new images, restarting a stack or starting a backup.
Set exactly one of `href`, `script` or `command`; with none or several, the card shows an error.

- `href` opens the page in a new tab.
- `script` runs a file with `bash`. A relative path is relative to the config folder (`/config` in
  the container), which is also the folder the run starts in.
- `command` runs a line with `bash -c`, such as `docker compose -f stacks/media.yaml pull`.

While it runs, the button shows a spinner instead of its label and cannot be pressed. A run that
succeeds (exit code 0) shows a check for a moment, then the label again. A run that fails opens
the dashboard's result dialog with the output (stdout and stderr together, the last 64 kB) and the
exit code; the output can be copied from there. A run that takes longer than `timeout` seconds
(default 300) is stopped, together with everything it started. Values filled in from
`{{DASHBOARD_VAR_*}}` are scrubbed from the output.

The run gets only `PATH` and `HOME` from the dashboard's environment; set `inheritEnv: true` to
pass all of it (including every `DASHBOARD_VAR_*`). It runs as the dashboard's user (`node`, uid 1000, in
the image), so tools such as `curl`, `jq` or `docker` must be in the image and the Docker socket
must allow that user.

### Running as root

`user: root` runs the script as root inside the container, for a script that writes files which
must stay owned by root (a proxy's config, `chown`). It needs
`DASHBOARD_ALLOW_ROOT_SCRIPTS: "true"` in the dashboard container's environment; without it the button
says so. The dashboard itself keeps running as `node`: the image lets it start one fixed runner as
root through sudo, and only when that variable is set. `HOME` is then `/root`; `inheritEnv: true`
passes the dashboard's environment to the root script too. A timeout stops the root script and
what it started. Once the variable is on, any installed widget could run as root in the
container, so set it only on a dashboard you trust. Anyone who can open the dashboard can press the button: put the dashboard
behind authentication before you add buttons that change things. `script` and `command` are kept
on the server; the browser only gets the label.

`script`, `command`, `user` and `inheritEnv` are only taken from services.yaml: a button found
through Docker labels or Kubernetes annotations can open a link, but runs nothing (the dashboard
names the label in its messages). Labels are written by whoever starts a container, or come with
its image.

### Asking for a password

With an admin password on the dashboard (`adminPassword` in its settings.yaml, which its setup
wizard and settings page write), a press can ask for that password first. A button
with `user: root` asks by default; any button asks with `confirm: password` (then that browser
stays unlocked for a while, 15 minutes by default) or `confirm: always` (every press).
`confirm: none` turns it off for a root button. Without an admin password nothing asks,
and the dashboard's messages name the buttons that would. See the dashboard's
[Admin password](https://getdashboard.dev/configuration/#admin-password). With the dashboard's login
page (`login: true`) a login counts: only `confirm: always` asks again.

Several buttons on one card are several `button` widgets, each one full width.

## Fields

No blocks: the button is drawn by the widget.

## Example

```yaml
# services.yaml
- Media:
    - Jellyfin:
        href: https://jellyfin.lan
        widgets:
          - type: button
            text: Pull new images
            command: docker compose -f stacks/media.yaml pull
            timeout: 600
            confirm: password        # with an admin password: ask first
          - type: button
            text: Back up the library
            script: scripts/backup-jellyfin.sh
          - type: button
            text: Release notes
            href: https://github.com/jellyfin/jellyfin/releases
- Proxy:
    - SWAG:
        widget:
          type: button
          text: Generate proxy configs
          command: cd /srv/configs && ./gen-swag.sh
          user: root                 # needs DASHBOARD_ALLOW_ROOT_SCRIPTS: "true" on the dashboard container
```
