#!/bin/bash

# Kubernetes 服务启动脚本
# 使用方法: ./start.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  开始部署 AgentEasy Kubernetes 服务"
echo "=========================================="
echo ""

# 检查 kubectl 是否安装
if ! command -v kubectl &> /dev/null; then
    echo "❌ 错误: kubectl 未安装，请先安装 kubectl"
    exit 1
fi

# 检查 Kubernetes 集群是否可用
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ 错误: Kubernetes 集群不可用，请确保："
    echo "   1. Docker Desktop 的 Kubernetes 已启用"
    echo "   2. 或者已连接到其他 Kubernetes 集群"
    exit 1
fi

echo "✅ kubectl 和 Kubernetes 集群检查通过"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 步骤 1/11: 安装 Local Path Provisioner (存储类)"
kubectl apply -f storage-class-local-path.yaml
echo "   等待存储类就绪..."
sleep 2
kubectl get storageclass local-path || echo "   ⚠️  存储类可能已存在或需要等待"
echo ""

echo "📦 步骤 2/11: 创建 Namespace"
kubectl apply -f namespace.yaml
echo ""

echo "📦 步骤 3/11: 创建 ConfigMap (环境变量配置)"
kubectl apply -f configmap.yaml
echo ""

echo "📦 步骤 4/11: 创建 Secrets (敏感信息)"
kubectl apply -f secrets.yaml
echo ""

echo "📦 步骤 5/11: 创建持久化存储 (PVC)"
kubectl apply -f pvc.yaml
echo "   等待 PVC 创建..."
sleep 3
kubectl get pvc -n lcagentns-app
echo ""

echo "📦 步骤 6/11: 部署数据库 (TiDB)"
kubectl apply -f tidb.yaml
echo ""

echo "📦 步骤 7/11: 部署缓存 (Redis)"
kubectl apply -f redis.yaml
echo ""

echo "⏳ 等待数据库就绪（最多等待 5 分钟）..."
if kubectl wait --for=condition=ready pod -l app=tidb -n lcagentns-app --timeout=300s 2>/dev/null; then
    echo "✅ 数据库已就绪"
else
    echo "⚠️  数据库可能还在启动中，继续部署其他服务..."
fi
echo ""

echo "📦 步骤 8/11: 部署对象存储 (MinIO)"
kubectl apply -f minio.yaml
echo ""

echo "📦 步骤 9/11: 部署后端服务 (API, Worker, Beat)"
kubectl apply -f backend.yaml
echo ""

echo "📦 步骤 10/11: 部署前端服务"
kubectl apply -f frontend.yaml
echo ""

echo "📦 步骤 11/11: 部署云服务 (AMS, FT)"
kubectl apply -f cloud-service.yaml
echo ""

echo "📦 步骤 12/12: 部署 MCP 服务"
kubectl apply -f mcp-services.yaml
echo ""

echo "📦 步骤 13/13: 部署 Nginx (反向代理)"
kubectl apply -f nginx.yaml
echo ""

echo "=========================================="
echo "  部署完成！正在检查服务状态..."
echo "=========================================="
echo ""

sleep 5

echo "📊 Pod 状态:"
kubectl get pods -n lcagentns-app
echo ""

echo "📊 Service 状态:"
kubectl get svc -n lcagentns-app
echo ""

echo "=========================================="
echo "  访问信息"
echo "=========================================="
echo ""
echo "🌐 前端访问地址:"
NGINX_NODEPORT=$(kubectl get svc nginx -n lcagentns-app -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}' 2>/dev/null || echo "30386")
echo "   HTTP:  http://localhost:${NGINX_NODEPORT}"
echo ""
echo "📝 查看日志:"
echo "   kubectl logs -f deployment/api -n lcagentns-app"
echo ""
echo "📝 查看所有 Pod:"
echo "   kubectl get pods -n lcagentns-app"
echo ""
echo "📝 查看服务详情:"
echo "   kubectl get svc -n lcagentns-app"
echo ""
echo "✅ 部署完成！"
echo ""

