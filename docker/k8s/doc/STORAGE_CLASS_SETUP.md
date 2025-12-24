# 本地路径存储类配置指南

本指南介绍如何在 Kubernetes 集群中配置本地路径存储类（local-path-provisioner），用于提供基于节点本地文件系统的持久化存储。

## 方案选择

### 方案 1：Local Path Provisioner（推荐）

**优点：**
- 动态创建 PV，无需手动管理
- 支持 ReadWriteOnce (RWO)
- 适合单节点或开发环境
- 配置简单，开箱即用
- 数据存储在物理机的本地路径，性能好

**缺点：**
- 不支持 ReadWriteMany (RWX)
- 多节点环境中，Pod 必须调度到有数据的节点
- 多节点环境中，节点故障会导致数据无法访问（数据仍在原节点，但 Pod 无法访问）
- 单节点环境（如 Docker Desktop）中，数据相对安全，但仍需注意备份

**重要说明：**
- **节点 = 物理机/虚拟机**，不是容器
- 数据确实存储在物理机的本地路径（如 `/opt/local-path-provisioner/`）
- 在 Docker Desktop 的 Kubernetes 中，通常只有一个节点（您的物理机），所以数据不会因为节点切换而丢失
- 但在多节点集群中，如果 Pod 被调度到其他节点，就无法访问原节点的数据

**详细说明请参考：** `LOCAL_STORAGE_EXPLANATION.md`

### 方案 2：HostPath（简单但不推荐）

**优点：**
- 配置最简单
- 无需额外组件

**缺点：**
- 需要手动创建目录
- 不支持动态供应
- 安全性较低
- 不适合生产环境

### 方案 3：NFS（支持 RWX）

如果需要多个 Pod 共享存储（ReadWriteMany），建议使用 NFS。

## 安装 Local Path Provisioner

### 步骤 1：安装 Local Path Provisioner

```bash
# 应用配置
kubectl apply -f storage-class-local-path.yaml

# 等待部署完成
kubectl wait --for=condition=available --timeout=300s deployment/local-path-provisioner -n lcagentns-sys

# 验证安装
kubectl get pods -n lcagentns-sys
kubectl get storageclass
```

### 步骤 2：自定义存储路径（可选）

编辑 `storage-class-local-path.yaml` 中的 `config.json`，修改存储路径：

```yaml
data:
  config.json: |-
    {
        "nodePathMap":[
        {
            "node":"DEFAULT_PATH_FOR_NON_LISTED_NODES",
            "paths":["/data/k8s-storage"]  # 修改为您想要的路径
        }
        ]
    }
```

然后重新应用：

```bash
kubectl apply -f storage-class-local-path.yaml
```

### 步骤 3：验证 StorageClass

```bash
# 查看 StorageClass
kubectl get storageclass

# 应该看到 local-path 并且标记为 default
# NAME         PROVISIONER       RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
# local-path   rancher.io/local-path   Delete        WaitForFirstConsumer   false                  1m
```

## 配置 PVC 使用本地路径存储

### 方法 1：使用默认存储类（推荐）

如果 `local-path` 被设置为默认存储类，PVC 会自动使用它，无需指定 `storageClassName`：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
  namespace: lcagentns-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  # 不指定 storageClassName，使用默认存储类
```

### 方法 2：显式指定存储类

编辑 `pvc.yaml`，为每个 PVC 添加 `storageClassName`：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: lcagent-storage
  namespace: lcagentns-app
spec:
  accessModes:
    - ReadWriteOnce  # 注意：local-path 只支持 RWO，不支持 RWX
  resources:
    requests:
      storage: 100Gi
  storageClassName: local-path  # 指定使用 local-path
```

### 重要提示：ReadWriteMany vs ReadWriteOnce

**Local Path Provisioner 只支持 ReadWriteOnce (RWO)**，不支持 ReadWriteMany (RWX)。

如果您的 PVC 需要 `ReadWriteMany`（多个 Pod 共享），有以下选择：

1. **改为 ReadWriteOnce**：如果实际上只有一个 Pod 访问，可以改为 RWO
2. **使用 NFS**：安装 NFS 存储类，支持 RWX
3. **使用其他共享存储**：如 CephFS、GlusterFS 等

## 更新现有 PVC 配置

### 批量更新所有 PVC

编辑 `pvc.yaml`，为所有 PVC 添加 `storageClassName: local-path`：

```bash
# 使用 sed 批量添加（Linux/Mac）
sed -i 's/# storageClassName: ""/storageClassName: "local-path"/' pvc.yaml

# 或者手动编辑每个 PVC
```

### 针对不同访问模式的建议

根据 `pvc.yaml` 中的配置：

| PVC 名称 | 当前访问模式 | 建议 | 说明 |
|---------|------------|------|------|
| lcagent-storage | ReadWriteMany | 改为 ReadWriteOnce 或使用 NFS | 如果只有一个 Pod 使用，改为 RWO |
| lcagent-upload | ReadWriteMany | 改为 ReadWriteOnce 或使用 NFS | 如果只有一个 Pod 使用，改为 RWO |
| lcagent-share-data | ReadWriteMany | 改为 ReadWriteOnce 或使用 NFS | 模型存储，如果只有一个 Pod，改为 RWO |
| tidb-data | ReadWriteOnce | ✅ 可直接使用 | 数据库数据 |
| tikv-data | ReadWriteOnce | ✅ 可直接使用 | TiKV 数据 |
| pd-data | ReadWriteOnce | ✅ 可直接使用 | PD 数据 |
| redis-data | ReadWriteOnce | ✅ 可直接使用 | Redis 数据 |
| minio-data | ReadWriteOnce | ✅ 可直接使用 | MinIO 数据 |

## 完整配置示例

### 更新后的 pvc.yaml（使用 local-path）

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: lcagent-storage
  namespace: lcagentns-app
spec:
  accessModes:
    - ReadWriteOnce  # 从 ReadWriteMany 改为 ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: local-path  # 指定使用本地路径存储
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: lcagent-upload
  namespace: lcagentns-app
spec:
  accessModes:
    - ReadWriteOnce  # 从 ReadWriteMany 改为 ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: local-path
---
# ... 其他 PVC 类似配置
```

## 验证配置

### 创建测试 PVC

```bash
# 创建测试 PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
  namespace: lcagentns-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: local-path
EOF

# 查看 PVC 状态
kubectl get pvc test-pvc -n lcagentns-app

# 查看自动创建的 PV
kubectl get pv
```

### 测试 Pod 挂载

```bash
# 创建测试 Pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: lcagentns-app
spec:
  containers:
  - name: test
    image: busybox
    command: ['sh', '-c', 'echo "Hello from PVC" > /data/test.txt && sleep 3600']
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: test-pvc
EOF

# 检查 Pod 状态
kubectl get pod test-pod -n lcagentns-app

# 查看数据
kubectl exec test-pod -n lcagentns-app -- cat /data/test.txt

# 清理测试资源
kubectl delete pod test-pod -n lcagentns-app
kubectl delete pvc test-pvc -n lcagentns-app
```

## 故障排查

### PVC 一直处于 Pending 状态

```bash
# 查看 PVC 详情
kubectl describe pvc <pvc-name> -n lcagentns-app

# 检查 StorageClass
kubectl get storageclass local-path -o yaml

# 检查 local-path-provisioner Pod
kubectl get pods -n lcagentns-sys
kubectl logs -n lcagentns-sys deployment/local-path-provisioner
```

### 存储路径不存在

确保节点上存在存储路径，或修改 `storage-class-local-path.yaml` 中的路径配置。

### 权限问题

确保 local-path-provisioner 有权限在节点上创建目录。

## 生产环境建议

1. **数据备份**：
   - 单节点环境：定期备份重要数据到外部存储
   - 多节点环境：使用网络存储（NFS、CephFS、云存储等），避免数据绑定到特定节点
2. **使用 NFS**：如果需要多 Pod 共享，考虑使用 NFS 或其他网络存储
3. **监控存储使用**：监控节点磁盘使用情况，避免磁盘满
4. **节点选择**：在多节点环境中，使用 nodeSelector 或 nodeAffinity 确保 Pod 调度到有数据的节点
5. **理解数据位置**：
   - 数据存储在节点的本地路径（物理机/虚拟机）
   - 在 Docker Desktop 中，数据存储在 Docker Desktop 虚拟机的本地路径
   - 详细说明请参考 `LOCAL_STORAGE_EXPLANATION.md`

## 卸载

如果需要卸载 local-path-provisioner：

```bash
# 删除所有使用该存储类的 PVC（会删除数据！）
kubectl get pvc -A -o json | jq -r '.items[] | select(.spec.storageClassName=="local-path") | "\(.metadata.namespace)/\(.metadata.name)"' | xargs -I {} kubectl delete pvc {} -n {}

# 删除 StorageClass 和 Provisioner
kubectl delete -f storage-class-local-path.yaml
```

## 参考资源

- [Local Path Provisioner GitHub](https://github.com/rancher/local-path-provisioner)
- [Kubernetes Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

