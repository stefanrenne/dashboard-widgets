# Unraid

CPU, memory, the array and up to four cache pools, through the Unraid API (Unraid 7). Create a key under **Settings › Management Access › API Keys**. Name your pools in `pool1` to `pool4`. Without `fields` the card shows memory %, CPU, array % and pool 1 %. A server that keeps everything in pools (ZFS) shows no array blocks; unread alerts and a stopped array are marked.

Learn more about [Unraid](https://unraid.net).

## Fields

`memoryUsed`, `memoryAvailable`, `memoryPercent`, `cpu`, `notifications`, `status`, `arrayFree`, `arrayUsed`, `arrayUsedPercent`, `pool1Free`, `pool1Used`, `pool1UsedPercent` (and the same for `pool2` to `pool4`)

## Example

```yaml
# services.yaml
- Infrastructure:
    - Unraid:
        href: https://tower.lan
        icon: unraid
        widget:
          type: unraid
          url: https://tower.lan
          key: "{{DASHBOARD_VAR_UNRAID_KEY}}"
          pool1: cache
          fields: [cpu, memoryPercent, arrayUsedPercent, pool1UsedPercent]
```
