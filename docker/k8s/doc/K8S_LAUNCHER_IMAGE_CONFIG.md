# K8sLauncher 容器镜像配置方案

## 概述

K8sLauncher 创建推理服务时使用的容器镜像地址可以通过配置文件进行配置。本文档提供完整的配置方案。

## 当前实现

### 镜像配置优先级

K8sLauncher 在 `__init__` 方法中按以下优先级确定使用的镜像：

1. **构造函数参数 `image`**（最高优先级）
2. **配置文件中的 `container_image` 字段**
3. **默认值 `'lazyllm/lazyllm:k8s_launcher'`**

### 代码位置

```python
# agentEasy/back/LazyLLM/lazyllm/launcher/k8s.py (第 983-986 行)

config_data = self._read_config_file(lazyllm.config['k8s_config_path']) if lazyllm.config['k8s_config_path'] \
    else {}
self.image = image if image else config_data.get('container_image', 'lazyllm/lazyllm:k8s_launcher')
```

### 配置文件格式

配置文件必须是 **YAML 格式**，且路径必须是**绝对路径**。

## 配置方案

### 方案 1：通过环境变量指定配置文件路径（推荐）

#### 1.1 创建配置文件

创建 K8s 配置文件，例如：`agentEasy/docker/k8s/config/k8s-launcher-config.yaml`

```yaml
# K8sLauncher 配置文件
# 用于配置 K8sLauncher 创建推理服务时的容器镜像和其他参数

# 容器镜像地址（推理服务使用的基础镜像）
container_image: "lcagent-core:7.0-1"
# 或者使用镜像仓库地址：
# container_image: "registry.cn-hangzhou.aliyuncs.com/your-namespace/lcagent-core:7.0-1"

# Kubernetes 配置路径（可选）
kube_config_path: "~/.kube/config"

# 命名空间（可选）
namespace: "lcagentns-app"

# Service 类型（可选）
svc_type: "LoadBalancer"  # 可选值: LoadBalancer, NodePort, ClusterIP

# 存储卷配置（可选）
volume:
  - name: share-data
    mount_path: "/mnt/lustre/share_data"
    persistent_volume_claim:
      claim_name: "share-data-pvc"

# 资源限制配置（可选）
resource:
  requests:
    nvidia.com/gpu: "1"
    memory: "16Gi"
    cpu: "2"
  limits:
    nvidia.com/gpu: "1"
    memory: "32Gi"
    cpu: "4"

# Gateway 配置（可选）
on_gateway: false
gateway_name: "lazyllm-gateway"
gateway_class_name: "istio"
host: null
path: "/generate"
```

#### 1.2 在 K8s 中通过 ConfigMap 挂载配置文件

创建 ConfigMap 来存储配置文件：

```yaml
# agentEasy/docker/k8s/yaml/k8s-launcher-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k8s-launcher-config
  namespace: lcagentns-app
data:
  k8s-launcher-config.yaml: |
    # K8sLauncher 配置文件
    container_image: "lcagent-core:7.0-1"
    namespace: "lcagentns-app"
    svc_type: "LoadBalancer"
    volume:
      - name: share-data
        mount_path: "/mnt/lustre/share_data"
        persistent_volume_claim:
          claim_name: "share-data-pvc"
    resource:
      requests:
        nvidia.com/gpu: "1"
        memory: "16Gi"
        cpu: "2"
      limits:
        nvidia.com/gpu: "1"
        memory: "32Gi"
        cpu: "4"
```

#### 1.3 在 cloud-service Deployment 中挂载配置文件

修改 `agentEasy/docker/k8s/yaml/cloud-service.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloud-service
  namespace: lcagentns-app
spec:
  template:
    spec:
      containers:
      - name: cloud-service
        image: lcagent-core:7.0-1
        env:
        # 设置配置文件路径（容器内的绝对路径）
        - name: K8S_CONFIG_PATH
          value: "/app/config/k8s-launcher-config.yaml"
        # ... 其他环境变量 ...
        volumeMounts:
        - name: share-data
          mountPath: /mnt/lustre/share_data
        # 挂载配置文件
        - name: k8s-launcher-config
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: share-data
        persistentVolumeClaim:
          claimName: share-data-pvc
      # 添加配置文件卷
      - name: k8s-launcher-config
        configMap:
          name: k8s-launcher-config
```

### 方案 2：直接在 ConfigMap 中设置环境变量（简化版）

如果只需要配置镜像地址，可以直接在 `configmap.yaml` 中添加环境变量：

```yaml
# agentEasy/docker/k8s/yaml/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lcagent-config
  namespace: lcagentns-app
data:
  # ... 其他配置 ...
  
  # K8sLauncher 配置
  K8S_CONFIG_PATH: "/app/config/k8s-launcher-config.yaml"
  
  # 或者直接设置镜像（需要修改代码支持）
  # K8S_LAUNCHER_IMAGE: "lcagent-core:7.0-1"
```

**注意**：方案 2 需要修改代码以支持通过环境变量直接设置镜像，当前实现不支持。

### 方案 3：通过代码直接指定（开发/测试）

在创建 K8sLauncher 时直接传入镜像参数：

```python
from lazyllm.launcher import K8sLauncher

# 直接指定镜像
launcher = K8sLauncher(
    image="lcagent-core:7.0-1",
    namespace="lcagentns-app",
    # ... 其他参数
)
```

## 完整实施步骤

### 步骤 1：创建配置文件

```bash
# 创建配置目录
mkdir -p agentEasy/docker/k8s/config

# 创建配置文件
cat > agentEasy/docker/k8s/config/k8s-launcher-config.yaml <<EOF
container_image: "lcagent-core:7.0-1"
namespace: "lcagentns-app"
svc_type: "LoadBalancer"
volume:
  - name: share-data
    mount_path: "/mnt/lustre/share_data"
    persistent_volume_claim:
      claim_name: "share-data-pvc"
resource:
  requests:
    nvidia.com/gpu: "1"
    memory: "16Gi"
    cpu: "2"
  limits:
    nvidia.com/gpu: "1"
    memory: "32Gi"
    cpu: "4"
EOF
```

### 步骤 2：创建 ConfigMap

```bash
# 创建 ConfigMap
kubectl create configmap k8s-launcher-config \
  --from-file=k8s-launcher-config.yaml=agentEasy/docker/k8s/config/k8s-launcher-config.yaml \
  -n lcagentns-app

# 或者使用 YAML 文件
kubectl apply -f agentEasy/docker/k8s/yaml/k8s-launcher-configmap.yaml
```

### 步骤 3：修改 cloud-service Deployment

在 `cloud-service.yaml` 中添加：

```yaml
spec:
  template:
    spec:
      containers:
      - name: cloud-service
        env:
        - name: K8S_CONFIG_PATH
          value: "/app/config/k8s-launcher-config.yaml"
        volumeMounts:
        - name: k8s-launcher-config
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: k8s-launcher-config
        configMap:
          name: k8s-launcher-config
```

### 步骤 4：应用配置

```bash
# 应用 ConfigMap
kubectl apply -f agentEasy/docker/k8s/yaml/k8s-launcher-configmap.yaml

# 更新 cloud-service
kubectl apply -f agentEasy/docker/k8s/yaml/cloud-service.yaml

# 重启 cloud-service 以加载新配置
kubectl rollout restart deployment/cloud-service -n lcagentns-app
```

## 配置文件字段说明

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `container_image` | string | 否 | `lazyllm/lazyllm:k8s_launcher` | 推理服务使用的容器镜像 |
| `kube_config_path` | string | 否 | `~/.kube/config` | Kubernetes 配置文件路径 |
| `namespace` | string | 否 | `default` | Kubernetes 命名空间 |
| `svc_type` | string | 否 | `LoadBalancer` | Service 类型：LoadBalancer/NodePort/ClusterIP |
| `volume` | array | 否 | `[]` | 存储卷配置列表 |
| `resource` | object | 否 | `{}` | 资源请求和限制配置 |
| `on_gateway` | boolean | 否 | `false` | 是否启用 Gateway |
| `gateway_name` | string | 否 | `lazyllm-gateway` | Gateway 名称 |
| `gateway_class_name` | string | 否 | `istio` | Gateway 类名 |
| `host` | string | 否 | `null` | HTTP 主机名 |
| `path` | string | 否 | `/generate` | HTTP 路径 |

## 验证配置

### 1. 检查配置文件是否挂载

```bash
# 进入 cloud-service Pod
kubectl exec -it deployment/cloud-service -n lcagentns-app -- sh

# 检查配置文件是否存在
ls -la /app/config/k8s-launcher-config.yaml

# 查看配置文件内容
cat /app/config/k8s-launcher-config.yaml
```

### 2. 检查环境变量

```bash
# 检查环境变量
kubectl exec deployment/cloud-service -n lcagentns-app -- env | grep K8S_CONFIG_PATH
```

### 3. 测试创建推理服务

创建一个测试推理服务，检查是否使用了配置的镜像：

```bash
# 查看创建的 Deployment
kubectl get deployments -n lcagentns-app

# 查看特定 Deployment 的镜像
kubectl get deployment <deployment-name> -n lcagentns-app -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## 常见问题

### Q1: 配置文件路径必须是绝对路径吗？

**A**: 是的。代码中有断言：
```python
assert os.path.isabs(file_path), 'Resource config file path must be an absolute path.'
```

### Q2: 可以在运行时修改配置文件吗？

**A**: 可以。修改 ConfigMap 后，需要重启 cloud-service Pod 以重新加载配置：
```bash
kubectl rollout restart deployment/cloud-service -n lcagentns-app
```

### Q3: 如何为不同的推理服务使用不同的镜像？

**A**: 当前实现所有服务使用同一个镜像。如果需要不同镜像，需要在代码中创建 K8sLauncher 时传入不同的 `image` 参数。

### Q4: 配置文件支持哪些格式？

**A**: 只支持 YAML 格式。配置文件会被 `yaml.safe_load()` 解析。

## 推荐配置

### 生产环境

```yaml
container_image: "registry.cn-hangzhou.aliyuncs.com/your-namespace/lcagent-core:7.0-1"
namespace: "lcagentns-app"
svc_type: "LoadBalancer"
resource:
  requests:
    nvidia.com/gpu: "1"
    memory: "16Gi"
    cpu: "2"
  limits:
    nvidia.com/gpu: "1"
    memory: "32Gi"
    cpu: "4"
```

### 开发/测试环境

```yaml
container_image: "lcagent-core:7.0-1"
namespace: "lcagentns-app"
svc_type: "NodePort"
resource:
  requests:
    nvidia.com/gpu: "1"
    memory: "8Gi"
    cpu: "1"
  limits:
    nvidia.com/gpu: "1"
    memory: "16Gi"
    cpu: "2"
```

## 总结

1. ✅ **K8sLauncher 已支持通过配置文件配置镜像**
2. ✅ **配置文件路径通过环境变量 `K8S_CONFIG_PATH` 设置**
3. ✅ **配置文件必须是 YAML 格式的绝对路径**
4. ✅ **推荐使用 ConfigMap 在 K8s 中管理配置文件**
5. ✅ **修改配置后需要重启 cloud-service 以生效**

## 下一步

如果需要实现以下功能，需要修改代码：

1. **支持通过环境变量直接设置镜像**（不通过配置文件）
2. **支持为不同服务使用不同镜像**（在配置文件中按服务类型配置）
3. **支持镜像拉取策略配置**（imagePullPolicy）
4. **支持镜像拉取密钥配置**（imagePullSecrets）


