# naomale-java

> 家庭点单、菜谱手记、盲盒抽签、营养透视、开销账本。
> React 前端打包进 Spring Boot 后端，最终只运行一个 **`naomale-java.jar`**。

## 架构

```
浏览器
  │  HTTP :3000（同一个 jar）
  ▼
Spring Boot 3.3 + MyBatis
  ├── 静态资源：backend/src/main/resources/static（React 构建产物）
  ├── 账号 / 家庭 / 会话（users / families / family_members / sessions）
  ├── 家庭业务数据（dishes / orders / order_items）
  ├── 图片（media，LONGBLOB）
  ├── 家庭账号成员（family_members）
  └── DeepSeek 代理（deepseek-flash，支持文字与图片）
        │
        ▼
     云端 MySQL
```

项目目录：

```
naomale-java/
├── release/                  # 发布包：部署时只上传这个目录
│   ├── naomale-java.jar      # 应用（前端已打包进去）
│   ├── application.yml       # 唯一运行配置
│   ├── start.sh              # CentOS / Linux 启动
│   └── stop.sh               # CentOS / Linux 停止
├── backend/                  # Spring Boot 源码
│   ├── pom.xml
│   └── src/main/java/com/naomale/
├── frontend/                 # React 19 + Vite 6 + Tailwind 4
├── run.cmd                   # Windows 启动（进入 release 运行）
└── build.cmd                 # 构建前端 + 打包 jar + 更新 release
```

> `start.sh` 会生成 `release/naomale-java.pid` 和 `release/logs/naomale-java.log`；这些运行时文件已加入 `.gitignore`。

## 快速开始

**环境**：JDK 17+。运行已构建好的 jar 不需要 Node/Maven。

Windows 双击 `run.cmd`，或进入 `release` 手动启动：

```bat
cd release
java -jar naomale-java.jar --spring.config.additional-location=file:./application.yml
```

然后打开：

```
http://localhost:3000
```

首次打开会显示「注册主账号」，注册后自动创建一个家庭。

### CentOS / Linux 部署

把 `release/` 目录里的内容上传到服务器的 `/opt/naomale-java`（最终就是 jar + yml + 两个脚本），确保服务器已安装 **JDK 17+**，并且能连接 MySQL。首次部署如果还没有 `application.yml`，先：

```bash
cp application.example.yml application.yml
vi application.yml
```

```bash
cd /opt/naomale-java
chmod +x start.sh stop.sh

# 启动（后台运行）
./start.sh

# 查看状态 / 日志
tail -f logs/naomale-java.log

# 停止
./stop.sh

# 重启
./stop.sh && ./start.sh
```

说明：

- `start.sh` 会检查 JDK 版本（至少 17）、jar 和 `application.yml` 是否存在；
- `start.sh` 使用 `nohup` 后台启动，写入 `naomale-java.pid`，并等待 `/api/ping` 就绪后才提示启动成功；
- `stop.sh` 先发 `SIGTERM` 优雅停止，30 秒未退出才强制停止；
- 脚本会校验 PID 对应的进程确实是 `naomale-java.jar`，避免误杀其他进程；
- 默认使用 `java`；如果服务器有多个 JDK，可先 `export JAVA_HOME=/usr/lib/jvm/java-17`；
- 默认堆内存 `-Xms256m -Xmx512m`，可覆盖：`JAVA_OPTS="-Xms512m -Xmx1g" ./start.sh`；
- 改端口：`SERVER_PORT=3000 ./start.sh`（`application.yml` 的 `server.port` 也支持该环境变量）；
- 如果直接对外提供 3000 端口，记得在安全组/防火墙放行：
  ```bash
  firewall-cmd --permanent --add-port=3000/tcp
  firewall-cmd --reload
  ```

### 数据库配置

数据库连接配置在发布目录的：

```
release/application.yml
```

这个文件含真实数据库账号密码，**不会提交到 Git**。从仓库克隆后先复制模板并填写：

```bash
cp release/application.example.yml release/application.yml
# 编辑 release/application.yml，填写 DB_URL / DB_USERNAME / DB_PASSWORD
```

`application.yml` 是运行时唯一的配置文件，jar 内不再放一份。启动脚本通过：

```
--spring.config.additional-location=file:./application.yml
```

显式加载它。

- 数据库不存在时会自动创建（需要账号有 CREATE 权限）；
- `schema.sql` 已打包在 jar 内，会在启动时自动建表（`CREATE TABLE IF NOT EXISTS`）；
- 端口默认 3000，可通过环境变量 `SERVER_PORT` 覆盖。

## 数据库

默认库名 `naomale_order`，字符集 `utf8mb4`。核心表：

| 表 | 说明 |
| --- | --- |
| `users` | 账号；密码为 BCrypt 哈希，不存明文 |
| `families` | 家庭、主账号、8 位邀请码 |
| `family_members` | 账号与家庭的多对多关系、owner/member 角色 |
| `sessions` | 登录会话；只存 token 的 SHA-256 |
| `family_settings` | 每个家庭的主题、DeepSeek Key 与模型 |
| `dishes` | 菜谱；食材/步骤/营养/标签以 JSON 文本保存 |
| `orders` | 当前点单与历史账单（`is_current` 区分） |
| `order_items` | 点单明细 + 下单时的菜品快照 |
| `media` | 菜品图片与主题素材（LONGBLOB） |
| `user_themes` | 账号自定义主题包：素材池、位置分配、配色 JSON（仅本人可见） |
| `audit_logs` | 系统日志 |

所有业务表都带 `family_id`，接口先校验登录账号是否属于该家庭，再读写数据。

## 功能

- **账号**：注册 / 登录 / 退出，BCrypt 密码哈希，30 天 HttpOnly Cookie 会话
- **家庭**：创建家庭、8 位邀请码加入、一个账号可加入多个家庭、顶部切换家庭
- **菜谱**：录入/编辑/删除、收藏、图片上传与裁剪、水果分类、完整营养素
- **点单**：按成员点菜、数量/价格/备注、实时金额与营养汇总
- **归档**：一键开饭，写入历史账单并累加菜品烹饪次数
- **盲盒**：按人数自动搭配荤素汤
- **营养分析**：基于当前点单的菜品、数量和就餐人数，计算整餐与人均热量、宏量供能比、膳食纤维、钠、糖、维生素 A/B1/B2/B6/C/E、叶酸、钾、镁、钙
- **AI 识谱**：DeepSeek `deepseek-flash`；文字或菜谱图片识谱、AI 营养重算
- **AI 本单点评**：点单页和营养页共用同一份当前点单数据，AI 按“本餐结构 / 可能缺少 / 建议补充 / 优先调整”输出点评；点单变化后自动分析，也可手动重算
- **单品查询**：营养分析页的单品放大镜只查询某道菜，不计入本餐汇总
- **账本**：本日/本周/本月与自定义起止日期统计、7 日趋势、区间最常点菜品
- **主题工坊**：上传多张图片形成素材池，分配到 Logo / 首页 / 背景 / 5 个导航图标，AI 提取配色；主题仅对当前账号生效，同一账号多设备同步
- **实时同步**：SSE，按家庭广播，多台设备同时点单

### AI 配置

- 设置 → 填 DeepSeek API Key → 保存 → 检测连接
- 默认模型 `deepseek-flash`，可切换 `deepseek-v4-pro`
- 识谱支持文字和菜谱图片（JPG / PNG / WebP），使用 JSON Output 并关闭思考模式
- 营养重算由 AI 按整盘食材计算
- Key 只保存在当前家庭的 `family_settings` 表；接口下发脱敏串
- 未配置 Key 时录菜页使用文字基础识别，图片识别需先配置 AI

### 主题工坊

入口：顶部调色盘 →「主题工坊」，或设置页「打开主题工坊」。

1. 一次上传多张图片（单张最大 8MB，最多 12 张）；
2. 在素材池点击图片，设置到当前选中的位置：Logo、首页主图、页面背景、菜谱/点单/抽签/营养/账本导航图标；
3. 图少时可以点「全部使用第一张」，所有位置复用同一张图；
4. 点「AI 识别配色」，`deepseek-flash` 会从图片提取主色、辅色、背景、卡片、导航和文字颜色；
5. 点「应用主题」，当前账号所有设备通过 SSE 同步换肤；其他家庭成员不受影响。可随时「恢复默认」。

导航图标默认圆形裁切，选中态加主题色圆环；Logo 放在圆角容器中，有背景的图片也可以直接用。每个位置都可以点「使用默认（不替换）」留空，未设置的位置继续使用系统默认 Logo / 首页图 / 图标。

### 图片存储

- 上传前浏览器会压缩到最长边 1920px、WebP 质量 86%，减少上传体积；
- 菜品图片和主题素材上传前都可以裁剪，支持 1:1、4:3、16:9；
- 图片写入 MySQL `media` 表的 `LONGBLOB`，地址是 `/media/{familyId}/{id}`；
- 图片响应带 30 天公共缓存，重复访问不会反复读库；
- 目前没有接对象存储/CDN，所以大量高清壁纸的首次上传和首次加载会比静态资源慢；如果要进一步提速，下一阶段可以把 `media` 的二进制改存 OSS/COS/S3 + CDN，数据库只保留元数据。

### 水果与完整营养

- 菜谱分类新增「水果」，适合水果拼盘、果切、水果沙拉；
- 营养字段包含：热量、蛋白质、碳水、脂肪、膳食纤维、钠、糖、维生素 A/B1/B2/B6/C/E、叶酸、钾、镁、钙；
- AI 识谱和 AI 营养重算会按整盘/可食部分估算这些字段；
- 未配置 AI 时，本地水果表覆盖苹果、香蕉、橙子、草莓、蓝莓、西瓜、葡萄、猕猴桃、芒果、梨、桃、火龙果、菠萝、哈密瓜、车厘子、圣女果、柠檬、牛油果等，并按“个/根/盒”换算重量。

## 构建发布包

已构建好的发布包在 `release/`，可以直接部署：

```
release/naomale-java.jar
release/application.yml
release/start.sh
release/stop.sh
```

重新构建（需要 Node.js **22.12+** 和 Maven 3.9+）：

```bat
build.cmd
```

它等价于：

```bat
cd frontend
npm install --ignore-scripts
npm run build
cd ..
xcopy frontend\dist\* backend\src\main\resources\static\ /E /I /Y
cd backend
mvn clean package -DskipTests
cd ..
copy /Y backend\target\naomale-java.jar release\naomale-java.jar
```

`release/application.yml` 是独立配置文件，不参与 jar 打包；构建只更新 `release/naomale-java.jar`，不会覆盖你改过的配置。

## 安全说明

- 数据库账号密码只放在 `release/application.yml`；不要复制到脚本、文档或聊天记录。
- 建议给应用单独建一个 MySQL 用户，只授权 `naomale_order.*`，不要长期使用高权限账号。
- 所有数据接口都要求登录并校验家庭成员身份；邀请码只共享当前家庭的数据。
- 密码使用 BCrypt 哈希存储；会话只保存 token 的 SHA-256。

## 验证

- 注册、登录、家庭创建、邀请码加入、多家庭切换、数据隔离
- 菜谱 CRUD、点单金额重算、归档、历史复刻、删除菜品保留快照
- 图片上传/鉴权访问、AI 文字与图片识谱、自定义日期区间统计
- DeepSeek：模型 `deepseek-flash`、`response_format=json_object`、`thinking=disabled`
- 浏览器完整流程：注册 → 家庭管理 → 录入菜谱 → 点单 → 归档 → 账本 → 手机视图，控制台 0 报错。

## API

除 `/api/ping`、`/api/auth/status`、`/api/auth/register`、`/api/auth/login` 外，均需登录 Cookie。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/ping` | 存活探测 |
| POST | `/api/auth/register` / `login` / `logout` | 注册 / 登录 / 退出 |
| GET | `/api/auth/status` / `me` | 是否已有账号 / 当前账号 |
| GET | `/api/bootstrap` | 当前家庭完整快照 |
| GET | `/api/health` | 当前家庭统计 |
| GET / POST | `/api/families` | 我的家庭 / 创建家庭 |
| POST | `/api/families/join` / `:id/switch` | 加入 / 切换家庭 |
| GET | `/api/families/:id/invite` / `members` | 邀请码 / 账号成员 |
| GET / POST | `/api/dishes` | 菜谱列表 / 新增或更新 |
| PUT / DELETE | `/api/dishes/:id` | 更新 / 删除 |
| PATCH | `/api/dishes/:id/favorite` | 收藏 |
| GET / PUT / POST / DELETE | `/api/current-order` | 当前点单 |
| POST | `/api/current-order/archive` | 归档开饭 |
| GET / DELETE | `/api/orders` / `:id` | 历史账单 |
| POST | `/api/orders/:id/reorder` | 再来一单 |
| GET / PUT | `/api/settings` | 家庭设置 |
| GET / PUT / DELETE | `/api/theme` | 读取 / 保存 / 清除当前账号的自定义主题 |
| PUT | `/api/theme/active` | 切换当前账号使用的主题（预设或自定义） |
| POST | `/api/theme/analyze` | 从主题图片提取配色（AI + 本地兜底） |
| POST | `/api/ai/test` / `parse-recipe` / `nutrition` / `nutrition-advice` | AI（`parse-recipe` 支持 `imageDataUrl`） |
| POST | `/api/media` | 上传图片 |
| GET | `/media/:familyId/:id` | 图片（需登录且属于该家庭） |
| GET | `/api/events` | SSE 实时同步 |
