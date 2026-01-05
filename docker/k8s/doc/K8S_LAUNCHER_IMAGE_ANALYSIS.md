# K8s Launcher 容器镜像生成机制分析

## 核心结论

**K8s Launcher 并不为每个推理服务创建新的容器镜像**，而是：

1. **使用一个预构建的基础镜像**（包含 LazyLLM 运行环境）
2. **通过 Kubernetes Deployment 动态执行不同的推理命令**
3. **所有推理服务共享同一个基础镜像**

## 镜像配置机制

### 1. 镜像来源

在 `K8sLauncher.__init__` 中（第 974-986 行）：

```python
def __init__(self, kube_config_path=None, volume_configs=None, image=None, resource_config=None, ...):
    # 读取配置文件
    config_data = self._read_config_file(lazyllm.config['k8s_config_path']) if lazyllm.config['k8s_config_path'] else {}
    
    # 镜像优先级：
    # 1. 构造函数参数 image
    # 2. 配置文件中的 container_image
    # 3. 默认值 'lazyllm/lazyllm:k8s_launcher'
    self.image = image if image else config_data.get('container_image', 'lazyllm/lazyllm:k8s_launcher')
```

**镜像配置优先级**：
1. 构造函数传入的 `image` 参数（最高优先级）
2. 配置文件 `k8s_config_path` 中的 `container_image` 字段
3. 默认值 `'lazyllm/lazyllm:k8s_launcher'`

### 2. 容器创建

在 `Job._create_container_and_volumes` 中（第 71-93 行）：

```python
def _create_container_and_volumes(self, cmd, volume_configs=None):
    container = k8s.client.V1Container(
        name=self.deployment_name,
        image=self.image,  # 使用预配置的镜像
        image_pull_policy='IfNotPresent',
        command=['bash', '-c', cmd],  # 动态命令
        resources=k8s.client.V1ResourceRequirements(...),
        volume_mounts=[...]
    )
    return container, volumes
```

**关键点**：
- `image=self.image`：所有服务使用同一个基础镜像
- `command=['bash', '-c', cmd]`：通过命令参数执行不同的推理服务
- `image_pull_policy='IfNotPresent'`：如果本地已有镜像则不拉取

### 3. 命令包装

在 `Job._wrap_cmd` 中（第 49-69 行）：

```python
def _wrap_cmd(self, cmd):
    # 设置 PYTHONPATH
    pythonpath = os.getenv('PYTHONPATH', '')
    precmd = f'export PYTHONPATH={os.getcwd()}:{pythonpath}:$PYTHONPATH ...'
    
    # 激活 conda 环境（如果配置了）
    if lazyllm.config['k8s_env_name']:
        precmd = f'source activate {lazyllm.config["k8s_env_name"]} && ' + precmd
    
    # 导出 LAZYLLM 环境变量
    lazyllm_vars = {k: v for k, v in env_vars.items() if k.startswith('LAZYLLM')}
    if lazyllm_vars:
        precmd += ' && '.join(f'export {k}={v}' for k, v in lazyllm_vars.items()) + ' && '
    
    # 提取端口信息（推理服务）
    if self.launch_type == 'inference':
        port_match = re.search(r'--(?:open_)?port=(\d+)', cmd)
        if port_match:
            self.deployment_port = int(port_match.group(1))
    
    return precmd + ' ' + cmd
```

**命令结构**：
```
source activate <env> && 
export PYTHONPATH=... && 
export LAZYLLM_*=... && 
<实际的推理服务启动命令>
```

## 工作流程

### 1. 推理服务创建流程

```
用户请求创建推理服务
    ↓
InferServer.create_job()
    ↓
创建 TrainableModule 并配置部署方法
    ↓
使用 K8sLauncher 启动
    ↓
K8sLauncher.makejob(cmd)  # cmd 包含模型和框架信息
    ↓
Job._create_deployment()  # 创建 Kubernetes Deployment
    ↓
使用预构建的基础镜像 + 动态命令
    ↓
Kubernetes 启动 Pod 执行推理服务
```

### 2. 实际示例

假设创建一个 VLLM 推理服务：

**命令**（cmd）：
```bash
python -m vllm.entrypoints.openai.api_server \
  --model /mnt/lustre/share_data/models/qwen2.5-7b \
  --port 8080 \
  --tensor-parallel-size 1
```

**容器配置**：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deployment-abc12345
spec:
  template:
    spec:
      containers:
      - name: deployment-abc12345
        image: lazyllm/lazyllm:k8s_launcher  # 预构建的基础镜像
        imagePullPolicy: IfNotPresent
        command: ['bash', '-c', '''
          source activate lazyllm && 
          export PYTHONPATH=/app:$PYTHONPATH && 
          export LAZYLLM_MODEL_CACHE_DIR=/mnt/lustre/share_data/models && 
          python -m vllm.entrypoints.openai.api_server \
            --model /mnt/lustre/share_data/models/qwen2.5-7b \
            --port 8080 \
            --tensor-parallel-size 1
        ''']
        resources:
          requests:
            nvidia.com/gpu: 1
            memory: 16Gi
            cpu: 2
```

## 基础镜像要求

### 1. 镜像内容

基础镜像（`lazyllm/lazyllm:k8s_launcher`）需要包含：

- **Python 环境**：Python 3.10+ 和 pip
- **LazyLLM 框架**：完整的 LazyLLM 代码和依赖
- **推理框架**：VLLM、LMDeploy、LightLLM 等
- **CUDA 支持**：NVIDIA CUDA 运行时（如果使用 GPU）
- **系统依赖**：必要的系统库

### 2. 如何构建基础镜像

参考 `agentEasy/back/LazyLLM/Dockerfile`：

```dockerfile
FROM nvidia/cuda:12.8.0-devel-ubuntu22.04

# 安装 Python 和系统依赖
RUN apt-get update && apt-get install -y python3.10 python3-pip ...

# 安装 Python 依赖
COPY requirements.full.txt .
RUN pip install -r requirements.full.txt

# 复制 LazyLLM 源码
COPY . /app/
RUN pip install -e .

# 设置环境变量
ENV PYTHONPATH=/app
ENV LAZYLLM_DEFAULT_LAUNCHER=empty
```

**构建命令**：
```bash
cd agentEasy/back/LazyLLM
docker build -t lazyllm/lazyllm:k8s_launcher -f Dockerfile .
```

### 3. 推送到镜像仓库（可选）

```bash
# 标记镜像
docker tag lazyllm/lazyllm:k8s_launcher registry.cn-hangzhou.aliyuncs.com/your-namespace/lazyllm:k8s_launcher

# 推送到仓库
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/lazyllm:k8s_launcher
```

## 配置方式

### 1. 通过环境变量

```bash
export LAZYLLM_K8S_CONFIG_PATH=/path/to/k8s_config.yaml
```

### 2. 通过配置文件

创建 `k8s_config.yaml`：

```yaml
container_image: lazyllm/lazyllm:k8s_launcher  # 或 registry.cn-hangzhou.aliyuncs.com/your-namespace/lazyllm:k8s_launcher
namespace: default
svc_type: LoadBalancer
on_gateway: false
volume:
  - name: model-storage
    nfs_server: 10.0.0.1
    nfs_path: /mnt/nfs/models
    mount_path: /mnt/lustre/share_data/models
resource:
  requests:
    cpu: 2
    memory: 16Gi
```

### 3. 通过代码

```python
launcher = lazyllm.launcher.K8sLauncher(
    image='lazyllm/lazyllm:k8s_launcher',
    namespace='lazyllm',
    ngpus=1,
    resource_config={
        'requests': {
            'nvidia.com/gpu': 1,
            'memory': '16Gi',
            'cpu': '2'
        }
    }
)
```

## 优势与限制

### 优势

1. **快速启动**：不需要为每个服务构建镜像，直接使用基础镜像
2. **资源节省**：所有服务共享同一个镜像，节省存储空间
3. **灵活配置**：通过命令参数动态配置不同的模型和框架
4. **易于更新**：更新基础镜像即可影响所有服务

### 限制

1. **镜像体积大**：基础镜像需要包含所有可能的依赖
2. **启动时间**：首次拉取镜像可能需要较长时间
3. **版本管理**：所有服务使用相同的基础镜像版本

## 总结

**K8s Launcher 的镜像生成机制**：

1. ✅ **不生成新镜像**：所有推理服务使用同一个预构建的基础镜像
2. ✅ **动态命令执行**：通过 Kubernetes Deployment 的命令参数执行不同的推理服务
3. ✅ **配置灵活**：可以通过配置文件或代码参数指定镜像
4. ✅ **资源共享**：所有服务共享基础镜像，节省存储和构建时间

**关键文件**：
- `agentEasy/back/LazyLLM/lazyllm/launcher/k8s.py`：K8s Launcher 实现
- `agentEasy/back/LazyLLM/Dockerfile`：基础镜像构建文件


