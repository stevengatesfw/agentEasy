# 解决 Minikube kicbase 镜像问题

## 问题描述

启动 minikube 时出现错误：
```
Unable to find image 'registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48@sha256:...' locally
docker: Error response from daemon: failed to resolve reference ... not found
```

**原因**：`kicbase` 是 minikube 的基础容器镜像，不在阿里云的 `google_containers` 仓库中。

## 解决方案

### 方案 1：手动拉取并重命名（推荐，如果有代理）

```powershell
# 1. 从原始源拉取（需要代理或能访问 gcr.io）
docker pull gcr.io/k8s-minikube/kicbase:v0.0.48

# 2. 重命名为阿里云镜像名称
docker tag gcr.io/k8s-minikube/kicbase:v0.0.48 registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48

# 3. 启动 minikube
minikube start --image-mirror-country='cn' --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers'
```

### 方案 2：使用 Docker Hub（如果有代理）

```powershell
# 直接从 Docker Hub 拉取
docker pull docker.io/kicbase/stable:v0.0.48

# 重命名
docker tag docker.io/kicbase/stable:v0.0.48 registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48

# 启动
minikube start --image-mirror-country='cn' --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers'
```

**注意**：如果遇到 Kubernetes 二进制文件下载失败（404 错误），说明镜像源可能没有对应版本的 Kubernetes 二进制文件，请使用方案 3、方案 4 或方案 7。

### 方案 3：不指定镜像仓库（让 minikube 自动选择）

```powershell
# 只使用镜像国家，让 minikube 自动选择镜像源
minikube start --image-mirror-country='cn' --cpus=4 --memory=8192mb
```

### 方案 4：使用其他镜像源

```powershell
# 尝试使用腾讯云
minikube start --image-repository='ccr.ccs.tencentyun.com/google_containers' --cpus=4 --memory=8192mb

# 或使用网易云
minikube start --image-repository='hub-mirror.c.163.com/google_containers' --cpus=4 --memory=8192mb
```

### 方案 5：使用预下载的镜像（完全离线方案）

如果完全无法访问外网，可以从其他机器导入：

**步骤 1：在有网络的机器上**
```powershell
# 拉取镜像
docker pull gcr.io/k8s-minikube/kicbase:v0.0.48

# 导出为 tar 文件
docker save gcr.io/k8s-minikube/kicbase:v0.0.48 -o kicbase-v0.0.48.tar
```

**步骤 2：在本地机器上**
```powershell
# 导入镜像
docker load -i kicbase-v0.0.48.tar

# 重命名
docker tag gcr.io/k8s-minikube/kicbase:v0.0.48 registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48

# 启动
minikube start --image-mirror-country='cn' --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers'
```

### 方案 6：检查并使用本地已有镜像

```powershell
# 查看本地是否有 kicbase 相关镜像
docker images | findstr kicbase

# 如果有，查看完整标签
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}"

# 重命名现有镜像（假设镜像 ID 是 abc123）
docker tag <image-id> registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48
```

### 方案 7：解决 Kubernetes 二进制文件下载失败（404 错误）

如果 kicbase 镜像已成功拉取，但在下载 Kubernetes 二进制文件时出现 404 错误：

**问题原因**：阿里云镜像源可能没有对应版本的 Kubernetes 二进制文件（如 v1.34.0）。

**解决方案 7.1：不指定镜像仓库，让 minikube 自动选择**

```powershell
# 清理之前的尝试
minikube stop
minikube delete

# 只指定镜像国家，不指定镜像仓库
minikube start --image-mirror-country='cn' --cpus=4 --memory=8192mb
```

**解决方案 7.2：使用腾讯云镜像源**

```powershell
# 清理
minikube stop
minikube delete

# 使用腾讯云镜像源
minikube start `
  --image-repository='ccr.ccs.tencentyun.com/google_containers' `
  --cpus=4 `
  --memory=8192mb `
  --disk-size=50g
```

**解决方案 7.3：指定一个镜像源支持的 Kubernetes 版本**

```powershell
# 清理
minikube stop
minikube delete

# 指定一个较旧的稳定版本（通常镜像源会支持）
minikube start `
  --image-mirror-country='cn' `
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' `
  --kubernetes-version='v1.30.0' `
  --cpus=4 `
  --memory=8192mb `
  --disk-size=50g
```

**解决方案 7.4：使用代理下载官方源（如果有代理）**

```powershell
# 设置代理环境变量
$env:HTTP_PROXY="http://your-proxy:port"
$env:HTTPS_PROXY="http://your-proxy:port"

# 清理
minikube stop
minikube delete

# 不指定镜像仓库，使用官方源（通过代理）
minikube start --cpus=4 --memory=8192mb
```

**解决方案 7.5：手动下载 Kubernetes 二进制文件（高级）**

如果以上方案都不行，可以手动下载并放置到 minikube 缓存目录：

```powershell
# 1. 创建缓存目录
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.minikube\cache\linux\amd64\v1.34.0"

# 2. 下载 kubelet（需要代理或能访问外网）
# 从 https://dl.k8s.io/release/v1.34.0/bin/linux/amd64/kubelet 下载
# 保存到 $env:USERPROFILE\.minikube\cache\linux\amd64\v1.34.0\kubelet

# 3. 下载 kubelet.sha256
# 从 https://dl.k8s.io/release/v1.34.0/bin/linux/amd64/kubelet.sha256 下载
# 保存到 $env:USERPROFILE\.minikube\cache\linux\amd64\v1.34.0\kubelet.sha256

# 4. 重新启动 minikube
minikube start --image-mirror-country='cn' --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers'
```

## 推荐操作步骤

### 如果你有代理或能访问外网

```powershell
# 1. 清理
minikube stop
minikube delete

# 2. 拉取并重命名 kicbase
docker pull gcr.io/k8s-minikube/kicbase:v0.0.48
docker tag gcr.io/k8s-minikube/kicbase:v0.0.48 registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.48

# 3. 启动 minikube
minikube start `
  --image-mirror-country='cn' `
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' `
  --registry-mirror='https://docker.mirrors.ustc.edu.cn' `
  --cpus=4 `
  --memory=8192mb `
  --disk-size=50g
```

### 如果你没有代理

```powershell
# 1. 清理
minikube stop
minikube delete

# 2. 尝试不指定镜像仓库，让 minikube 自动选择
minikube start `
  --image-mirror-country='cn' `
  --cpus=4 `
  --memory=8192mb `
  --disk-size=50g

# 如果还是不行，尝试其他镜像源
minikube start `
  --image-repository='ccr.ccs.tencentyun.com/google_containers' `
  --cpus=4 `
  --memory=8192mb `
  --disk-size=50g
```

## 验证

启动成功后，验证：

```powershell
# 检查 minikube 状态
minikube status

# 检查节点
kubectl get nodes

# 检查镜像是否已拉取
minikube ssh -- docker images | findstr kicbase
```

## 其他有用的命令

```powershell
# 查看 minikube 配置
minikube config view

# 查看 minikube 日志（如果启动失败）
minikube logs

# 进入 minikube 虚拟机
minikube ssh

# 在 minikube 虚拟机中查看镜像
minikube ssh -- docker images
```

## 解决 Dashboard 启动问题（503 错误）

### 问题描述

运行 `minikube dashboard` 时出现错误：
```
❌ 因 SVC_URL_TIMEOUT 错误而退出：http://127.0.0.1:55399/api/v1/namespaces/kubernetes-dashboard/services/http:kubernetes-dashboard:/proxy/ 不可访问：Temporary Error: unexpected response code: 503
```

### 解决方案

#### 方案 1：检查并等待 Dashboard Pod 就绪（最常见）

```powershell
# 1. 检查 dashboard pod 状态
kubectl get pods -n kubernetes-dashboard

# 2. 如果 pod 还在启动中，等待其就绪
kubectl wait --for=condition=ready pod -l k8s-app=kubernetes-dashboard -n kubernetes-dashboard --timeout=300s

# 3. 检查 dashboard service
kubectl get svc -n kubernetes-dashboard

# 4. 重新启动 dashboard
minikube dashboard
```

#### 方案 2：删除并重新创建 Dashboard

```powershell
# 1. 删除 dashboard addon
minikube addons disable dashboard

# 2. 等待删除完成
Start-Sleep -Seconds 10

# 3. 重新启用 dashboard
minikube addons enable dashboard

# 4. 等待 dashboard 就绪
kubectl wait --for=condition=ready pod -l k8s-app=kubernetes-dashboard -n kubernetes-dashboard --timeout=300s

# 5. 启动 dashboard
minikube dashboard
```

#### 方案 3：启用 metrics-server（推荐）

Dashboard 的某些功能需要 metrics-server：

```powershell
# 启用 metrics-server
minikube addons enable metrics-server

# 等待 metrics-server 就绪
kubectl wait --for=condition=ready pod -l k8s-app=metrics-server -n kube-system --timeout=300s

# 重新启动 dashboard
minikube dashboard
```

#### 方案 4：检查 Dashboard Pod 日志

如果以上方案都不行，检查 pod 日志：

```powershell
# 查看 dashboard pod 名称
kubectl get pods -n kubernetes-dashboard

# 查看 pod 日志（替换 <pod-name> 为实际 pod 名称）
kubectl logs -n kubernetes-dashboard <pod-name>

# 查看 pod 详细信息
kubectl describe pod -n kubernetes-dashboard <pod-name>
```

#### 方案 5：手动访问 Dashboard（绕过代理）

如果代理有问题，可以手动创建 service 并访问：

```powershell
# 1. 检查 dashboard service 是否存在
kubectl get svc -n kubernetes-dashboard

# 2. 如果不存在，创建 NodePort service
kubectl expose deployment kubernetes-dashboard -n kubernetes-dashboard --type=NodePort --name=kubernetes-dashboard-nodeport

# 3. 获取 NodePort
kubectl get svc kubernetes-dashboard-nodeport -n kubernetes-dashboard

# 4. 获取 minikube IP
minikube ip

# 5. 访问 dashboard（使用 minikube IP 和 NodePort）
# 例如：http://<minikube-ip>:<nodeport>
```

#### 方案 6：使用 kubectl proxy（替代方案）

```powershell
# 1. 启动 kubectl proxy（在后台）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "kubectl proxy --port=8001"

# 2. 等待几秒让 proxy 启动
Start-Sleep -Seconds 5

# 3. 访问 dashboard
# http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/http:kubernetes-dashboard:/proxy/
```

#### 方案 7：完全重置 Dashboard

如果以上方案都不行，完全重置：

```powershell
# 1. 删除 dashboard addon
minikube addons disable dashboard

# 2. 删除 dashboard 命名空间（如果存在）
kubectl delete namespace kubernetes-dashboard

# 3. 等待删除完成
Start-Sleep -Seconds 10

# 4. 重新启用 dashboard
minikube addons enable dashboard

# 5. 等待 dashboard 就绪
kubectl wait --for=condition=ready pod -l k8s-app=kubernetes-dashboard -n kubernetes-dashboard --timeout=300s

# 6. 启动 dashboard
minikube dashboard
```

### 推荐操作步骤

```powershell
# 1. 启用 metrics-server（推荐）
minikube addons enable metrics-server

# 2. 检查 dashboard pod 状态
kubectl get pods -n kubernetes-dashboard

# 3. 等待 dashboard pod 就绪
kubectl wait --for=condition=ready pod -l k8s-app=kubernetes-dashboard -n kubernetes-dashboard --timeout=300s

# 4. 启动 dashboard
minikube dashboard
```

### 解决 ImagePullBackOff 错误（镜像拉取失败）

如果 pod 状态显示 `ImagePullBackOff`，说明无法拉取 Dashboard 镜像。

#### 方案 1：手动拉取并导入镜像（推荐）

```powershell
# 1. 查看需要拉取的镜像
kubectl describe pod -n kubernetes-dashboard kubernetes-dashboard-855c9754f9-ctznx | Select-String "Image:"

# 2. 手动拉取镜像（如果有代理或能访问外网）
docker pull docker.io/kubernetesui/dashboard:v2.7.0
docker pull docker.io/kubernetesui/metrics-scraper:v1.0.8

# 3. 将镜像导入到 minikube
minikube image load docker.io/kubernetesui/dashboard:v2.7.0
minikube image load docker.io/kubernetesui/metrics-scraper:v1.0.8

# 4. 验证镜像是否已导入到 minikube
minikube ssh -- docker images | findstr dashboard
minikube ssh -- docker images | findstr metrics-scraper

# 5. 如果镜像已导入但仍然失败，设置镜像拉取策略为 IfNotPresent
# PowerShell 中需要使用双引号并转义内部双引号
kubectl patch deployment kubernetes-dashboard -n kubernetes-dashboard -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"kubernetes-dashboard\",\"imagePullPolicy\":\"IfNotPresent\"}]}}}}"
kubectl patch deployment dashboard-metrics-scraper -n kubernetes-dashboard -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"dashboard-metrics-scraper\",\"imagePullPolicy\":\"IfNotPresent\"}]}}}}"

# 6. 删除失败的 pod，让它们重新创建
kubectl delete pod -n kubernetes-dashboard --all

# 7. 等待 pod 重新创建并检查状态
kubectl get pods -n kubernetes-dashboard -w
```

**注意**：如果 `minikube image load` 后仍然失败，可能需要直接在 minikube 内部拉取镜像（见方案 1.1）。

#### 方案 1.1：直接在 minikube 内部拉取镜像（如果方案 1 失败）

如果 `minikube image load` 后仍然失败，直接在 minikube 内部拉取：

```powershell
# 1. 进入 minikube 虚拟机
minikube ssh

# 2. 在 minikube 内部拉取镜像（需要代理或能访问外网）
docker pull docker.io/kubernetesui/dashboard:v2.7.0
docker pull docker.io/kubernetesui/metrics-scraper:v1.0.8

# 3. 验证镜像已拉取
docker images | grep dashboard
docker images | grep metrics-scraper

# 4. 退出 minikube
exit

# 5. 设置镜像拉取策略为 IfNotPresent
# PowerShell 中需要使用双引号并转义内部双引号
kubectl patch deployment kubernetes-dashboard -n kubernetes-dashboard -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"kubernetes-dashboard\",\"imagePullPolicy\":\"IfNotPresent\"}]}}}}"
kubectl patch deployment dashboard-metrics-scraper -n kubernetes-dashboard -p "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"dashboard-metrics-scraper\",\"imagePullPolicy\":\"IfNotPresent\"}]}}}}"

# 6. 删除失败的 pod
kubectl delete pod -n kubernetes-dashboard --all

# 7. 检查状态
kubectl get pods -n kubernetes-dashboard
```

#### 方案 2：配置镜像代理（如果有代理）

```powershell
# 1. 在 minikube 中配置 Docker 镜像代理
minikube ssh "sudo mkdir -p /etc/docker"
minikube ssh "echo '{\"registry-mirrors\": [\"https://docker.mirrors.ustc.edu.cn\"]}' | sudo tee /etc/docker/daemon.json"
minikube ssh "sudo systemctl restart docker"

# 2. 删除失败的 pod
kubectl delete pod -n kubernetes-dashboard --all

# 3. 等待 pod 重新创建
kubectl get pods -n kubernetes-dashboard -w
```

#### 方案 3：使用国内镜像源

```powershell
# 1. 从国内镜像源拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetesui-dashboard:v2.7.0
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetesui-metrics-scraper:v1.0.8

# 2. 重命名镜像
docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetesui-dashboard:v2.7.0 docker.io/kubernetesui/dashboard:v2.7.0
docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetesui-metrics-scraper:v1.0.8 docker.io/kubernetesui/metrics-scraper:v1.0.8

# 3. 导入到 minikube
minikube image load docker.io/kubernetesui/dashboard:v2.7.0
minikube image load docker.io/kubernetesui/metrics-scraper:v1.0.8

# 4. 删除失败的 pod
kubectl delete pod -n kubernetes-dashboard --all

# 5. 等待 pod 重新创建
kubectl get pods -n kubernetes-dashboard -w
```

#### 方案 4：修改 Deployment 使用国内镜像

```powershell
# 1. 编辑 dashboard deployment
kubectl edit deployment kubernetes-dashboard -n kubernetes-dashboard

# 2. 将镜像地址改为国内镜像源（如果方案 1-3 都不行）
# 将 image: docker.io/kubernetesui/dashboard:v2.7.0
# 改为 image: registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetesui-dashboard:v2.7.0

# 3. 同样编辑 metrics-scraper deployment
kubectl edit deployment dashboard-metrics-scraper -n kubernetes-dashboard

# 4. 保存后，pod 会自动重新创建
kubectl get pods -n kubernetes-dashboard -w
```

#### 方案 5：完全重置 Dashboard（最简单）

```powershell
# 1. 删除 dashboard addon
minikube addons disable dashboard

# 2. 删除命名空间（清理所有资源）
kubectl delete namespace kubernetes-dashboard

# 3. 等待清理完成
Start-Sleep -Seconds 10

# 4. 先手动拉取镜像（如果有代理）
docker pull docker.io/kubernetesui/dashboard:v2.7.0
docker pull docker.io/kubernetesui/metrics-scraper:v1.0.8

# 5. 导入到 minikube
minikube image load docker.io/kubernetesui/dashboard:v2.7.0
minikube image load docker.io/kubernetesui/metrics-scraper:v1.0.8

# 6. 重新启用 dashboard
minikube addons enable dashboard

# 7. 等待 dashboard 就绪
kubectl wait --for=condition=ready pod -l k8s-app=kubernetes-dashboard -n kubernetes-dashboard --timeout=300s

# 8. 启动 dashboard
minikube dashboard
```

### 常见问题排查

1. **Pod 一直处于 Pending 状态**
   ```powershell
   # 检查节点资源
   kubectl describe nodes
   
   # 检查 pod 事件
   kubectl describe pod -n kubernetes-dashboard <pod-name>
   ```

2. **Pod 一直处于 ImagePullBackOff 状态**
   ```powershell
   # 查看详细的错误信息
   kubectl describe pod -n kubernetes-dashboard <pod-name>
   
   # 查看 pod 日志
   kubectl logs -n kubernetes-dashboard <pod-name>
   
   # 检查镜像是否存在
   minikube ssh -- docker images | findstr dashboard
   ```

3. **Service 无法访问**
   ```powershell
   # 检查 service endpoints
   kubectl get endpoints -n kubernetes-dashboard
   
   # 如果 endpoints 为空，说明 pod 没有正确注册
   ```

