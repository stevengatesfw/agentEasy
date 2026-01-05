# Minikube 启动指南（中国大陆用户）

## 问题分析

### 错误原因

启动 minikube 时出现以下错误：
```
❗  The image 'gcr.io/k8s-minikube/storage-provisioner:v5' was not found
❗  The image 'registry.k8s.io/kube-controller-manager:v1.34.0' was not found
❗  The image 'registry.k8s.io/kube-scheduler:v1.34.0' was not found
❗  The image 'registry.k8s.io/kube-proxy:v1.34.0' was not found
```

**根本原因**：
- 在中国大陆，`gcr.io` 和 `registry.k8s.io` 等国外镜像仓库无法直接访问
- Minikube 默认使用这些仓库拉取 Kubernetes 组件镜像
- 网络限制导致镜像拉取失败

## 解决方案

### 方案 1：使用国内镜像源启动（推荐）

使用阿里云等国内镜像源启动 minikube：

```powershell
# 停止并删除现有的 minikube 集群（如果存在）
minikube stop
minikube delete

# 使用国内镜像源启动
minikube start `
  --image-mirror-country='cn' `
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' `
  --registry-mirror='https://docker.mirrors.ustc.edu.cn' `
  --cpus=4 `
  --memory=8192mb `
  --disk-size=50g
```

**参数说明**：
- `--image-mirror-country='cn'`：使用中国镜像源
- `--image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers'`：使用阿里云 Kubernetes 镜像仓库
- `--registry-mirror='https://docker.mirrors.ustc.edu.cn'`：Docker 镜像加速器（中科大镜像）
- `--cpus=4`：分配 4 个 CPU 核心（根据你的机器配置调整）
- `--memory=8192mb`：分配 8GB 内存（根据你的机器配置调整）
- `--disk-size=50g`：分配 50GB 磁盘空间

### 方案 2：配置 Docker 镜像加速器（如果方案 1 不行）

1. **配置 Docker Desktop 镜像加速器**：
   - 打开 Docker Desktop
   - Settings → Docker Engine
   - 添加以下配置：
   ```json
   {
     "registry-mirrors": [
       "https://docker.mirrors.ustc.edu.cn",
       "https://registry.docker-cn.com",
       "https://hub-mirror.c.163.com"
     ]
   }
   ```
   - 点击 "Apply & Restart"

2. **然后启动 minikube**：
   ```powershell
   minikube start --image-mirror-country='cn' --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers'
   ```

### 方案 3：使用代理（如果有）

如果你有可用的代理，可以配置代理：

```powershell
# 设置代理环境变量
$env:HTTP_PROXY="http://your-proxy:port"
$env:HTTPS_PROXY="http://your-proxy:port"
$env:NO_PROXY="localhost,127.0.0.1"

# 启动 minikube
minikube start
```

## 完整的启动步骤

### 1. 清理现有集群（如果启动失败）

```powershell
# 停止集群
minikube stop

# 删除集群
minikube delete

# 清理缓存（可选）
minikube cache delete
```

### 2. 使用国内镜像源启动

```powershell
minikube start `
  --image-mirror-country='cn' `
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' `
  --registry-mirror='https://docker.mirrors.ustc.edu.cn' `
  --cpus=4 `
  --memory=8192mb `
  --disk-size=50g
```

### 3. 验证启动成功

```powershell
# 检查集群状态
minikube status

# 查看节点信息
kubectl get nodes

# 查看集群信息
kubectl cluster-info
```

### 4. 配置 kubectl（如果需要）

```powershell
# Minikube 会自动配置 kubectl，验证：
kubectl config current-context
# 应该显示：minikube
```

## 其他有用的命令

### 查看 minikube 配置

```powershell
minikube config view
```

### 设置默认配置（避免每次都要输入参数）

```powershell
# 设置镜像仓库
minikube config set image-repository registry.cn-hangzhou.aliyuncs.com/google_containers

# 设置镜像镜像国家
minikube config set image-mirror-country cn

# 查看配置
minikube config view
```

### 进入 minikube 虚拟机

```powershell
minikube ssh
```

### 查看 minikube IP

```powershell
minikube ip
```

### 停止和启动集群

```powershell
# 停止集群
minikube stop

# 启动集群
minikube start

# 暂停集群（保留状态）
minikube pause

# 恢复集群
minikube unpause
```

## 解决 kicbase 镜像问题

### 问题：kicbase 镜像无法拉取

如果遇到以下错误：
```
Unable to find image 'registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48@sha256:...' locally
docker: Error response from daemon: failed to resolve reference ... not found
```

这是因为 `kicbase` 镜像不在阿里云的 `google_containers` 仓库中。

### 解决方案

#### 方案 1：手动拉取并重命名镜像（推荐）

```powershell
# 1. 从 Docker Hub 拉取 kicbase 镜像（如果有代理或能访问）
docker pull gcr.io/k8s-minikube/kicbase:v0.0.48

# 或者从其他镜像源拉取
docker pull docker.mirrors.ustc.edu.cn/k8s-minikube/kicbase:v0.0.48

# 2. 重命名为阿里云镜像名称
docker tag gcr.io/k8s-minikube/kicbase:v0.0.48 registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48

# 3. 启动 minikube
minikube start --image-mirror-country='cn' --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers'
```

#### 方案 2：使用 Docker Hub 镜像（如果有代理）

```powershell
# 直接使用 Docker Hub，不指定镜像仓库
minikube start --image-mirror-country='cn'
```

#### 方案 3：使用预下载的镜像文件

如果网络完全无法访问，可以：
1. 在有网络的机器上下载镜像
2. 导出为 tar 文件
3. 导入到本地 Docker

```powershell
# 在有网络的机器上
docker pull gcr.io/k8s-minikube/kicbase:v0.0.48
docker save gcr.io/k8s-minikube/kicbase:v0.0.48 -o kicbase.tar

# 在本地机器上
docker load -i kicbase.tar
docker tag gcr.io/k8s-minikube/kicbase:v0.0.48 registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48
```

#### 方案 4：使用其他镜像源

尝试使用其他国内镜像源：

```powershell
# 使用腾讯云
minikube start --image-repository='ccr.ccs.tencentyun.com/google_containers'

# 或使用网易云
minikube start --image-repository='hub-mirror.c.163.com/google_containers'
```

#### 方案 5：使用本地已有的镜像（如果之前成功启动过）

```powershell
# 检查本地是否有 kicbase 镜像
docker images | findstr kicbase

# 如果有，重命名
docker tag <existing-image> registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48
```

## 常见问题

### Q1: 启动后仍然无法拉取镜像

**A**: 尝试以下方法：
1. 检查网络连接
2. 尝试使用其他镜像源：
   ```powershell
   # 使用腾讯云镜像
   minikube start --image-repository='ccr.ccs.tencentyun.com/google_containers'
   ```
3. 手动拉取镜像到 Docker：
   ```powershell
   docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-proxy:v1.34.0
   ```

### Q2: 内存不足

**A**: 减少分配的内存：
```powershell
minikube start --memory=4096mb --cpus=2
```

### Q3: 磁盘空间不足

**A**: 减少分配的磁盘空间或清理 Docker：
```powershell
# 清理 Docker 未使用的资源
docker system prune -a
```

### Q4: 启动很慢

**A**: 
1. 使用 SSD 硬盘
2. 增加内存和 CPU
3. 使用国内镜像源（已配置）

## 推荐的完整启动命令

```powershell
# 清理
minikube stop
minikube delete

# 启动（根据你的机器配置调整资源）
minikube start `
  --image-mirror-country='cn' `
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' `
  --registry-mirror='https://docker.mirrors.ustc.edu.cn' `
  --cpus=4 `
  --memory=8192mb `
  --disk-size=50g `
  --driver=docker
```

## 验证部署

启动成功后，可以部署你的应用：

```powershell
# 进入 k8s 配置目录
cd D:\dev\work\llm\code\agentEasy\docker\k8s

# 部署应用（按照 quick-start.md 的步骤）
kubectl apply -f storage-class-local-path.yaml
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
# ... 其他资源
```

