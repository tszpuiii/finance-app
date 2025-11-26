# MongoDB 快速啟動腳本

Write-Host "正在檢查 MongoDB..." -ForegroundColor Cyan

# 檢查 Docker 是否可用
$dockerAvailable = $false
try {
    docker --version | Out-Null
    $dockerAvailable = $true
} catch {
    $dockerAvailable = $false
}

if ($dockerAvailable) {
    Write-Host "✓ 檢測到 Docker" -ForegroundColor Green
    
    # 檢查 MongoDB 容器是否已存在
    $containerExists = docker ps -a --filter "name=mongodb" --format "{{.Names}}" | Select-String -Pattern "mongodb"
    
    if ($containerExists) {
        Write-Host "MongoDB 容器已存在，正在啟動..." -ForegroundColor Yellow
        docker start mongodb
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ MongoDB 已啟動 (Docker)" -ForegroundColor Green
            Write-Host "  連接字串: mongodb://localhost:27017/finance-app" -ForegroundColor Gray
        } else {
            Write-Host "✗ 啟動失敗" -ForegroundColor Red
        }
    } else {
        Write-Host "正在創建並啟動 MongoDB 容器..." -ForegroundColor Yellow
        docker run -d -p 27017:27017 --name mongodb mongo
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ MongoDB 已啟動 (Docker)" -ForegroundColor Green
            Write-Host "  連接字串: mongodb://localhost:27017/finance-app" -ForegroundColor Gray
        } else {
            Write-Host "✗ 啟動失敗" -ForegroundColor Red
        }
    }
} else {
    Write-Host "未檢測到 Docker" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "請選擇以下方式之一安裝 MongoDB:" -ForegroundColor Cyan
    Write-Host "1. 安裝 Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host "2. 安裝 MongoDB Community Server: https://www.mongodb.com/try/download/community" -ForegroundColor White
    Write-Host "3. 使用 Chocolatey: choco install mongodb" -ForegroundColor White
    Write-Host ""
    Write-Host "詳細說明請見: server/MONGODB_SETUP.md" -ForegroundColor Gray
    
    # 檢查 Windows 服務
    $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    if ($mongoService) {
        Write-Host ""
        Write-Host "檢測到 MongoDB Windows 服務" -ForegroundColor Yellow
        if ($mongoService.Status -eq 'Running') {
            Write-Host "✓ MongoDB 服務正在運行" -ForegroundColor Green
        } else {
            Write-Host "正在啟動 MongoDB 服務..." -ForegroundColor Yellow
            Start-Service MongoDB
            Write-Host "✓ MongoDB 服務已啟動" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "現在可以啟動後端服務器: npm run dev" -ForegroundColor Cyan

