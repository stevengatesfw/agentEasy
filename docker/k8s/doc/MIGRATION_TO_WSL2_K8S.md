# 迁移到 WSL2 + 原生 Kubernetes 或远程集群 - 工作量评估

## 📊 改动量评估

### 总体评估：**改动量较小（约 2-3 小时）**

当前 Kubernetes 配置已经比较标准化，主要改动集中在：
1. 环境准备（WSL2 + Kubernetes 安装）
2. GPU 支持配置（NVIDIA Container Toolkit）
3. 存储路径调整（可选）

---

## 🔍 当前配置分析

### ✅ 无需改动的部分（90%）

当前配置已经使用标准 Kubernetes 资源，**无需修改**：

1. **所有 YAML 文件**：
   - `namespace.yaml` - 标准 Namespace
   - `configmap.yaml` - 标准 ConfigMap
   - `secrets.yaml` - 标准 Secret
   - `pvc.yaml` - 标准 PVC（使用 StorageClass）
   - `backend.yaml`, `frontend.yaml`, `cloud-service.yaml` - 标准 Deployment/Service
   - `tidb.yaml`, `redis.yaml`, `minio.yaml` - 标准 StatefulSet/Deployment
   - `nginx.yaml` - 标准 Deployment/Service

2. **存储配置**：
   - 使用 `local-path` StorageClass（标准实现）
   - 使用 PVC（不依赖特定存储后端）

3. **网络配置**：
   - 使用标准 Service（ClusterIP/NodePort）
   - 不依赖 Docker Desktop 特定网络

### ⚠️ 需要改动的部分（10%）

#### 1. 环境准备（一次性，约 1-2 小时）

**WSL2 + 原生 Kubernetes 方案**：

```bash
# 1. 安装 WSL2（如果未安装）
wsl --install

# 2. 安装 Kubernetes（kubeadm/k3s/minikube）
# 选项 A: 使用 k3s（最简单）
curl -sfL https://get.k3s.io | sh -

# 选项 B: 使用 minikube
minikube start --driver=docker

# 选项 C: 使用 kubeadm（生产环境）
# 需要更多配置，但更灵活
```

**远程集群方案**：
- 连接到现有集群：`kubectl config use-context <cluster-name>`
- 无需额外安装

#### 2. GPU 支持配置（一次性，约 30 分钟）

**WSL2 + 原生 Kubernetes**：

```bash
# 1. 在 WSL2 中安装 NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# 2. 配置 containerd（如果使用 containerd）
sudo nvidia-ctk runtime configure --runtime=containerd
sudo systemctl restart containerd

# 3. 部署 NVIDIA Device Plugin
kubectl apply -f nvidia-device-plugin.yaml

# 4. 验证 GPU
kubectl get nodes -o jsonpath='{.items[0].status.capacity.nvidia\.com/gpu}'
# 应该输出: 1
```

**远程集群**：
- 通常已配置好 GPU 支持
- 只需部署 Device Plugin（如果未部署）

#### 3. 存储路径调整（可选，约 15 分钟）

**当前配置**：
- `local-path-provisioner` 使用 `/opt/local-path-provisioner/`（默认路径）
- 在 WSL2 中可能需要调整

**如果需要自定义路径**：

修改 `storage-class-local-path.yaml` 中的 `config.json`：

```yaml
data:
  config.json: |-
    {
      "nodePathMap":[
        {
          "node":"DEFAULT_PATH_FOR_NON_LISTED_NODES",
          "paths":["/mnt/wsl/local-path-provisioner"]  # 改为 WSL2 路径
        }
      ]
    }
```

**或者使用 WSL2 的 Windows 路径映射**：

```yaml
"paths":["/mnt/c/local-path-provisioner"]  # 映射到 Windows C 盘
```

#### 4. 脚本调整（可选，约 10 分钟）

**start.ps1 / start.sh**：

当前脚本中有 Docker Desktop 的提示，可以改为通用提示：

```powershell
# 修改前
Write-Host "   1. Docker Desktop 的 Kubernetes 已启用" -ForegroundColor Yellow

# 修改后
Write-Host "   1. Kubernetes 集群已就绪" -ForegroundColor Yellow
```

---

## 📋 迁移步骤

### 方案 A：WSL2 + k3s（推荐，最简单）

#### 步骤 1：准备 WSL2 环境（30 分钟）

```bash
# 1. 确保 WSL2 已安装
wsl --list --verbose

# 2. 进入 WSL2
wsl

# 3. 安装 Docker（如果未安装）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 4. 安装 k3s
curl -sfL https://get.k3s.io | sh -

# 5. 配置 kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config

# 6. 在 Windows 中配置 kubectl（可选）
# 将 ~/.kube/config 复制到 Windows: %USERPROFILE%\.kube\config
```

#### 步骤 2：配置 GPU 支持（30 分钟）

```bash
# 在 WSL2 中执行
# 1. 安装 NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# 2. 配置 Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 3. 测试 GPU
docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi

# 4. 配置 k3s 使用 Docker（而不是 containerd）
# 编辑 /etc/rancher/k3s/config.yaml
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
docker: true
EOF

# 5. 重启 k3s
sudo systemctl restart k3s

# 6. 部署 NVIDIA Device Plugin
kubectl apply -f nvidia-device-plugin.yaml

# 7. 验证 GPU
kubectl get nodes -o jsonpath='{.items[0].status.capacity.nvidia\.com/gpu}'
```

#### 步骤 3：部署服务（10 分钟）

```bash
# 在 WSL2 中或 Windows 中（如果已配置 kubectl）
cd agentEasy/docker/k8s
./start.sh  # 或 start.ps1
```

### 方案 B：远程 Kubernetes 集群

#### 步骤 1：连接集群（5 分钟）

```bash
# 1. 获取集群 kubeconfig
# 从集群管理员获取或从云平台下载

# 2. 配置 kubectl
kubectl config use-context <cluster-name>

# 3. 验证连接
kubectl get nodes
```

#### 步骤 2：部署服务（10 分钟）

```bash
cd agentEasy/docker/k8s
./start.sh  # 或 start.ps1
```

**注意**：
- 远程集群通常已配置 GPU 支持
- 如果未配置，需要联系集群管理员部署 NVIDIA Device Plugin
- 存储类可能需要调整（根据集群的 StorageClass）

---

## 🔧 具体改动清单

### 必须改动（约 30 分钟）

1. ✅ **环境准备**：安装 WSL2 + Kubernetes（或连接远程集群）
2. ✅ **GPU 配置**：安装 NVIDIA Container Toolkit + Device Plugin
3. ✅ **验证**：确保 GPU 可被识别

### 可选改动（约 15 分钟）

1. ⚠️ **存储路径**：如果使用自定义路径，修改 `storage-class-local-path.yaml`
2. ⚠️ **脚本提示**：更新 `start.ps1` / `start.sh` 中的提示信息

### 无需改动（0 分钟）

1. ✅ **所有 YAML 文件**：标准 Kubernetes 资源，无需修改
2. ✅ **应用配置**：ConfigMap、Secret、环境变量等
3. ✅ **服务配置**：Deployment、Service、PVC 等

---

## 📈 工作量对比

| 任务 | Docker Desktop K8s | WSL2 + k3s | 远程集群 |
|------|-------------------|------------|---------|
| **环境准备** | ✅ 已安装 | 1-2 小时 | 5 分钟 |
| **GPU 配置** | ❌ 不支持 | 30 分钟 | 通常已配置 |
| **YAML 修改** | 0 分钟 | 0 分钟 | 0 分钟 |
| **存储调整** | 0 分钟 | 15 分钟（可选） | 可能需调整 |
| **脚本调整** | 0 分钟 | 10 分钟（可选） | 10 分钟（可选） |
| **总计** | - | **2-3 小时** | **15-30 分钟** |

---

## 🎯 推荐方案

### 开发/测试环境
- **推荐**：WSL2 + k3s
- **原因**：简单、快速、本地可控
- **工作量**：2-3 小时（一次性）

### 生产环境
- **推荐**：远程 Kubernetes 集群（云平台或自建）
- **原因**：稳定、可扩展、已有 GPU 支持
- **工作量**：15-30 分钟（主要是连接和验证）

---

## ✅ 验证清单

迁移完成后，验证以下项目：

- [ ] `kubectl get nodes` 显示节点
- [ ] `kubectl get nodes -o jsonpath='{.items[0].status.capacity.nvidia\.com/gpu}'` 显示 GPU 数量
- [ ] `kubectl get pods -n lcagentns-app` 所有 Pod 运行正常
- [ ] `kubectl exec -n lcagentns-app deployment/cloud-service -- python -c "import torch; print(torch.cuda.is_available())"` 返回 `True`
- [ ] 可以创建推理服务并使用 GPU

---

## 📝 总结

**改动量：小（2-3 小时）**

- ✅ **90% 配置无需修改**：所有 YAML 文件都是标准 Kubernetes 资源
- ⚠️ **10% 需要配置**：主要是环境准备和 GPU 支持
- 🎯 **推荐方案**：WSL2 + k3s（开发）或远程集群（生产）

**关键点**：
1. 当前配置已经很标准化，迁移成本低
2. 主要工作是环境准备，不是代码修改
3. 一旦迁移完成，后续维护成本低

