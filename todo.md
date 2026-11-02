# To do

Open work, roughly in order of value. Remove an item when it is done (the CHANGELOG records it).
The dashboard keeps its own list: `../homelab-dashboard/todo.md`.

## README examples and fixtures


## Filter attributes

- [ ] **Raw values behind formatted blocks.** 142 blocks in 68 widgets show text formatted for the
  card ("1.2 TB", "2d 4h", "3 MB/s"), so they are no filter attribute. Return the raw number from
  `fetch` in `attributes` where it is worth filtering on: transfer rates (qbittorrent, deluge,
  transmission, flood, sabnzbd, downloadstation), free space (diskstation, filebrowser, unraid),
  uptimes, time since the last backup (duplicati, backrest, kopia).
- [ ] **Better attribute descriptions.** Most are the block's label ("Wanted", "Queued"). Say what
  the value is and its unit ("movies wanted and not downloaded").

## Tests and CI

- [ ] **Tests of their own for widgets with logic.** 112 widgets are only covered by the checks
  that run every widget (README fields, attributes, label length). Widgets that mark problems,
  convert units or combine several calls deserve a focused test.
