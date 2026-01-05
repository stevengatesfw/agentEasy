# Minikube 迁移指南

本文档说明从 docker-compose 迁移到 minikube 时需要在代码层面做的改动。

## 同时运行两套环境

**✅ 完全可行！** 如果你需要同时运行 docker-compose 和 k8s 两套环境，它们可以完全独立运行，因为：

### 1. 资源隔离
- **K8s 使用命名空间**：所有资源都在 `lcagentns-app` 命名空间中，与 Docker Compose 完全隔离
- **Docker Compose 使用独立网络**：`lazycraft-network` 与 K8s 集群网络隔离
- **存储隔离**：Docker Compose 使用本地 volumes，K8s 使用 PVC，数据完全独立

### 2. 端口已区分 ✅
- **Nginx HTTP**：Docker Compose `30382` vs K8s `30386` ✅
- **Nginx HTTPS**：Docker Compose `30383` vs K8s `30387` ✅
- **TiDB**：Docker Compose `4000`，K8s 的 NodePort 已注释（不会冲突）✅
- **cloud-service**：Docker Compose `31340/31341`，K8s 的 NodePort 已注释（不会冲突）✅

### 3. 配置可以不同 ✅
- **数据库名称**：可以不同（`lazycraft` vs `lcagent`）
- **路径配置**：可以不同（`lazycraft` vs `lcagent`）
- **服务名称**：可以不同（Docker Compose 使用服务名，K8s 使用 Service 名）
- **环境变量**：可以不同（通过 ConfigMap 和 docker-compose.yml 分别配置）

### 4. 注意事项
- **镜像名称**：如果使用相同的镜像名称，确保镜像已构建并可用
- **资源占用**：两套环境会占用更多 CPU、内存和磁盘空间
- **GPU 资源**：如果使用 GPU，需要确保有足够的 GPU 资源分配给两套环境

### 5. 同时运行的场景
- ✅ 开发环境（docker-compose）和生产环境（k8s）同时运行
- ✅ 测试不同配置
- ✅ 逐步迁移验证
- ✅ A/B 测试

**结论**：可以同时运行，配置不需要完全一致，只需要确保端口不冲突（已经区分好了）。

## 需要修改的配置

> **💡 提示**：如果你需要**同时运行** docker-compose 和 k8s 两套环境，以下配置**不需要统一**，因为它们是**完全独立**的环境。只需要确保端口不冲突（已经区分好了）。

### 1. 数据库名称不一致 ⚠️（仅迁移时需要统一）

**当前状态**：
- `docker-compose.yml` 中 `DB_DATABASE: lazycraft`
- `configmap.yaml` 中 `DB_DATABASE: lcagent`

**同时运行两套环境**：✅ **可以不同**，因为是完全独立的数据库实例。

**仅迁移时**：需要统一为实际使用的数据库名称。

**修改位置**：`configmap.yaml` 第 19 行

```yaml
# 如果使用 lazycraft，修改为：
DB_DATABASE: "lazycraft"

# 如果使用 lcagent，保持现状即可
DB_DATABASE: "lcagent"
```

### 2. 路径配置不一致 ⚠️（仅迁移时需要统一）

**当前状态**：
- `docker-compose.yml` 中路径使用 `lazycraft`
- `configmap.yaml` 中路径使用 `lcagent`

**同时运行两套环境**：✅ **可以不同**，因为使用不同的存储卷。

**仅迁移时**：需要统一路径配置。

**修改位置**：`configmap.yaml` 第 55-58 行

```yaml
# 如果使用 lazycraft 路径，修改为：
LAZYLLM_UPLOAD_PATH: "/mnt/lustre/share_data/lazycraft/upload"
HUGGINGFACE_HUB_CACHE: "/mnt/lustre/share_data/lazycraft/exist_model/config"
EXIST_MODEL_PATH: "/mnt/lustre/share_data/lazycraft/exist_model/models_hub"
LAZYLLM_MODEL_PATH: "/mnt/lustre/share_data/models:/mnt/lustre/share_data/lazycraft/exist_model/models_hub"
```

### 3. WEB_CONSOLE_ENDPOINT 和 MINIO_PROXY 地址 ⚠️（必须修改）

**问题**：当前配置为 `http://127.0.0.1:30382`，但 minikube 的 NodePort 是 `30386`。

**修改位置**：`configmap.yaml` 第 9 行和第 68 行

```yaml
WEB_CONSOLE_ENDPOINT: "http://127.0.0.1:30386"  # 或使用 minikube ip: minikube ip
MINIO_PROXY: "http://127.0.0.1:30386"  # 或使用 minikube ip
```

**获取 minikube IP**：
```bash
minikube ip
# 例如：192.168.49.2
# 则配置为：http://192.168.49.2:30386
```

### 4. Nginx SSL 证书路径 ⚠️

**问题**：`nginx.yaml` 中使用 `hostPath: /mnt/lizhipeng/nginx_ssl`，这个路径在 minikube 虚拟机中不存在。

**修改位置**：`nginx.yaml` 第 56-58 行

**方案 1：使用 ConfigMap/Secret 存储 SSL 证书（推荐）**

```yaml
- name: ssl-certs
  secret:
    secretName: nginx-ssl-certs
```

然后创建 Secret：
```bash
kubectl create secret tls nginx-ssl-certs \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n lcagentns-app
```

**方案 2：禁用 SSL（仅开发环境）**

```yaml
# 注释掉 ssl-certs volume
# - name: ssl-certs
#   hostPath:
#     path: /mnt/lizhipeng/nginx_ssl
#     type: DirectoryOrCreate
```

**方案 3：使用 minikube 挂载（不推荐）**

```yaml
- name: ssl-certs
  hostPath:
    path: /tmp/nginx_ssl  # minikube 虚拟机内的路径
    type: DirectoryOrCreate
```

然后需要将证书文件复制到 minikube：
```bash
minikube ssh
mkdir -p /tmp/nginx_ssl
# 然后复制证书文件
```

### 5. 镜像拉取策略

**当前状态**：大部分 Deployment 已配置 `imagePullPolicy: IfNotPresent`，这是正确的。

**检查清单**：
- ✅ `backend.yaml` - 已配置
- ✅ `frontend.yaml` - 已配置
- ⚠️ `tidb.yaml` - 需要检查
- ⚠️ `redis.yaml` - 需要检查
- ⚠️ `minio.yaml` - 需要检查
- ⚠️ `mcp-services.yaml` - 需要检查
- ⚠️ `nginx.yaml` - 需要检查
- ⚠️ `cloud-service.yaml` - 已配置

**建议**：为所有 Deployment 添加 `imagePullPolicy: IfNotPresent`，避免从远程拉取镜像。

### 6. 存储路径配置

**当前状态**：`storage-class-local-path.yaml` 中配置的路径是 `/opt/local-path-provisioner`。

**检查**：确保 minikube 有足够的磁盘空间。

**修改位置**（如需要）：`storage-class-local-path.yaml` 第 99 行

```yaml
"paths":["/opt/local-path-provisioner"]  # 可以根据需要修改
```

### 7. GPU 支持（可选）

**如果需要 GPU 支持**：

1. **启动 minikube 时启用 GPU**：
```bash
minikube start --driver=docker --gpus=all
```

2. **部署 NVIDIA Device Plugin**：
```bash
kubectl apply -f nvidia-device-plugin.yaml
```

3. **验证 GPU**：
```bash
kubectl get nodes -o jsonpath='{.items[0].status.capacity.nvidia\.com/gpu}'
```

**如果不需要 GPU**：
- `cloud-service.yaml` 中的 GPU 资源请求已注释，可以直接使用。

### 8. DEPLOY_MCP_ENV 环境变量

**当前配置**：`configmap.yaml` 第 70 行 `DEPLOY_MCP_ENV: "docker"`

**建议**：在 k8s 环境中应该改为 `"k8s"` 或 `"kubernetes"`（如果应用支持）。

**修改位置**：`configmap.yaml` 第 70 行

```yaml
DEPLOY_MCP_ENV: "k8s"  # 或 "kubernetes"，根据应用实际支持的值
```

## 修改优先级

### 必须修改（否则无法正常运行）

1. ✅ **WEB_CONSOLE_ENDPOINT 和 MINIO_PROXY** - 必须（更新为 k8s 的访问地址）
2. ✅ **Nginx SSL 证书路径** - 必须（如果使用 HTTPS）

### 同时运行两套环境时不需要修改

3. ⚠️ **数据库名称统一** - 不需要（可以不同）
4. ⚠️ **路径配置统一** - 不需要（可以不同）

### 建议修改（提升体验）

5. ⚠️ **镜像拉取策略** - 建议
6. ⚠️ **DEPLOY_MCP_ENV** - 建议

### 可选修改（根据需求）

7. ⚠️ **GPU 支持** - 可选
8. ⚠️ **存储路径** - 可选

## 快速检查清单

在部署到 minikube 之前，请确认：

- [ ] 数据库名称已统一（lazycraft 或 lcagent）
- [ ] 路径配置已统一（lazycraft 或 lcagent）
- [ ] WEB_CONSOLE_ENDPOINT 已更新为 minikube 访问地址
- [ ] MINIO_PROXY 已更新为 minikube 访问地址
- [ ] Nginx SSL 证书路径已处理（使用 Secret 或禁用）
- [ ] 所有镜像的 imagePullPolicy 已配置
- [ ] DEPLOY_MCP_ENV 已更新为 k8s（如果支持）
- [ ] 已安装 local-path-provisioner
- [ ] 已创建所有必要的 PVC
- [ ] （可选）已配置 GPU 支持

## 部署顺序

1. 启动 minikube
2. 安装存储类：`kubectl apply -f storage-class-local-path.yaml`
3. 创建命名空间：`kubectl apply -f namespace.yaml`
4. 创建 ConfigMap 和 Secrets：`kubectl apply -f configmap.yaml secrets.yaml`
5. 创建 PVC：`kubectl apply -f pvc.yaml`
6. 部署数据库：`kubectl apply -f tidb.yaml redis.yaml`
7. 部署其他服务：`kubectl apply -f minio.yaml backend.yaml frontend.yaml cloud-service.yaml mcp-services.yaml nginx.yaml`
8. （可选）部署 GPU 支持：`kubectl apply -f nvidia-device-plugin.yaml`

## 验证部署

```bash
# 查看所有 Pod
kubectl get pods -n lcagentns-app

# 查看所有 Service
kubectl get svc -n lcagentns-app

# 获取 minikube IP
minikube ip

# 访问服务
# http://<minikube-ip>:30386
```

## 常见问题

### Q1: Pod 一直处于 Pending 状态

**A**: 检查 PVC 是否已绑定：
```bash
kubectl get pvc -n lcagentns-app
kubectl describe pvc <pvc-name> -n lcagentns-app
```

### Q2: 服务无法访问

**A**: 检查 Service 的 NodePort：
```bash
kubectl get svc nginx -n lcagentns-app
# 确保使用正确的端口访问
```

### Q3: 镜像拉取失败

**A**: 
1. 确保镜像已构建并加载到 minikube：
```bash
eval $(minikube docker-env)
docker build -t easyagent-back:latest .
docker build -t easyagent-front:latest .
```

2. 或配置镜像拉取策略为 `Never`（仅使用本地镜像）

### Q4: 数据库连接失败

**A**: 检查：
1. TiDB Pod 是否运行：`kubectl get pods -l app=tidb -n lcagentns-app`
2. 数据库名称是否正确
3. Service 名称是否正确（应该是 `tidb`）

