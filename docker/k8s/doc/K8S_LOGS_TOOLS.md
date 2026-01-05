# Kubernetes 日志查看工具推荐

Docker Desktop 的 Kubernetes 页面功能有限，推荐以下工具来查看 Pod 日志和管理 Kubernetes 集群。

## 1. k9s（推荐 - 终端 UI）

**k9s** 是一个功能强大的终端 UI 工具，可以实时查看 Pod、日志、事件等。

### 安装

#### Windows (使用 Chocolatey)
```powershell
choco install k9s
```

#### Windows (使用 Scoop)
```powershell
scoop install k9s
```

#### Windows (手动安装)
1. 从 [GitHub Releases](https://github.com/derailed/k9s/releases) 下载 `k9s_Windows_x86_64.tar.gz`
2. 解压并将 `k9s.exe` 添加到 PATH

#### macOS
```bash
brew install k9s
```

#### Linux
```bash
# 使用 snap
snap install k9s

# 或下载二进制文件
wget https://github.com/derailed/k9s/releases/download/v0.28.2/k9s_Linux_x86_64.tar.gz
tar -xzf k9s_Linux_x86_64.tar.gz
sudo mv k9s /usr/local/bin/
```

### 使用方法

```bash
# 启动 k9s（会自动连接到当前 kubectl 上下文）
k9s

# 指定 namespace
k9s -n lcagentns-app
```

### k9s 快捷键

- `:pod` - 查看 Pods
- `:svc` - 查看 Services
- `:deploy` - 查看 Deployments
- `:logs` - 查看日志
- `:describe` - 描述资源
- `:exec` - 进入容器
- `d` - 删除资源
- `e` - 编辑资源
- `l` - 查看日志（在 Pod 列表时）
- `s` - 进入 Shell（在 Pod 列表时）
- `/` - 搜索
- `q` - 退出

### 查看日志示例

1. 启动 k9s：`k9s -n lcagentns-app`
2. 按 `:pod` 或直接看到 Pod 列表
3. 选择 Pod，按 `l` 查看日志
4. 按 `f` 可以跟随日志（类似 `tail -f`）

---

## 2. Lens（推荐 - GUI 桌面应用）

**Lens** 是一个功能完整的 Kubernetes IDE，提供图形界面。

### 安装

#### Windows/macOS/Linux
从官网下载：https://k8slens.dev/

或使用包管理器：

#### Windows (Chocolatey)
```powershell
choco install lens
```

#### macOS
```bash
brew install --cask lens
```

### 使用方法

1. 启动 Lens
2. 点击 "Add Cluster" 或自动检测现有集群
3. 选择集群后，可以：
   - 查看所有资源（Pods, Services, Deployments 等）
   - 点击 Pod 查看详情
   - 在 Pod 详情页面查看日志
   - 进入容器 Shell
   - 查看事件和指标

### Lens 功能

- ✅ 图形化界面，易于使用
- ✅ 实时日志查看
- ✅ 资源管理（创建、编辑、删除）
- ✅ 多集群管理
- ✅ 内置终端
- ✅ 资源监控和指标

---

## 3. kubectl logs（命令行基础工具）

虽然功能简单，但 `kubectl logs` 是最基础且可靠的日志查看工具。

### 常用命令

```bash
# 查看 Pod 日志
kubectl logs <pod-name> -n lcagentns-app

# 查看 Deployment 日志（会自动选择 Pod）
kubectl logs deployment/api -n lcagentns-app

# 实时跟随日志（类似 tail -f）
kubectl logs -f <pod-name> -n lcagentns-app

# 查看最近 100 行日志
kubectl logs --tail=100 <pod-name> -n lcagentns-app

# 查看指定时间范围的日志
kubectl logs --since=1h <pod-name> -n lcagentns-app

# 查看多个 Pod 的日志（使用标签选择器）
kubectl logs -l app=api -n lcagentns-app

# 查看容器日志（Pod 中有多个容器时）
kubectl logs <pod-name> -c <container-name> -n lcagentns-app

# 查看之前容器的日志（容器重启后）
kubectl logs <pod-name> --previous -n lcagentns-app
```

### 实用脚本

创建 `view-logs.ps1`（Windows）或 `view-logs.sh`（Linux/Mac）：

```powershell
# view-logs.ps1
param(
    [string]$PodName = "",
    [string]$Namespace = "lcagentns-app",
    [switch]$Follow = $false
)

if ($PodName -eq "") {
    Write-Host "可用的 Pods:" -ForegroundColor Yellow
    kubectl get pods -n $Namespace
    $PodName = Read-Host "请输入 Pod 名称"
}

$cmd = "kubectl logs $PodName -n $Namespace"
if ($Follow) {
    $cmd += " -f"
}

Invoke-Expression $cmd
```

使用：
```powershell
.\view-logs.ps1 -PodName api-xxx -Follow
```

---

## 4. Stern（多 Pod 日志聚合）

**Stern** 可以同时查看多个 Pod 的日志，非常适合查看 Deployment 或 StatefulSet 的所有副本日志。

### 安装

#### Windows (Scoop)
```powershell
scoop install stern
```

#### macOS
```bash
brew install stern
```

#### Linux
```bash
# 下载二进制
wget https://github.com/stern/stern/releases/download/v1.28.0/stern_1.28.0_linux_amd64.tar.gz
tar -xzf stern_1.28.0_linux_amd64.tar.gz
sudo mv stern /usr/local/bin/
```

### 使用方法

```bash
# 查看所有匹配标签的 Pod 日志
stern api -n lcagentns-app

# 实时跟随日志
stern api -n lcagentns-app --tail 100

# 查看多个 Deployment
stern "api|worker|beat" -n lcagentns-app

# 使用正则表达式匹配 Pod 名称
stern ".*api.*" -n lcagentns-app

# 只显示错误日志（需要 Pod 输出包含 ERROR）
stern api -n lcagentns-app | grep -i error
```

---

## 5. Kubernetes Dashboard（Web UI）

Kubernetes 官方提供的 Web 界面。

### 安装

```bash
# 应用 Dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# 创建管理员用户（用于访问 Dashboard）
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
EOF

# 获取访问令牌
kubectl -n kubernetes-dashboard create token admin-user

# 启动代理访问
kubectl proxy
```

然后访问：http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

### 功能

- Web 界面，无需安装客户端
- 查看资源状态
- 查看日志
- 进入容器 Shell
- 资源管理

---

## 6. 快速日志查看脚本

创建一个便捷的日志查看脚本：

### Windows (view-logs.ps1)

```powershell
# agentEasy/docker/k8s/view-logs.ps1
param(
    [Parameter(Mandatory=$false)]
    [string]$Resource = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Namespace = "lcagentns-app",
    
    [Parameter(Mandatory=$false)]
    [switch]$Follow = $false,
    
    [Parameter(Mandatory=$false)]
    [int]$Tail = 100
)

if ($Resource -eq "") {
    Write-Host "`n=== 可用的资源 ===" -ForegroundColor Cyan
    Write-Host "`nPods:" -ForegroundColor Yellow
    kubectl get pods -n $Namespace --no-headers | ForEach-Object {
        $parts = $_ -split '\s+'
        Write-Host "  - $($parts[0])" -ForegroundColor White
    }
    
    Write-Host "`nDeployments:" -ForegroundColor Yellow
    kubectl get deployments -n $Namespace --no-headers | ForEach-Object {
        $parts = $_ -split '\s+'
        Write-Host "  - $($parts[0])" -ForegroundColor White
    }
    
    Write-Host ""
    $Resource = Read-Host "请输入资源名称（Pod 或 Deployment）"
}

# 检查是 Pod 还是 Deployment
$podList = kubectl get pods -n $Namespace -o name 2>$null
$deployList = kubectl get deployments -n $Namespace -o name 2>$null

$isPod = $podList -match $Resource
$isDeploy = $deployList -match $Resource

$cmd = "kubectl logs"
if ($isDeploy) {
    $cmd += " deployment/$Resource"
} else {
    $cmd += " $Resource"
}

$cmd += " -n $Namespace"
$cmd += " --tail=$Tail"

if ($Follow) {
    $cmd += " -f"
}

Write-Host "`n执行命令: $cmd`n" -ForegroundColor Gray
Invoke-Expression $cmd
```

### Linux/Mac (view-logs.sh)

```bash
#!/bin/bash
# agentEasy/docker/k8s/view-logs.sh

RESOURCE=${1:-""}
NAMESPACE=${2:-"lcagentns-app"}
FOLLOW=${3:-""}
TAIL=${4:-100}

if [ -z "$RESOURCE" ]; then
    echo ""
    echo "=== 可用的资源 ==="
    echo ""
    echo "Pods:"
    kubectl get pods -n $NAMESPACE --no-headers | awk '{print "  - " $1}'
    
    echo ""
    echo "Deployments:"
    kubectl get deployments -n $NAMESPACE --no-headers | awk '{print "  - " $1}'
    
    echo ""
    read -p "请输入资源名称（Pod 或 Deployment）: " RESOURCE
fi

# 检查是 Pod 还是 Deployment
if kubectl get deployment "$RESOURCE" -n "$NAMESPACE" &>/dev/null; then
    CMD="kubectl logs deployment/$RESOURCE -n $NAMESPACE --tail=$TAIL"
else
    CMD="kubectl logs $RESOURCE -n $NAMESPACE --tail=$TAIL"
fi

if [ "$FOLLOW" = "-f" ] || [ "$FOLLOW" = "follow" ]; then
    CMD="$CMD -f"
fi

echo ""
echo "执行命令: $CMD"
echo ""
eval $CMD
```

使用示例：
```bash
# Windows
.\view-logs.ps1 -Resource api -Follow
.\view-logs.ps1 -Resource api-xxx-12345

# Linux/Mac
chmod +x view-logs.sh
./view-logs.sh api follow
./view-logs.sh api-xxx-12345
```

---

## 推荐组合

### 日常开发
- **k9s** - 快速查看和操作（终端 UI）
- **kubectl logs** - 脚本和自动化

### 图形界面需求
- **Lens** - 完整的 GUI 管理工具

### 多 Pod 日志聚合
- **Stern** - 同时查看多个 Pod 日志

### 团队协作
- **Kubernetes Dashboard** - Web 界面，易于分享

---

## 快速开始

### 安装 k9s（推荐）

```powershell
# Windows (Scoop)
scoop install k9s

# 或使用 Chocolatey
choco install k9s
```

然后运行：
```bash
k9s -n lcagentns-app
```

### 安装 Lens（GUI）

访问 https://k8slens.dev/ 下载安装。

---

## 常见问题

### Q: 如何查看容器重启前的日志？
```bash
kubectl logs <pod-name> --previous -n lcagentns-app
```

### Q: 如何查看多个容器的日志？
```bash
# Pod 中有多个容器时
kubectl logs <pod-name> -c <container-name> -n lcagentns-app
```

### Q: 如何过滤日志中的错误？
```bash
kubectl logs <pod-name> -n lcagentns-app | grep -i error
```

### Q: 如何查看最近 1 小时的日志？
```bash
kubectl logs <pod-name> --since=1h -n lcagentns-app
```

---

## 总结

| 工具 | 类型 | 适用场景 | 推荐度 |
|------|------|---------|--------|
| k9s | 终端 UI | 日常开发、快速操作 | ⭐⭐⭐⭐⭐ |
| Lens | GUI | 图形界面需求、多集群管理 | ⭐⭐⭐⭐⭐ |
| kubectl logs | 命令行 | 脚本、自动化 | ⭐⭐⭐⭐ |
| Stern | 命令行 | 多 Pod 日志聚合 | ⭐⭐⭐⭐ |
| Kubernetes Dashboard | Web UI | 团队协作、Web 访问 | ⭐⭐⭐ |

**建议：安装 k9s 作为主要工具，Lens 作为图形界面补充。**


