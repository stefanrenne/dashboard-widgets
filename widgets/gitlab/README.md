# GitLab

The groups, issues, merge requests and projects of a GitLab user, as homepage's gitlab widget.
Create a personal access token with the `read_api` scope under **Edit profile > Access tokens**
and use it as `key`. `user_id` is the number shown as **User ID** on your profile page.

Learn more about [GitLab](https://about.gitlab.com/).

## Fields

`groups`, `issues`, `merges`, `projects`

## Example

```yaml
# services.yaml
- Code:
    - GitLab:
        href: https://gitlab.lan
        icon: gitlab
        widget:
          type: gitlab
          url: https://gitlab.lan
          key: "{{DASHBOARD_VAR_GITLAB_TOKEN}}"
          user_id: 42
```
