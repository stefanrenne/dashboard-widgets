# To do

Open work, roughly in order of value. Remove an item when it is done (the CHANGELOG records it).
The dashboard keeps its own list: `../homelab-dashboard/todo.md`.

## README examples and fixtures


## Filter attributes

- [ ] **Raw values behind formatted blocks, the rest.** Transfer rates, free space (diskstation,
  filebrowser, unraid) and the time since a backup (duplicati, kopia) are done. Still formatted
  only: uptimes (glances, diskstation, truenas, ...), backrest's bytes added, and the other
  blocks with "1.2 TB" or "2d 4h" text in about 55 widgets.
- [ ] **Better attribute descriptions.** Most are the block's label ("Wanted", "Queued"). Say what
  the value is and its unit ("movies wanted and not downloaded").

## Tests and CI

- [ ] **Tests of their own for widgets with logic.** 112 widgets are only covered by the checks
  that run every widget (README fields, attributes, label length). Widgets that mark problems,
  convert units or combine several calls deserve a focused test.
