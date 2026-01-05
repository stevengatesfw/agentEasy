# Kubernetes GPU 支持配置

## NVIDIA Device Plugin 是什么？

**NVIDIA Device Plugin** 是一个 Kubernetes 组件，用于：
1. **让 Kubernetes 识别 GPU 资源**：将节点上的 GPU 暴露给 Kubernetes 调度器
2. **管理 GPU 分配**：确保 Pod 可以正确请求和使用 GPU
3. **资源监控**：让 `kubectl describe node` 显示 GPU 资源信息

## 工作原理

```
物理 GPU
   ↓
NVIDIA 驱动 (Windows/Linux)
   ↓
Docker (支持 --gpus)
   ↓
NVIDIA Device Plugin (DaemonSet) ← 这个组件
   ↓
Kubernetes 节点资源 (nvidia.com/gpu)
   ↓
Pod 可以请求 GPU
```

## 部署方式

### 1. 一次性部署（推荐）

**只需要部署一次**，不需要每次启动服务都部署。它是 DaemonSet，会自动在每个节点上运行。

```bash
# 部署 Device Plugin（只需要执行一次）
kubectl apply -f nvidia-device-plugin.yaml

# 检查是否运行
kubectl get pods -n kube-system | findstr nvidia-device-plugin
```

### 2. 验证 GPU 是否被识别

部署后，检查节点资源：

```bash
# 查看节点容量（应该显示 nvidia.com/gpu）
kubectl describe node docker-desktop | findstr -i "nvidia\|gpu"

# 或者
kubectl get nodes -o jsonpath='{.items[*].status.capacity.nvidia\.com/gpu}'
```

如果看到 GPU 数量（如 `1`），说明配置成功。

## 是否每次都要启动？

**不需要！** Device Plugin 是系统级组件：

- ✅ **DaemonSet**：自动在每个节点上运行一个 Pod
- ✅ **持久运行**：一旦部署，会一直运行，直到删除
- ✅ **自动重启**：如果 Pod 崩溃，Kubernetes 会自动重启
- ✅ **集群级别**：整个集群只需要部署一次

### 什么时候需要重新部署？

只有在以下情况才需要重新部署：
1. **首次安装**：第一次在 Kubernetes 中使用 GPU
2. **更新版本**：需要更新 Device Plugin 版本
3. **配置变更**：修改了 Device Plugin 的配置
4. **删除后恢复**：如果之前删除了，需要重新部署

## 集成到启动脚本

可以将 Device Plugin 部署集成到启动脚本中，但需要检查是否已存在：

### 方式 1：在 start.ps1 中添加（推荐）

```powershell
# 检查并部署 NVIDIA Device Plugin（如果需要 GPU）
Write-Host "检查 GPU 支持..." -ForegroundColor Cyan
$gpuCount = kubectl get nodes -o jsonpath='{.items[0].status.capacity.nvidia\.com/gpu}' 2>$null
if (-not $gpuCount) {
    Write-Host "未检测到 GPU，部署 NVIDIA Device Plugin..." -ForegroundColor Yellow
    kubectl apply -f nvidia-device-plugin.yaml 2>$null
    Write-Host "等待 Device Plugin 启动..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    kubectl wait --for=condition=ready pod -l name=nvidia-device-plugin-ds -n kube-system --timeout=60s 2>$null
} else {
    Write-Host "GPU 已识别: $gpuCount 个 GPU" -ForegroundColor Green
}
```

### 方式 2：手动部署（简单）

如果不需要 GPU，可以跳过。如果需要 GPU，手动执行一次：

```bash
kubectl apply -f agentEasy/docker/k8s/nvidia-device-plugin.yaml
```

## 使用 GPU 的 Pod 配置

部署 Device Plugin 后，Pod 就可以请求 GPU 了：

```yaml
resources:
  requests:
    nvidia.com/gpu: 1  # 请求 1 个 GPU
  limits:
    nvidia.com/gpu: 1  # 限制最多使用 1 个 GPU
```

## 常见问题

### Q1: 为什么 Docker 可以访问 GPU，但 Kubernetes 不行？

**A**: Docker 直接使用主机驱动，但 Kubernetes 需要通过 Device Plugin 来识别和管理 GPU 资源。

### Q2: 不部署 Device Plugin 会怎样？

**A**: 
- Pod 无法请求 GPU（会报 `Insufficient nvidia.com/gpu` 错误）
- 即使物理有 GPU，Kubernetes 也看不到
- 只能通过 `hostNetwork: true` 等方式绕过（不推荐）

### Q3: 部署后多久生效？

**A**: 通常几秒钟内生效。可以运行：
```bash
kubectl get nodes -o jsonpath='{.items[*].status.capacity.nvidia\.com/gpu}'
```

### Q4: 如何卸载？

```bash
kubectl delete -f nvidia-device-plugin.yaml
```

### Q5: 多个节点都需要吗？

**A**: DaemonSet 会自动在每个节点上运行。如果某个节点没有 GPU，Pod 会启动失败但不影响其他节点。

## 检查清单

- [ ] NVIDIA 驱动已安装（`nvidia-smi` 可以运行）
- [ ] Docker 可以访问 GPU（`docker run --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi` 成功）
- [ ] Device Plugin 已部署（`kubectl get pods -n kube-system | findstr nvidia`）
- [ ] 节点显示 GPU 资源（`kubectl describe node | findstr nvidia`）
- [ ] Pod 可以调度（不再报 `Insufficient nvidia.com/gpu` 错误）

## 总结

| 项目 | 说明 |
|------|------|
| **部署频率** | 一次性部署，不需要每次启动都部署 |
| **运行方式** | DaemonSet，自动在每个节点运行 |
| **作用** | 让 Kubernetes 识别和管理 GPU |
| **必需性** | 如果 Pod 需要 GPU，必须部署 |
| **维护** | 基本不需要维护，自动运行 |

**建议**：如果需要使用 GPU，在首次部署 Kubernetes 时一起部署 Device Plugin，之后就不需要再管了。


