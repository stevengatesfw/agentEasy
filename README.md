### . 启动服务

[更多环境变量配置](docker/README.md)

```bash
# 设置环境变量为平台登录地址为http://127.0.0.1:30382，此链接用于在密码重置邮件、github登录回调的请求地址，如果你申请好域名并配置好反向代理，这个链接需修改成你的域名。
export WEB_CONSOLE_ENDPOINT="http://127.0.0.1:30382"

cd docker
docker compose up -d

# 如需使用本地模型微调推理（本地有GPU）
# 修改 docker-compose.yml 取消对 cloud-service 服务的注释
```

### 1. 访问服务

```bash
http://127.0.0.1:30382
默认账号：admin
默认密码：EIT@2025
```

### 2. 注意事项

1. 如果在mac下docker compose命令找不到，则可以尝试通过`brew install --cask docker`安装docker； 或者通过`brew install docker-compose`,此时要把 `docker compose up -d` 替换为 `docker-compose up -d`
2. 在docker启动后，可以通过 `docker ps`命令观察启动状态，找到对应的IP
3. 登录之后，会有一些预置的已发布应用，在使用这些应用之前，请确保它依赖的模型都被正确的配置好Key。 Sensenova的模型需要同时申请ak和sk，并且以`ak:sk`的形式配置

## 四、自定义构建镜像

> 注意：以下操作均在 Linux 环境下进行

### 1. 克隆代码
```bash
git clone https://github.com/stevengatesfw/LCLLM/tree/ningbov1
cd agentEazy
git submodule update --init

mkdir -p back/src/parts/data/common_datasets
wget https://github.com/LazyAGI/LazyCraft/releases/download/common_datasets/common_datasets.zip \
     -O back/src/parts/data/common_datasets/common_datasets.zip
```

### 2. 构建后端服务镜像

```bash
cd back

# 使用在线模型
docker build --build-arg COMMIT_SHA=$(git rev-parse HEAD) -t lcagent-back:latest .
```

### 3. 构建前端服务镜像

```bash
cd front
docker build --build-arg COMMIT_SHA=$(git rev-parse HEAD) -t lcagent-front:latest .
```

### 4. 启动服务

```bash
# 设置环境变量为平台登录地址，例如 http://127.0.0.1:30382
export WEB_CONSOLE_ENDPOINT="http://your-console-url"

export BACK_IMAGE="lcagent-back:latest"
export FRONT_IMAGE="lcagent-front:latest"

cd docker
docker compose up -d
```
# 重新构建镜像
 docker compose up -d --force-recreate web api worker beat cloud-service
