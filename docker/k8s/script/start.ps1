# Kubernetes 服务启动脚本 (PowerShell)
# 使用方法: .\start.ps1
# 
# 如果遇到执行策略错误，运行：
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

$ErrorActionPreference = "Continue"  # 改为 Continue 以便看到所有输出

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  开始部署 AgentEasy Kubernetes 服务" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 kubectl 是否安装
try {
    $null = Get-Command kubectl -ErrorAction Stop
} catch {
    Write-Host "❌ 错误: kubectl 未安装，请先安装 kubectl" -ForegroundColor Red
    exit 1
}

# 检查 Kubernetes 集群是否可用
try {
    $null = kubectl cluster-info 2>&1
} catch {
    Write-Host "❌ 错误: Kubernetes 集群不可用，请确保：" -ForegroundColor Red
    Write-Host "   1. Docker Desktop 的 Kubernetes 已启用" -ForegroundColor Yellow
    Write-Host "   2. 或者已连接到其他 Kubernetes 集群" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ kubectl 和 Kubernetes 集群检查通过" -ForegroundColor Green
Write-Host ""

# 获取脚本所在目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "📦 步骤 1/13: 安装 Local Path Provisioner (存储类)" -ForegroundColor Yellow
kubectl apply -f storage-class-local-path.yaml
Write-Host "   等待存储类就绪..."
Start-Sleep -Seconds 2
kubectl get storageclass local-path 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  存储类可能已存在或需要等待" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "📦 步骤 2/13: 创建 Namespace" -ForegroundColor Yellow
kubectl apply -f namespace.yaml
Write-Host ""

Write-Host "📦 步骤 3/13: 创建 ConfigMap (环境变量配置)" -ForegroundColor Yellow
kubectl apply -f configmap.yaml
Write-Host ""

Write-Host "📦 步骤 4/13: 创建 Secrets (敏感信息)" -ForegroundColor Yellow
kubectl apply -f secrets.yaml
Write-Host ""

Write-Host "📦 步骤 5/13: 创建持久化存储 (PVC)" -ForegroundColor Yellow
kubectl apply -f pvc.yaml
Write-Host "   等待 PVC 创建..."
Start-Sleep -Seconds 3
kubectl get pvc -n lcagentns-app
Write-Host ""

Write-Host "📦 步骤 6/13: 部署数据库 (TiDB)" -ForegroundColor Yellow
kubectl apply -f tidb.yaml
Write-Host ""

Write-Host "📦 步骤 7/13: 部署缓存 (Redis)" -ForegroundColor Yellow
kubectl apply -f redis.yaml
Write-Host ""

Write-Host "⏳ 等待数据库就绪（最多等待 5 分钟）..." -ForegroundColor Yellow
$timeout = 300
$elapsed = 0
$interval = 5
$ready = $false

while ($elapsed -lt $timeout) {
    $result = kubectl wait --for=condition=ready pod -l app=tidb -n lcagentns-app --timeout=5s 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 数据库已就绪" -ForegroundColor Green
        $ready = $true
        break
    }
    Start-Sleep -Seconds $interval
    $elapsed += $interval
    Write-Host "   等待中... ($elapsed/$timeout 秒)" -ForegroundColor Gray
}

if (-not $ready) {
    Write-Host "⚠️  数据库可能还在启动中，继续部署其他服务..." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "📦 步骤 8/13: 部署对象存储 (MinIO)" -ForegroundColor Yellow
kubectl apply -f minio.yaml
Write-Host ""

Write-Host "📦 步骤 9/13: 部署后端服务 (API, Worker, Beat)" -ForegroundColor Yellow
kubectl apply -f backend.yaml
Write-Host ""

Write-Host "📦 步骤 10/13: 部署前端服务" -ForegroundColor Yellow
kubectl apply -f frontend.yaml
Write-Host ""

Write-Host "📦 步骤 11/13: 部署云服务 (AMS, FT)" -ForegroundColor Yellow
kubectl apply -f cloud-service.yaml
Write-Host ""

Write-Host "📦 步骤 12/13: 部署 MCP 服务" -ForegroundColor Yellow
kubectl apply -f mcp-services.yaml
Write-Host ""

Write-Host "📦 步骤 13/13: 部署 Nginx (反向代理)" -ForegroundColor Yellow
kubectl apply -f nginx.yaml
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  部署完成！正在检查服务状态..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 5

Write-Host "📊 Pod 状态:" -ForegroundColor Yellow
kubectl get pods -n lcagentns-app
Write-Host ""

Write-Host "📊 Service 状态:" -ForegroundColor Yellow
kubectl get svc -n lcagentns-app
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  访问信息" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🌐 前端访问地址:" -ForegroundColor Green
try {
    $nodePort = kubectl get svc nginx -n lcagentns-app -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}' 2>&1
    if ($nodePort) {
        Write-Host "   HTTP:  http://localhost:$nodePort" -ForegroundColor White
    } else {
        Write-Host "   HTTP:  http://localhost:30386" -ForegroundColor White
    }
} catch {
    Write-Host "   HTTP:  http://localhost:30384" -ForegroundColor White
}
Write-Host ""

Write-Host "📝 查看日志:" -ForegroundColor Yellow
Write-Host "   kubectl logs -f deployment/api -n lcagentns-app" -ForegroundColor Gray
Write-Host ""

Write-Host "📝 查看所有 Pod:" -ForegroundColor Yellow
Write-Host "   kubectl get pods -n lcagentns-app" -ForegroundColor Gray
Write-Host ""

Write-Host "📝 查看服务详情:" -ForegroundColor Yellow
Write-Host "   kubectl get svc -n lcagentns-app" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host ""

