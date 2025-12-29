# Kubernetes 部署指南

本目录包含将 Docker Compose 配置转换为 Kubernetes manifests 的所有文件。

## 文件结构

```
k8s/
├── README.md                    # 本文件
├── PORT_CONFLICT_CHECK.md       # 端口冲突检查报告
├── PORT_MAPPING.md              # 端口映射说明
├── STORAGE_CLASS_SETUP.md       # 存储类配置指南
├── LOCAL_STORAGE_EXPLANATION.md # 本地存储详解（节点、数据持久性说明）
├── storage-class-local-path.yaml # 本地路径存储类配置
├── namespace.yaml               # Namespace 定义
├── configmap.yaml               # 环境变量配置
├── secrets.yaml                 # 敏感信息（需要手动配置）
├── pvc.yaml                     # 持久化存储声明
├── tidb.yaml                    # TiDB 集群（PD, TiKV, TiDB）
├── redis.yaml                   # Redis 服务
├── minio.yaml                   # MinIO 对象存储
├── backend.yaml                 # 后端服务（api, worker, beat）
├── frontend.yaml                # 前端服务
├── cloud-service.yaml           # 云服务（AMS, FT）
├── mcp-services.yaml            # MCP 相关服务
└── nginx.yaml                   # Nginx 反向代理
```

## 部署步骤

### 1. 准备工作

#### 1.1 创建 Namespace

```bash
kubectl apply -f namespace.yaml
```

#### 1.2 配置 Secrets

**重要**：在生产环境中，请使用安全的密钥管理方式（如 Kubernetes Secrets、HashiCorp Vault、云服务商的密钥管理服务等）。

编辑 `secrets.yaml`，填入实际的敏感信息：

```bash
# 使用 base64 编码敏感信息
echo -n "your-password" | base64

# 然后更新 secrets.yaml
kubectl apply -f secrets.yaml
```

或者使用 `kubectl create secret` 命令：

```bash
kubectl create secret generic lcagent-secrets \
  --from-literal=REDIS_PASSWORD=lazyai123456 \
  --from-literal=MINIO_ACCESS_KEY=minioadmin \
  --from-literal=MINIO_SECRET_KEY=minioadmin \
  --namespace=lcagentns-app
```

#### 1.3 配置存储类（StorageClass）

**本地路径存储配置（推荐用于开发环境）：**

1. 安装 Local Path Provisioner：
   ```bash
   kubectl apply -f storage-class-local-path.yaml
   ```

2. 验证安装：
   ```bash
   kubectl get storageclass
   ```

3. PVC 配置已默认使用 `local-path` 存储类。

**详细配置说明请参考：** `STORAGE_CLASS_SETUP.md`

**其他存储选项：**
- NFS：支持 ReadWriteMany，适合多 Pod 共享
- 云存储：根据云提供商选择（如 AWS EBS、Azure Disk 等）

如果没有配置存储类，Kubernetes 会使用默认的存储类。

### 2. 部署顺序

按照以下顺序部署，确保依赖服务先启动：

```bash
# 1. 创建 Namespace
kubectl apply -f namespace.yaml

# 2. 创建 ConfigMap 和 Secrets
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# 3. 创建持久化存储
kubectl apply -f pvc.yaml

# 4. 部署数据库和缓存
kubectl apply -f tidb.yaml
kubectl apply -f redis.yaml

# 5. 等待数据库就绪
kubectl wait --for=condition=ready pod -l app=tidb -n lcagentns-app --timeout=300s

# 6. 部署对象存储
kubectl apply -f minio.yaml

# 7. 部署后端服务
kubectl apply -f backend.yaml

# 8. 部署前端服务
kubectl apply -f frontend.yaml

# 9. 部署云服务（如果需要 GPU）
kubectl apply -f cloud-service.yaml

# 10. 部署 MCP 服务
kubectl apply -f mcp-services.yaml

# 11. 部署 Nginx（最后部署，因为它依赖其他服务）
kubectl apply -f nginx.yaml
```

### 3. 一键部署（推荐）

#### 方式 1：使用启动脚本（最简单）

**Windows (PowerShell):**
```powershell
cd agentEasy/docker/k8s
.\start.ps1
```

**Linux/Mac:**
```bash
cd agentEasy/docker/k8s
chmod +x start.sh
./start.sh
```

#### 方式 2：手动执行命令

```bash
# 按顺序应用所有配置文件
kubectl apply -f storage-class-local-path.yaml  # 先安装存储类
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f pvc.yaml
kubectl apply -f tidb.yaml
kubectl apply -f redis.yaml
kubectl apply -f minio.yaml
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
kubectl apply -f cloud-service.yaml
kubectl apply -f mcp-services.yaml
kubectl apply -f nginx.yaml
```

### 4. 验证部署

```bash
# 查看所有 Pod 状态
kubectl get pods -n lcagentns-app

# 查看所有 Service
kubectl get svc -n lcagentns-app

# 查看特定服务的日志
kubectl logs -f deployment/api -n lcagentns-app

# 查看服务状态
kubectl describe deployment/api -n lcagentns-app
```

### 5. 访问服务

#### 5.1 通过 NodePort 访问

```bash
# 查看 Nginx 服务的 NodePort
kubectl get svc nginx -n lcagentns-app

# 访问地址：
# HTTP:  http://<node-ip>:30386
# HTTPS: https://<node-ip>:30387
# 
# 注意：如果 Docker Compose 也在运行，Kubernetes 使用不同的端口：
# - Docker Compose: 30382 (HTTP), 30383 (HTTPS)
# - Kubernetes:     30386 (HTTP), 30387 (HTTPS)
```

#### 5.2 通过 Port Forward（开发/测试）

```bash
# 端口转发
kubectl port-forward svc/nginx 30382:80 -n lcagentns-app

# 然后访问 http://localhost:30382
```

#### 5.3 通过 Ingress（生产环境推荐）

如果需要使用 Ingress，需要：

1. 安装 Ingress Controller（如 Nginx Ingress Controller、Traefik 等）
2. 创建 Ingress 资源（未包含在本配置中，需要根据实际情况创建）

## 配置说明

### 镜像地址

所有 YAML 文件中的镜像地址都是示例，需要根据实际情况修改：

- `easyagent-back:latest` → 实际的后端镜像地址
- `easyagent-front:latest` → 实际的前端镜像地址
- `lcagent-core:12.8multienv` → 实际的云服务镜像地址

### 资源限制

当前配置没有设置资源限制（CPU/内存），生产环境建议添加：

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "1Gi"
  limits:
    cpu: "2000m"
    memory: "4Gi"
```

### GPU 支持

`cloud-service.yaml` 中配置了 GPU 支持，需要：

1. 集群已安装 NVIDIA GPU 驱动和 nvidia-device-plugin
2. 节点有可用的 GPU

如果没有 GPU，可以移除或注释掉 GPU 相关配置。

### 存储配置

- **ReadWriteMany (RWO)**：用于需要多个 Pod 共享的存储（如模型文件、上传文件）
- **ReadWriteOnce (RWO)**：用于单个 Pod 独占的存储（如数据库数据）

根据实际存储后端（NFS、Ceph、Local Path 等）调整 `accessModes` 和 `storageClassName`。

### Nginx 配置

`nginx.yaml` 中的 ConfigMap 需要从 `docker/nginx/` 目录复制实际配置内容。当前只是占位符。

## 故障排查

### Pod 无法启动

```bash
# 查看 Pod 状态
kubectl describe pod <pod-name> -n lcagentns-app

# 查看 Pod 日志
kubectl logs <pod-name> -n lcagentns-app

# 查看事件
kubectl get events -n lcagentns-app --sort-by='.lastTimestamp'
```

### 存储问题

```bash
# 查看 PVC 状态
kubectl get pvc -n lcagentns-app

# 查看 PV 状态
kubectl get pv

# 查看存储类
kubectl get storageclass
```

### 网络问题

```bash
# 测试服务连通性
kubectl run -it --rm debug --image=busybox --restart=Never -n lcagentns-app -- sh

# 在 debug pod 中测试
wget -O- http://api:8087/health
```

## 与 Docker Compose 的差异

1. **网络**：Kubernetes 使用 Service 进行服务发现，而不是 Docker 网络
2. **存储**：使用 PersistentVolumeClaim 而不是 Docker volumes
3. **配置**：使用 ConfigMap 和 Secret 而不是环境变量文件
4. **依赖**：使用 initContainers 或 readinessProbe 处理依赖关系，而不是 `depends_on`
5. **安全**：Kubernetes 提供更细粒度的安全控制（RBAC、NetworkPolicy 等）

## 生产环境建议

1. **使用 Helm Chart**：将配置组织成 Helm Chart，便于版本管理和部署
2. **配置 HPA**：根据负载自动扩缩容
3. **配置资源限制**：防止资源耗尽
4. **配置健康检查**：添加 liveness 和 readiness probes
5. **配置日志收集**：使用 EFK 或 Loki 收集日志
6. **配置监控**：使用 Prometheus + Grafana 监控
7. **配置备份**：定期备份数据库和重要数据
8. **使用 Ingress**：通过 Ingress 统一管理外部访问
9. **配置 TLS**：使用 Cert-Manager 自动管理 SSL 证书
10. **配置 RBAC**：限制服务账户权限

## 回滚

如果需要回滚到 Docker Compose：

```bash
# 删除所有 Kubernetes 资源
kubectl delete namespace lcagentns-app

# 或逐个删除
kubectl delete -f nginx.yaml
kubectl delete -f mcp-services.yaml
# ... 其他资源
```

## 注意事项

1. **端口冲突**：
   - 如果 Docker Compose 和 Kubernetes 同时运行，它们使用不同的端口：
     - Docker Compose: HTTP 30382, HTTPS 30383
     - Kubernetes: HTTP 30386, HTTPS 30387
   - 如果需要修改 Kubernetes 的端口，编辑 `nginx.yaml` 中的 `nodePort` 值
2. **开发环境挂载**：Docker Compose 中的源码挂载（`../back/src`）在 Kubernetes 中不适用，需要重新构建镜像
3. **SSL 证书**：Nginx 的 SSL 证书路径需要根据实际情况调整
4. **GPU 支持**：确保集群支持 GPU，否则 `cloud-service` 可能无法启动
5. **存储大小**：根据实际需求调整 PVC 的存储大小
6. **镜像拉取**：如果使用私有镜像仓库，需要配置 imagePullSecrets

## 参考资源

- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Kubernetes 最佳实践](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Services](https://kubernetes.io/docs/concepts/services-networking/service/)

