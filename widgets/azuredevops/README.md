# Azure DevOps

The latest run of a pipeline (its result, failed marked, or its status while it runs) and, for a
repository, the open pull requests: all, yours, and yours that someone approved, as homepage's
azuredevops widget. Give `definitionId` for the pipeline (it is in the pipeline's address),
`repositoryId` and `userEmail` for the pull requests, or both.

Make a personal access token under **User settings > Personal access tokens > New Token** with
**Build: Read** and **Code: Read**.

Learn more about [Azure DevOps](https://azure.microsoft.com/products/devops).

## Fields

`result`, `status`, `totalPrs`, `myPrs`, `approved`

## Example

```yaml
# services.yaml
- Development:
    - Azure DevOps:
        href: https://dev.azure.com/example/homelab
        icon: azure-devops
        widget:
          type: azuredevops
          organization: example
          project: homelab
          definitionId: 12
          branchName: refs/heads/main
          repositoryId: homelab
          userEmail: anna@example.com
          key: "{{DASHBOARD_VAR_AZDO_TOKEN}}"
```
