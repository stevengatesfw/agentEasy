# Volume Binding 问题修复

## 问题描述

Pod 处于 `Pending` 状态，错误信息：
```
running PreBind plugin "VolumeBinding": binding volumes: context deadline exceeded
```

## 根本原因

`local-path-pvc` 使用了 `local-path` StorageClass，而 `local-path` StorageClass 的 `volumeBindingMode` 是 `WaitForFirstConsumer`，这导致：

1. `local-path-pvc` 需要等待 Pod 才能绑定
2. 但 helper-pod 需要 `local-path-pvc` 才能启动
3. 形成了循环依赖

## 解决方案

修改 `storage-class-local-path.yaml` 中的 `local-path-pvc`，使用 `hostpath` StorageClass 而不是 `local-path`：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-path-pvc
  namespace: lcagentns-sys
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: hostpath  # 改为 hostpath，避免循环依赖
  resources:
    requests:
      storage: 1Gi
```

## 修复步骤

1. 删除旧的 `local-path-pvc`：
   ```bash
   kubectl delete pvc local-path-pvc -n lcagentns-sys
   ```

2. 删除所有处于 Pending 状态的 helper-pod：
   ```bash
   kubectl delete pod -n lcagentns-sys --field-selector=status.phase=Pending
   ```

3. 重新应用配置：
   ```bash
   kubectl apply -f storage-class-local-path.yaml
   ```

4. 等待 PVC 绑定和 Pod 启动：
   ```bash
   kubectl get pvc -n lcagentns-sys
   kubectl get pods -n lcagentns-app
   ```

## 验证

修复后应该看到：
- ✅ `local-path-pvc` 状态为 `Bound`
- ✅ 应用 PVC（如 `lcagent-storage`）状态为 `Bound`
- ✅ Pod（如 `api`）状态为 `Running`

## 注意事项

- `local-path-pvc` 是 helper-pod 使用的临时存储，不需要使用 `local-path` StorageClass
- 使用 `hostpath` StorageClass 可以立即绑定，避免循环依赖
- 其他应用 PVC 仍然使用 `local-path` StorageClass，这是正确的

