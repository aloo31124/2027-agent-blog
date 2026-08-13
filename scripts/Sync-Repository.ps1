[CmdletBinding()]
param(
    [ValidateSet('Configure', 'PushGitHub', 'SyncGitLab', 'Publish')]
    [string]$Action = 'Configure',

    [string]$GitHubUrl = 'https://github.com/aloo31124/2027-agent-blog.git',

    [string]$GitLabUrl = 'https://gitlab.com/aloo31124/2027-agent-blog.git'
)

$ErrorActionPreference = 'Stop'

# This script lives in <repository>/scripts, so its parent is the repository root.
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $RepositoryRoot

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

function Set-Remote {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Url
    )

    & git remote get-url $Name *> $null
    if ($LASTEXITCODE -eq 0) {
        Invoke-Git remote set-url $Name $Url
    }
    else {
        Invoke-Git remote add $Name $Url
    }
}

function Configure-Remotes {
    Set-Remote -Name 'origin' -Url $GitHubUrl
    Set-Remote -Name 'gitlab' -Url $GitLabUrl
    Invoke-Git config remote.pushDefault origin
}

Configure-Remotes

if ($Action -eq 'Configure') {
    Write-Host 'Configured origin as the GitHub primary and gitlab as its mirror target.'
    exit 0
}

$Branch = (& git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($Branch)) {
    throw 'Cannot push a detached HEAD. Check out a branch first.'
}

if ($Action -eq 'PushGitHub') {
    Invoke-Git push --set-upstream origin $Branch
    exit 0
}

if ($Action -eq 'Publish') {
    # Establish the current branch's GitHub tracking relationship, then make
    # GitHub complete before updating the downstream GitLab mirror.
    Invoke-Git push --set-upstream origin $Branch
    Invoke-Git push origin --all
    Invoke-Git push origin --tags
}

# Mirror all local branches and tags to GitLab after GitHub has been updated.
# --prune keeps branches/tags deleted locally from remaining on the mirror.
Invoke-Git push --prune gitlab 'refs/heads/*:refs/heads/*' 'refs/tags/*:refs/tags/*'
