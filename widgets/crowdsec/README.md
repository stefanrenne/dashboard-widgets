# CrowdSec

The alerts your own CrowdSec engine raised in the last 24 hours (marked; the community blocklist
left out) and the active bans, as homepage's crowdsec widget. Log in as a machine: register one
with `cscli machines add dashboard --password <password>`, or use the credentials in
`/etc/crowdsec/local_api_credentials.yaml` (`login` and `password`).

Learn more about [CrowdSec](https://www.crowdsec.net/).

## Fields

`alerts`, `bans`

## Example

```yaml
# services.yaml
- Security:
    - CrowdSec:
        icon: crowdsec
        widget:
          type: crowdsec
          url: http://crowdsec.lan:8080
          username: dashboard
          password: "{{DASHBOARD_VAR_CROWDSEC_PASSWORD}}"
```
