# To do

Open work, roughly in order of value. Remove an item when it is done (the CHANGELOG records it).
The dashboard keeps its own list: `../homelab-dashboard/todo.md`.

## README examples and fixtures

- [ ] **README examples that do not run on their fixture.** The example of arcane, azuredevops,
  calendar, cloudflared, coinmarketcap, glances, homeassistant, jackett, longhorn, medusa,
  nextdns, proxmoxvm, tailscale, truenas and uptimerobot uses ids, options or an API version the
  fixture does not answer (arcane's `env`, tailscale's device id, glances `version: 4` with
  `cputemp`, jackett's password login, truenas `version: 2`, ...). The dashboard's docs images
  fall back to the test options for them. Align the examples or the fixtures, then add a test
  that runs every README example on its fixture (with `scripts/fakes.mjs`), so every example on
  the docs site is known to work.

## Filter attributes

- [ ] **Raw values behind formatted blocks.** 142 blocks in 68 widgets show text formatted for the
  card ("1.2 TB", "2d 4h", "3 MB/s"), so they are no filter attribute. Return the raw number from
  `fetch` in `attributes` where it is worth filtering on: transfer rates (qbittorrent, deluge,
  transmission, flood, sabnzbd, downloadstation), free space (diskstation, filebrowser, unraid),
  uptimes, time since the last backup (duplicati, backrest, kopia).
- [ ] **Better attribute descriptions.** Most are the block's label ("Wanted", "Queued"). Say what
  the value is and its unit ("movies wanted and not downloaded").
- [ ] **Widgets without attributes that could have some**: homeassistant (its custom states),
  proxmoxvm (CPU and memory), calendar (events today), feed (new items).

## Tests and CI

- [ ] **Tests of their own for widgets with logic.** 112 widgets are only covered by the checks
  that run every widget (README fields, attributes, label length). Widgets that mark problems,
  convert units or combine several calls deserve a focused test.
