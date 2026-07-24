# Repository remote workflow

GitHub is the primary remote (`origin`). GitLab is a downstream mirror (`gitlab`).
Do all normal development and pull-request work against GitHub; do not treat GitLab
as an independent source of changes.

Use the PowerShell wrapper from any directory:

```powershell
# Add or correct both remotes without pushing.
pwsh -File ./scripts/Sync-Repository.ps1 -Action Configure

# Push the current branch to the GitHub primary and set its upstream.
pwsh -File ./scripts/Sync-Repository.ps1 -Action PushGitHub

# Publish local branches and tags to GitHub, then synchronize the GitLab mirror.
pwsh -File ./scripts/Sync-Repository.ps1 -Action Publish

# After GitHub has the intended changes, mirror every local branch and tag to GitLab.
pwsh -File ./scripts/Sync-Repository.ps1 -Action SyncGitLab
```

The script uses HTTPS URLs by default. Authenticate GitHub and GitLab through the
Git credential manager (or provide authenticated URLs through `-GitHubUrl` and
`-GitLabUrl`) before pushing. `SyncGitLab` uses `--prune`; only run it when local
branches and tags represent the desired GitLab mirror state.
