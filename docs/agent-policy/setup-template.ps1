#Requires -Version 5.1
<#
.SYNOPSIS
  Create a private GitHub template repository that contains the canonical AGENTS.md.
.DESCRIPTION
  Run once after PR #33 has been merged into joshu-a-site/main.
  Requires Git, GitHub CLI (gh), and a logged-in owner account.
  This script does not enable automation for GitHub's ordinary "New repository" form.
#>
$ErrorActionPreference = 'Stop'
$owner = 'yoshiakiUmezu'
$template = 'joshu-a-repo-template'
$fullName = "$owner/$template"

foreach ($name in @('git', 'gh')) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "$name is required."
    }
}
& gh auth status
if ($LASTEXITCODE -ne 0) {
    throw 'Sign in first with: gh auth login'
}

$sourcePath = "repos/$owner/joshu-a-site/contents/docs/agent-policy/COMMON_RULES.md?ref=main"
$encoded = (& gh api $sourcePath --jq '.content') -join ''
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($encoded)) {
    throw 'Canonical rules on main are unavailable. Merge the source PR first.'
}
$base64 = $encoded -replace '\s', ''
$rules = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($base64))
if (-not $rules.Contains('<!-- BEGIN JOSHU_A_COMMON_AGENT_RULES -->') -or
    -not $rules.Contains('<!-- END JOSHU_A_COMMON_AGENT_RULES -->')) {
    throw 'Canonical shared rules have invalid markers.'
}

$workspace = Join-Path ([System.IO.Path]::GetTempPath()) ('joshu-a-template-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workspace | Out-Null
$agents = '# AGENTS.md' + [Environment]::NewLine + [Environment]::NewLine +
    $rules.TrimEnd() + [Environment]::NewLine
[System.IO.File]::WriteAllText(
    (Join-Path $workspace 'AGENTS.md'),
    $agents,
    (New-Object System.Text.UTF8Encoding($false))
)

& git -C $workspace init -b main
if ($LASTEXITCODE -ne 0) { throw 'git init failed.' }
& git -C $workspace add AGENTS.md
if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }
& git -C $workspace commit -m 'chore: initialize with common AGENTS.md'
if ($LASTEXITCODE -ne 0) { throw 'git commit failed. Check git user.name/user.email.' }

# Default to private. Fail rather than overwriting an existing repository.
& gh repo create $fullName --private --source $workspace --remote origin --push
if ($LASTEXITCODE -ne 0) {
    throw "Repository creation/push failed. Check whether $fullName already exists."
}
& gh repo edit $fullName --template
if ($LASTEXITCODE -ne 0) {
    throw "Repository created, but template setting failed. Enable 'Template repository' in Settings."
}
$isTemplate = (& gh api "repos/$fullName" --jq '.is_template') -join ''
if ($LASTEXITCODE -ne 0 -or $isTemplate.Trim() -ne 'true') {
    throw "Template state could not be verified. Check $fullName in GitHub Settings."
}

Write-Output "Template ready: https://github.com/$fullName/generate"
Remove-Item -LiteralPath $workspace -Recurse -Force
