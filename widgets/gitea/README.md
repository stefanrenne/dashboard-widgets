# Gitea

Unread notifications (marked), open issues and pull requests, and repositories, as homepage's
gitea widget. Works with Forgejo too. Make an access token under **Settings > Applications >
Generate New Token** with read access to **notification**, **repository** and **issue**.

Learn more about [Gitea](https://about.gitea.com/).

## Fields

`notifications`, `issues`, `pulls`, `repositories`

## Example

```yaml
# services.yaml
- Development:
    - Gitea:
        href: http://gitea.lan:3000
        icon: gitea
        widget:
          type: gitea
          url: http://gitea.lan:3000
          key: "{{DASHBOARD_VAR_GITEA_TOKEN}}"
```
