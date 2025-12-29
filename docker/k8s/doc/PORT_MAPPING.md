# 端口映射说明

## Docker Compose 和 Kubernetes 端口对比

当 Docker Compose 和 Kubernetes 同时运行时，它们使用不同的端口以避免冲突。

### Docker Compose 端口

| 服务 | 容器端口 | 主机端口 | 说明 |
|------|---------|---------|------|
| Nginx HTTP | 80 | **30382** | 前端 HTTP 访问 |
| Nginx HTTPS | 443 | **30383** | 前端 HTTPS 访问 |
| TiDB | 4000 | 4000 | 数据库服务 |
| Cloud Service AMS | 31340 | 31340 | AMS 服务 |
| Cloud Service FT | 31341 | 31341 | FT 服务 |

### Kubernetes 端口

| 服务 | 容器端口 | NodePort | 说明 |
|------|---------|---------|------|
| Nginx HTTP | 80 | **30386** | 前端 HTTP 访问 |
| Nginx HTTPS | 443 | **30387** | 前端 HTTPS 访问 |
| TiDB | 4000 | 自动分配 | 数据库服务（如需要外部访问） |
| Cloud Service AMS | 31340 | 自动分配 | AMS 服务（如需要外部访问） |
| Cloud Service FT | 31341 | 自动分配 | FT 服务（如需要外部访问） |

## 访问地址

### Docker Compose 部署
- HTTP: `http://localhost:30382`
- HTTPS: `https://localhost:30383`

### Kubernetes 部署
- HTTP: `http://<node-ip>:30386` 或 `http://localhost:30386`（如果在本机）
- HTTPS: `https://<node-ip>:30387` 或 `https://localhost:30387`（如果在本机）

### 同时运行两个部署
如果 Docker Compose 和 Kubernetes 同时运行，可以通过不同端口访问：
- Docker Compose: `http://localhost:30382`
- Kubernetes: `http://localhost:30386`

## 修改端口

### 修改 Docker Compose 端口

编辑 `docker-compose.yml`：

```yaml
nginx:
  ports:
    - "${PORT:-30382}:80"    # 修改 30382 为其他端口
    - "${SSL_PORT:-30383}:443"  # 修改 30383 为其他端口
```

### 修改 Kubernetes 端口

编辑 `k8s/nginx.yaml`：

```yaml
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
    name: http
    nodePort: 30386  # 修改为其他端口（30000-32767 范围内）
  - port: 443
    targetPort: 443
    name: https
    nodePort: 30387  # 修改为其他端口（30000-32767 范围内）
```

## 端口冲突检查

如果遇到端口冲突，检查端口占用：

```bash
# Windows
netstat -ano | findstr :30382
netstat -ano | findstr :30386

# Linux/Mac
lsof -i :30382
lsof -i :30386
```

## 推荐配置

### 开发环境
- 只运行 Docker Compose，使用 30382/30383
- 或只运行 Kubernetes，使用 30386/30387

### 生产环境
- 使用 Kubernetes + Ingress，通过域名访问
- 或使用 LoadBalancer 类型的 Service

### 测试环境
- 可以同时运行两个部署，通过不同端口访问进行对比测试

