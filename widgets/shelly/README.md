# Shelly

A Shelly device's firmware version and, when a newer one is available, that version in a block
marked as needing attention, with an **Update firmware** button under the blocks that starts it.
An up-to-date device shows only its version. While
the device updates, the button says the update started; it goes away once the device reports the
new version. Works with Gen2, Gen3 and Gen4 devices (the RPC API) and with Gen1 devices.

Set `password` only when the device has authentication on (Settings > Authentication on Gen2
and newer, Internet & Security > Restrict login on Gen1): Gen2 and newer log in as `admin` with
digest authentication, Gen1 with the `username` and password set there. When the device refuses
the password, or asks for one while none is set, the card says so. Fill the password in through
`{{DASHBOARD_VAR_...}}`, not `{{...}}` alone: an unknown placeholder stays literal and is refused. The widget asks the
device to look for new firmware at most once an hour (it also looks by itself); with `beta: true`
a beta version is offered when there is no newer stable one.

Anyone who can open the dashboard can press the button: put the dashboard behind authentication
before you add it. The device restarts at the end of the update, so the card shows an error for a
moment.

Learn more about [Shelly](https://shelly-api-docs.shelly.cloud/).

## Fields

`firmware`, `update` (only when an update is available or being installed)

## Example

```yaml
# services.yaml
- Home:
    - Garage plug:
        href: http://shelly-garage.lan
        icon: shelly
        widget:
          type: shelly
          url: http://shelly-garage.lan
          password: "{{DASHBOARD_VAR_SHELLY_PASSWORD}}"
    - Bureau plug:                       # only shown while a firmware update waits
        href: http://shelly-bureau.lan
        filter: widget.update == false
        widget:
          type: shelly
          url: http://shelly-bureau.lan
          password: "{{DASHBOARD_VAR_SHELLY_PASSWORD}}"
```
