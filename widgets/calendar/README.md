# Calendar

A month with a coloured dot per event and the chosen day's events below it, or with
`view: agenda` a list of the coming events, as homepage's calendar widget. Events come from
**integrations**: Sonarr (episodes), Radarr (cinema, physical and digital releases), Lidarr
(albums) and Readarr (books), and any iCal feed (Google Calendar, Nextcloud, ...). Use the
arrows to page through months; done items (a file is there) are dimmed, and items link to
`baseUrl` when it is set.

An integration of an *arr points to a service on the dashboard with `service_group` and
`service_name`, as in homepage: the dashboard fills in that widget's `url` and `key` on the
server. Or give `url` and `key` yourself. `params: { unmonitored: true }` also shows unmonitored
items. An iCal integration takes the feed's `url` and a `name` (`params: { showName: true }` puts
it before each title); for Google Calendar use **Settings > your calendar > Integrate calendar >
Secret address in iCal format**. Repeating events are expanded (daily, weekly with days,
monthly, yearly; with `INTERVAL`, `COUNT`, `UNTIL` and `EXDATE`).

`timezone` sets the zone the days are counted in (default the viewer's). `showTime: true` shows
the time of today's events.

Learn more about [iCalendar](https://icalendar.org/).

## Fields

No blocks: the calendar is drawn by the widget.

## Example

```yaml
# services.yaml
- Home:
    - Calendar:
        widget:
          type: calendar
          view: monthly                # or agenda
          firstDayInWeek: monday
          maxEvents: 10
          showTime: true
          integrations:
            - type: sonarr
              service_group: Media     # the Sonarr service on this dashboard
              service_name: Sonarr
              color: teal
              baseUrl: https://sonarr.lan
            - type: radarr
              service_group: Media
              service_name: Radarr
            - type: ical
              url: "{{DASHBOARD_VAR_FAMILY_CALENDAR_URL}}"
              name: Family
              color: zinc
              params:
                showName: true
```
