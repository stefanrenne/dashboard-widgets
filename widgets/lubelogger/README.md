# LubeLogger

Your vehicles, their service records and reminders in LubeLogger, or with `vehicleID` one vehicle
with the due date of its next reminder, as homepage's lubelogger widget. Urgent reminders are
marked, very urgent and past-due ones as an error. Needs LubeLogger 1.3.7 or later; fill in a
user when LubeLogger's authentication is on. The vehicle's ID is the number in its address
(`/Vehicle/Index?vehicleId=1`).

Learn more about [LubeLogger](https://lubelogger.com/).

## Fields

`vehicles`, `vehicle`, `serviceRecords`, `reminders`, `nextReminder`

## Example

```yaml
# services.yaml
- Home:
    - LubeLogger:
        href: https://lubelogger.lan
        icon: lubelogger
        widget:
          type: lubelogger
          url: https://lubelogger.lan
          username: anna
          password: "{{DASHBOARD_VAR_LUBELOGGER_PASSWORD}}"
          vehicleID: 1
```
