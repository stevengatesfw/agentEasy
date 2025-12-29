# 本地存储详解：节点和数据持久性说明

## 什么是 Kubernetes 中的"节点"（Node）？

### 节点 = 物理机/虚拟机

在 Kubernetes 中，**"节点"（Node）指的是运行 Kubernetes 的物理机或虚拟机**，不是容器。

```
┌─────────────────────────────────────┐
│   Kubernetes 节点（物理机/虚拟机）    │
│  ┌───────────────────────────────┐  │
│  │  Kubernetes 运行时环境        │  │
│  │  ┌─────────────────────────┐ │  │
│  │  │ Pod（容器组）            │ │  │
│  │  │  ┌──────┐  ┌──────┐    │ │  │
│  │  │  │容器1 │  │容器2 │    │ │  │
│  │  │  └──────┘  └──────┘    │ │  │
│  │  └─────────────────────────┘ │  │
│  │  ┌─────────────────────────┐ │  │
│  │  │ 本地存储路径              │ │  │
│  │  │ /opt/local-path-provisioner│ │  │
│  │  └─────────────────────────┘ │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 在 Docker Desktop 中的情况

当您使用 Docker Desktop 的 Kubernetes 功能时：

- **节点** = 您的物理机（运行 Docker Desktop 的电脑）
- **存储路径** = 物理机上的本地目录（如 `/opt/local-path-provisioner` 或 Windows 上的对应路径）

## 为什么本地存储会"丢失"数据？

### 关键理解：数据存储在特定节点上

虽然数据确实存储在物理机的本地路径上，但有一个重要限制：

**数据只存在于创建它的那个节点上，不会自动复制到其他节点。**

### 数据丢失的场景

#### 场景 1：多节点集群

```
节点 A（物理机1）                   节点 B（物理机2）
┌─────────────────┐                ┌─────────────────┐
│ /data/pvc-1/    │                │ /data/pvc-1/    │
│ (有数据)        │                │ (不存在)        │
└─────────────────┘                └─────────────────┘
```

如果：
1. Pod 在节点 A 上创建了 PVC，数据存储在节点 A 的 `/opt/local-path-provisioner/pvc-xxx/`
2. 节点 A 故障或 Pod 被调度到节点 B
3. 节点 B 上没有这些数据（因为数据只在节点 A 上）
4. **结果：数据"丢失"**（实际上数据还在节点 A 上，但 Pod 无法访问）

#### 场景 2：单节点集群（Docker Desktop）

在 Docker Desktop 的 Kubernetes 中，通常只有一个节点（您的物理机），所以：

✅ **数据不会因为节点切换而丢失**（因为没有其他节点）

但是，数据仍然可能因为以下原因丢失：

1. **删除 PVC**：如果删除 PVC，数据会被删除
2. **删除节点上的目录**：如果手动删除物理机上的存储目录
3. **重新安装 Kubernetes**：如果重置 Docker Desktop 的 Kubernetes
4. **物理机故障**：如果物理机硬盘损坏

### 数据持久性对比

| 存储类型 | 数据位置 | 多节点支持 | 节点故障影响 | 适用场景 |
|---------|---------|-----------|-------------|---------|
| **Local Path** | 节点本地路径 | ❌ 不支持 | ⚠️ 节点故障会丢失 | 单节点、开发环境 |
| **NFS** | 网络文件系统 | ✅ 支持 | ✅ 不受影响 | 多节点、生产环境 |
| **云存储** | 云服务商存储 | ✅ 支持 | ✅ 高可用 | 生产环境 |

## Local Path Provisioner 的工作原理

### 数据存储位置

当您创建 PVC 时，Local Path Provisioner 会：

1. **在节点上创建目录**：
   ```
   节点上的实际路径：
   /opt/local-path-provisioner/pvc-<uuid>/
   ```

2. **创建符号链接或直接挂载**：
   ```
   Pod 中看到的路径：
   /app/storage  → 实际指向 → /opt/local-path-provisioner/pvc-xxx/
   ```

### 在 Docker Desktop 中的实际路径

**Windows 系统：**
```
Docker Desktop 虚拟机内的路径：
/opt/local-path-provisioner/pvc-xxx/

对应 Windows 路径（通过 Docker Desktop 映射）：
C:\Users\<用户名>\AppData\Local\Docker\wsl\data\ext4.vhdx
```

**Mac 系统：**
```
Docker Desktop 虚拟机内的路径：
/opt/local-path-provisioner/pvc-xxx/

对应 Mac 路径：
~/Library/Containers/com.docker.docker/Data/vms/0/data/
```

## 如何确保数据安全？

### 1. 单节点环境（Docker Desktop）

在单节点环境中，数据相对安全，因为：
- 数据存储在物理机的本地路径
- 只要不删除 PVC 或目录，数据就会保留
- Pod 重启不会丢失数据

**建议：**
- 定期备份重要数据
- 不要手动删除存储目录
- 使用版本控制管理重要配置

### 2. 多节点环境

在多节点环境中，需要：

**方案 A：使用 NFS 或其他网络存储**
```yaml
storageClassName: "nfs-client"  # 支持多节点共享
```

**方案 B：使用节点选择器确保 Pod 调度到有数据的节点**
```yaml
spec:
  nodeSelector:
    kubernetes.io/hostname: "node-with-data"
```

**方案 C：定期备份到外部存储**

### 3. 生产环境建议

1. **使用网络存储**：NFS、CephFS、云存储等
2. **定期备份**：即使使用本地存储，也要定期备份
3. **监控磁盘空间**：确保节点有足够的存储空间
4. **使用 StatefulSet**：对于有状态应用，使用 StatefulSet 而不是 Deployment

## 实际示例

### 查看数据实际存储位置

```bash
# 1. 查看 PVC 和 PV
kubectl get pvc -n lcagentns-app
kubectl get pv

# 2. 查看 PV 详情，找到实际路径
kubectl describe pv <pv-name>

# 3. 在节点上查看实际目录（需要访问节点）
# 如果是 Docker Desktop，可以通过 Docker Desktop 的终端访问
ls -la /opt/local-path-provisioner/
```

### 验证数据持久性

```bash
# 1. 创建测试 Pod 并写入数据
kubectl apply -f test-pod.yaml

# 2. 写入测试数据
kubectl exec test-pod -n lcagentns-app -- sh -c "echo 'test data' > /data/test.txt"

# 3. 删除 Pod
kubectl delete pod test-pod -n lcagentns-app

# 4. 重新创建 Pod（使用相同的 PVC）
kubectl apply -f test-pod.yaml

# 5. 验证数据是否还在
kubectl exec test-pod -n lcagentns-app -- cat /data/test.txt
# 应该能看到 "test data"
```

## 总结

### 关键点

1. **节点 = 物理机/虚拟机**，不是容器
2. **数据确实存储在物理机的本地路径**
3. **"丢失"的原因**：
   - 多节点环境中，Pod 可能被调度到没有数据的节点
   - 单节点环境中，数据相对安全，但仍需注意备份
4. **Docker Desktop 环境**：通常是单节点，数据存储在 Docker Desktop 虚拟机的本地路径

### 最佳实践

- **开发环境**：Local Path 足够，简单高效
- **生产环境**：使用网络存储（NFS、云存储等）
- **重要数据**：无论使用什么存储，都要定期备份

