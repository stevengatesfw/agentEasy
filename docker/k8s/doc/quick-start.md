# 快速启动指南

## 前置检查

在开始之前，请确保：

1. **Docker Desktop 的 Kubernetes 已启用**
   - 打开 Docker Desktop
   - Settings → Kubernetes
   - 勾选 "Enable Kubernetes"
   - 点击 "Apply & Restart"

2. **kubectl 已安装并可用**
   ```powershell
   kubectl version --client
   ```

3. **Kubernetes 集群可用**
   ```powershell
   kubectl cluster-info
   kubectl get nodes
   ```

## 启动步骤

### 方式 1：使用启动脚本（推荐）

在 PowerShell 中执行：

```powershell
cd D:\dev\work\llm\code\agentEasy\docker\k8s
.\start.ps1
```

### 方式 2：手动执行（逐步）

打开 PowerShell，切换到 k8s 目录：

```powershell
cd D:\dev\work\llm\code\agentEasy\docker\k8s
```

然后按顺序执行以下命令：

#### 步骤 1：安装存储类
```powershell
kubectl apply -f storage-class-local-path.yaml
kubectl get storageclass
```

#### 步骤 2：创建基础资源
```powershell
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
```

#### 步骤 3：创建存储
```powershell
kubectl apply -f pvc.yaml
kubectl get pvc -n lcagentns-app
```

#### 步骤 4：部署数据库和缓存
```powershell
kubectl apply -f tidb.yaml
kubectl apply -f redis.yaml
```

#### 步骤 5：等待数据库就绪（可选）
```powershell
kubectl wait --for=condition=ready pod -l app=tidb -n lcagentns-app --timeout=300s
```

#### 步骤 6：部署其他服务
```powershell
kubectl apply -f minio.yaml
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
kubectl apply -f cloud-service.yaml
kubectl apply -f mcp-services.yaml
kubectl apply -f nginx.yaml
```

## 验证部署

### 查看所有 Pod 状态
```powershell
kubectl get pods -n lcagentns-app
```

### 查看所有 Service
```powershell
kubectl get svc -n lcagentns-app
```

### 查看 Nginx 的 NodePort
```powershell
kubectl get svc nginx -n lcagentns-app
```

### 查看特定服务的日志
```powershell
kubectl logs -f deployment/api -n lcagentns-app
```

## 访问服务

部署完成后，访问地址：
- **HTTP**: http://localhost:30386
- **HTTPS**: https://localhost:30387

## 常见问题

### 1. Pod 一直处于 Pending 状态
```powershell
# 查看 Pod 详情
kubectl describe pod <pod-name> -n lcagentns-app

# 检查 PVC 状态
kubectl get pvc -n lcagentns-app
```

### 2. PVC 无法绑定
```powershell
# 检查 StorageClass
kubectl get storageclass

# 检查 PV
kubectl get pv
```

### 3. 服务无法访问
```powershell
# 检查 Service 和 Endpoints
kubectl get svc -n lcagentns-app
kubectl get endpoints -n lcagentns-app

# 检查 Pod 是否运行
kubectl get pods -n lcagentns-app
```

