# Neon 数据库一键初始化
# 用法：先在 .env 里写好 DATABASE_URL（Neon 连接串），再运行：
#   powershell -ExecutionPolicy Bypass -File scripts/setup-neon.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "`n=== GEO Commerce · Neon 初始化 ===`n"

# 从 .env 读取 DATABASE_URL
$envFile = Join-Path (Get-Location) ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "错误: 找不到 .env 文件" -ForegroundColor Red
    exit 1
}

$databaseUrl = $null
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*DATABASE_URL\s*=\s*"?(.+?)"?\s*$') {
        $databaseUrl = $matches[1]
    }
}

if (-not $databaseUrl) {
    Write-Host "错误: .env 里没有 DATABASE_URL" -ForegroundColor Red
    exit 1
}

if ($databaseUrl -match "file:" -or $databaseUrl -match "dev\.db") {
    Write-Host "错误: .env 仍是 SQLite，请改成 Neon 的 postgresql:// 连接串" -ForegroundColor Red
    Write-Host "Neon 控制台 → Connect → Pooled connection → 复制整段`n"
    exit 1
}

if ($databaseUrl -notmatch "^postgresql://") {
    Write-Host "错误: DATABASE_URL 必须以 postgresql:// 开头" -ForegroundColor Red
    exit 1
}

$env:DATABASE_URL = $databaseUrl
Write-Host "连接: $($databaseUrl.Substring(0, [Math]::Min(50, $databaseUrl.Length)))...`n"

Write-Host "[1/2] prisma db push ..."
npx prisma db push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n[2/2] seed FanCrafti ..."
npm run db:seed:fancrafti
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 完成 ===" -ForegroundColor Green
Write-Host "请保存上面输出的 API Key，WordPress 插件要用。`n"
