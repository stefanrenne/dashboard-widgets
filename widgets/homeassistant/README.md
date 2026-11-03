# Home Assistant

People at home, lights that are on and switches that are on (each as "on / all"), as homepage's
homeassistant widget. With `custom`, up to four entries of your own instead, in homepage's form:

- `state: <entity_id>` shows that entity. `label` defaults to `{attributes.friendly_name}`, `value`
  to `{state} {attributes.unit_of_measurement}`; both may name other attributes in braces.
- `template: <Jinja template>` shows what Home Assistant renders, with your `label`.

Make a long-lived access token in Home Assistant: your profile (bottom left) > **Security** >
**Long-lived access tokens > Create token**. The token can read everything its user can.

Learn more about [Home Assistant](https://www.home-assistant.io/).

## Fields

`people_home`, `lights_on`, `switches_on`; with `custom`: `custom1` to `custom4`

## Example

```yaml
# services.yaml
- Home:
    - Home Assistant:
        href: http://homeassistant.lan:8123
        icon: home-assistant
        widget:
          type: homeassistant
          url: http://homeassistant.lan:8123
          key: "{{DASHBOARD_VAR_HASS_TOKEN}}"
          custom:                      # optional: instead of people, lights and switches
            - state: sensor.total_power
            - state: sensor.energy_today
              label: Energy today
            - template: "{{ states.switch | selectattr('state', 'eq', 'on') | list | count }}"
              label: Switches on
            - state: weather.home
              label: Wind
              value: "{attributes.wind_speed} {attributes.wind_speed_unit}"
```
