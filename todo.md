# To do

Open work, roughly in order of value. Remove an item when it is done (the CHANGELOG records it).
The dashboard keeps its own list: `../dashboard/todo.md`.

## README examples and fixtures


## Tests and CI

- [ ] **Tests of their own for widgets with logic.** 112 widgets are only covered by the checks
  that run every widget (README fields, attributes, label length). Widgets that mark problems,
  convert units or combine several calls deserve a focused test.

## Security review (2026-11-15)

The widgets themselves hold up: `button` runs only what the config says (`script`, `command`,
`user` and `inheritEnv` are `discoverable: false`, root only with the dashboard's opt-in), `ping`
gets validated arguments without a shell, switching TLS checks off is an explicit option, and the
widgets that take `params` from the page (calendar, openmeteo, openweathermap) only use rounded
numbers. `npm audit` is clean. What needs work is the release, because every installation
follows it on its own (see the dashboard's todo.md, Security review):

- [ ] **MEDIUM: a release tag here is code on every installation within the hour.** The dashboard
  installs the newest `v*` tag of this repository by itself (`#latest`, checked hourly), with its
  rights and the Docker socket. Protect the release: a ruleset that lets only the owner create,
  move or delete `v*` tags and push to `main`; sign the release tags (SSH or GPG, the key in the
  dashboard image so its installer can verify them); keep 2FA and short-lived, narrow tokens on the
  account (`PAGES_DISPATCH_TOKEN` has Actions only on dashboard-site: keep it that way).
- [ ] **LOW: a test that guards `discoverable: false`.** Container labels are written by whoever
  starts a container. Add a check in `tests/widgets.test.mjs`: an option that runs something, reads
  a file, or picks a user (names like `script`, `command`, `file`, `path`, `user`, or an option
  whose description says it runs or reads) is `discoverable: false`, so a new widget cannot forget
  it.
