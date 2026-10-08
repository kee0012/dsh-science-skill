# 安装辅助：把 dsh-science-skill 注册进一个 DSH profile。
#
# 它只做三件事——检查构建产物、建 ASCII junction、打印接下来要跑的命令——不会擅自改 profile。
# 之所以需要 junction：pnpm 会把 profile 里的 `file:` 依赖硬链接成 install 那一刻的死快照，
# 之后重建的 lib/ 不会进 profile；而源码目录带中文时，cmd.exe 的 GBK 处理会把 `file:` 值
# 弄成乱码（历史上出现过 `link:D:/.../寮€鍙?` 这类错误和「declares no dsh.bundle」的空目录）。
# 所以 profile 里只注册一个纯 ASCII 的 junction 路径。
#
# 用法：
#   pwsh -File scripts/install-profile.ps1
#   pwsh -File scripts/install-profile.ps1 -ProfileName web -Link D:\dsh-plugins\dsh-science-skill -ProfileDir D:\ScienceAgentData\profiles
param(
  [string]$Source = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Link   = '',
  [string]$ProfileName = 'web',
  [string]$ProfileDir  = ''
)

$ErrorActionPreference = 'Stop'

# 缺省值：源码就是本脚本的上一级目录；junction 放 $DSH_HOME\dsh-plugins 下；
# profile 目录取 $DSH_HOME\profiles（都没有时回落到 ~/.dsh）。
$home_ = $env:DSH_HOME
if ([string]::IsNullOrWhiteSpace($home_)) { $home_ = Join-Path $env:USERPROFILE '.dsh' }
if ([string]::IsNullOrWhiteSpace($Link)) { $Link = Join-Path $home_ 'dsh-plugins\dsh-science-skill' }
if ([string]::IsNullOrWhiteSpace($ProfileDir)) { $ProfileDir = Join-Path $home_ 'profiles' }

Write-Host "== dsh-science-skill 安装辅助 ==" -ForegroundColor Cyan
Write-Host "源码目录 : $Source"
Write-Host "junction : $Link"
Write-Host "profile  : $ProfileName ($ProfileDir)"

if (-not (Test-Path $Source)) {
  throw "源码目录不存在：$Source"
}

# 1) 构建产物检查。缺了就给确切命令，不代跑构建。
$missing = @()
if (-not (Test-Path (Join-Path $Source 'lib\index.js'))) { $missing += 'node scripts/build-host.mjs' }
if (-not (Test-Path (Join-Path $Source 'lib\client.js'))) { $missing += 'node node_modules/tsdown/dist/run.mjs' }
if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "还缺构建产物，请先在源码目录依次执行：" -ForegroundColor Yellow
  foreach ($line in $missing) { Write-Host "  $line" }
  throw "构建产物不完整"
}
Write-Host "构建产物 : 已就位（lib/index.js + lib/client.js）" -ForegroundColor Green

# 2) junction（幂等）
if (Test-Path $Link) {
  $item = Get-Item $Link -Force
  Write-Host "junction : 已存在（$($item.LinkType) → $($item.Target)）" -ForegroundColor Green
} else {
  $parent = Split-Path $Link -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
  New-Item -ItemType Junction -Path $Link -Target $Source | Out-Null
  Write-Host "junction : 已创建" -ForegroundColor Green
}

# 3) 打印后续命令（不代替用户改 profile）
$pnp = "$Link" -replace '\\','/'
Write-Host ""
Write-Host "接下来执行（任选一种）：" -ForegroundColor Cyan
Write-Host "  A) 官方 CLI（dsh 已在 PATH 里时）："
Write-Host "     dsh plugin --profile $ProfileName add file:$pnp"
Write-Host "     dsh plugin --profile $ProfileName install"
Write-Host ""
Write-Host "  B) 不走 PATH 的两步（dsh 不在 PATH 时，用仓库里的 CLI）："
Write-Host "     node `"<dsh 仓库>\apps\cli\lib\bin.js`" plugin --profile $ProfileName add file:$pnp"
Write-Host "     node `"<dsh 仓库>\apps\cli\lib\bin.js`" plugin --profile $ProfileName install"
Write-Host ""
Write-Host "装好后重启 dsh web：设置页出现 Skill 分区，侧栏出现技能分类树，" -ForegroundColor Green
Write-Host "技能 API 落在 /api/dsh-science-skill/*。" -ForegroundColor Green
