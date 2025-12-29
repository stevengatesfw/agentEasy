# 端口冲突检查报告

## Docker Compose 使用的端口

| 服务 | 容器端口 | 主机端口 | 说明 |
|------|---------|---------|------|
| TiDB (db) | 4000 | 4000 | 数据库服务 |
| Nginx | 80 | 30382 | HTTP 服务 |
| Nginx | 443 | 30383 | HTTPS 服务 |
| Cloud Service | 31340 | 31340 | AMS 服务 |
| Cloud Service | 31341 | 31341 | FT 服务 |

## Kubernetes 默认端口

| 端口范围 | 用途 |
|---------|------|
| 6443 | Kubernetes API Server |
| 10250-10259 | kubelet, kube-proxy, scheduler, controller-manager |
| 30000-32767 | NodePort 服务端口范围 |

## 冲突分析

✅ **无端口冲突**

- Docker Compose 使用的端口（4000, 30382, 30383, 31340, 31341）都不在 Kubernetes 默认端口范围内
- 可以安全地同时运行 Docker Compose 和 Kubernetes

## 注意事项

1. **NodePort 服务**：如果 Kubernetes 中创建 NodePort 类型的服务，端口会在 30000-32767 范围内，不会与 Docker Compose 冲突
2. **LoadBalancer 服务**：如果使用 LoadBalancer 类型，端口由云提供商或 MetalLB 分配，需要单独检查
3. **Ingress**：如果使用 Ingress，通常使用 80/443 端口，但可以通过 NodePort 映射到其他端口（如 30382/30383）

## 建议

- 保持当前端口配置不变
- 在 Kubernetes 中使用 NodePort 或 LoadBalancer 时，避免使用 4000, 30382, 30383, 31340, 31341
- 如果需要在 Kubernetes 中暴露相同端口，使用不同的 NodePort 映射

