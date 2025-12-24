# Local Path Provisioner 路径配置说明

## ⚠️ 重要：路径格式问题

### 问题

您配置的路径：
```json
"paths":["D:\dev\work\llm\code\agentEasy\docker\k8s\volumes"]
```

**这个配置是错误的**，原因如下：

1. **路径格式错误**：Kubernetes 节点运行的是 Linux 环境，必须使用 Linux 路径格式（正斜杠 `/`），不能使用 Windows 路径格式（反斜杠 `\`）

2. **路径不存在**：在 Kubernetes 节点（Linux 虚拟机）中，Windows 路径 `D:\dev\work\...` 不存在

## ✅ 正确的配置方式

### 方案 1：使用默认路径（推荐）

```json
{
    "nodePathMap":[
    {
        "node":"DEFAULT_PATH_FOR_NON_LISTED_NODES",
        "paths":["/opt/local-path-provisioner"]
    }
    ]
}
```

**优点：**
- 简单，开箱即用
- 路径在 Docker Desktop 虚拟机内部，自动管理
- 不需要手动映射 Windows 路径

**数据实际存储位置：**
- Windows: `C:\Users\<用户名>\AppData\Local\Docker\wsl\data\ext4.vhdx`（Docker Desktop 虚拟磁盘内）
- Linux/Mac: `~/Library/Containers/com.docker.docker/Data/vms/0/data/`（Docker Desktop 虚拟磁盘内）

### 方案 2：使用 Docker Desktop 的路径映射（高级）

如果您确实需要将数据存储在 Windows 主机的特定路径，需要：

1. **在 Docker Desktop 中配置路径共享**：
   - 打开 Docker Desktop
   - Settings → Resources → File Sharing
   - 添加 `D:\dev\work\llm\code` 到共享路径

2. **在 Kubernetes 节点中使用映射后的路径**：
   ```json
   {
       "nodePathMap":[
       {
           "node":"DEFAULT_PATH_FOR_NON_LISTED_NODES",
           "paths":["/mnt/wsl/docker-desktop-data/version-pack-data/community/docker/volumes"]
       }
       ]
   }
   ```

**注意**：Docker Desktop 的路径映射比较复杂，不推荐这种方式。

### 方案 3：使用相对路径（不推荐）

Local Path Provisioner 不支持相对路径，必须使用绝对路径。

## Docker Desktop 中的路径说明

### Docker Desktop 的架构

```
Windows 主机
┌─────────────────────────────────┐
│ D:\dev\work\llm\code\...        │ ← Windows 路径
└─────────────────────────────────┘
           ↓ (Docker Desktop 映射)
┌─────────────────────────────────┐
│ Linux 虚拟机（Kubernetes 节点）  │
│ /opt/local-path-provisioner/    │ ← Linux 路径
└─────────────────────────────────┘
```

### 路径映射关系

在 Docker Desktop 中：
- **Kubernetes 节点** = Linux 虚拟机
- **存储路径** = Linux 虚拟机内的路径（如 `/opt/local-path-provisioner/`）
- **实际数据** = 存储在 Docker Desktop 的虚拟磁盘文件中

### 访问数据的方式

#### 方式 1：通过 Kubernetes Pod

```bash
# 进入 Pod
kubectl exec -it <pod-name> -n lcagentns-app -- sh

# 查看挂载的存储
ls -la /app/storage
```

#### 方式 2：通过 Docker Desktop 终端

```bash
# 在 Docker Desktop 的 Linux 虚拟机中
docker run -it --rm -v /opt/local-path-provisioner:/data alpine sh
ls -la /data
```

#### 方式 3：通过 Windows 文件系统（需要额外配置）

如果需要从 Windows 直接访问数据，需要：
1. 配置 Docker Desktop 的共享路径
2. 使用 Docker volume 或 bind mount
3. 这超出了 Local Path Provisioner 的范围

## 推荐配置

### 标准配置（已更新）

```yaml
data:
  config.json: |-
    {
        "nodePathMap":[
        {
            "node":"DEFAULT_PATH_FOR_NON_LISTED_NODES",
            "paths":["/opt/local-path-provisioner"]
        }
        ]
    }
```

### 自定义路径（如果需要）

如果您想使用其他 Linux 路径，可以修改为：

```yaml
data:
  config.json: |-
    {
        "nodePathMap":[
        {
            "node":"DEFAULT_PATH_FOR_NON_LISTED_NODES",
            "paths":["/data/k8s-storage"]  # 使用 Linux 格式路径
        }
        ]
    }
```

**注意**：
- 必须使用 Linux 路径格式（正斜杠 `/`）
- 路径必须在 Kubernetes 节点（Linux 虚拟机）中存在或可创建
- 确保 local-path-provisioner 有权限在该路径创建目录

## 验证配置

### 1. 应用配置

```bash
kubectl apply -f storage-class-local-path.yaml
```

### 2. 检查配置

```bash
# 查看 ConfigMap
kubectl get configmap local-path-config -n lcagentns-sys -o yaml

# 查看实际路径（在 Pod 中）
kubectl exec -n lcagentns-sys deployment/local-path-provisioner -- ls -la /opt/local-path-provisioner
```

### 3. 测试 PVC

```bash
# 创建测试 PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
  namespace: lcagent
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: local-path
EOF

# 查看 PVC 和 PV
kubectl get pvc test-pvc -n lcagentns-app
kubectl get pv

# 查看 PV 详情，确认路径
kubectl describe pv <pv-name>
```

## 常见错误

### ❌ 错误 1：使用 Windows 路径格式

```json
"paths":["D:\dev\work\llm\code\agentEasy\docker\k8s\volumes"]  // 错误！
```

**错误原因**：Kubernetes 节点是 Linux 环境，不支持 Windows 路径格式

### ❌ 错误 2：使用相对路径

```json
"paths":["../volumes"]  // 错误！
```

**错误原因**：Local Path Provisioner 需要绝对路径

### ✅ 正确：使用 Linux 绝对路径

```json
"paths":["/opt/local-path-provisioner"]  // 正确！
```

## 总结

1. **必须使用 Linux 路径格式**（正斜杠 `/`）
2. **必须使用绝对路径**
3. **推荐使用默认路径** `/opt/local-path-provisioner`
4. **数据存储在 Docker Desktop 虚拟机的 Linux 文件系统中**
5. **如果需要从 Windows 访问，需要通过 Docker Desktop 的共享功能或 Pod 挂载**

