# Pop Mart 抽盒机雷达屏监控系统

> 上海静安大悦城快闪角 · 12 台抽盒机实时库存可视化监控

## 📋 项目简介

为 Pop Mart 快闪角店员提供 12 台抽盒机的实时库存可视化监控，通过机器 × 系列双维雷达图，将原本需要 90 秒的人工盘点变为秒级可视化响应，显著提升高峰时段顾客服务效率。

## ✨ 核心功能

- **双维雷达屏**：12 台机器 × 8 系列实时库存雷达图，轴长映射端盒剩余数量（0-12 盒）
- **多维度筛选**：按机器编号、系列名称、是否含隐藏款过滤，筛选后相关雷达高亮
- **低库存预警**：余量 ≤ 2 时轴段变红并闪烁，点击可标记补货待上架
- **补货标记**：标记后轴段变蓝且停止闪烁，记录写入时间线
- **历史时间线**：侧栏展示所有低库存/补货事件，支持追溯
- **消耗趋势分析**：双击雷达图查看单机器近 6 小时端盒消耗折线图
- **响应式适配**：iPad 横屏自动切换只读模式，窗口 resize 防抖 300ms

## 🛠 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.4 | 前端框架 |
| TypeScript | 5.3 | 类型安全 |
| Vite | 5.0 | 构建工具 |
| ECharts | 5.5 | 图表库（雷达图、折线图） |
| Pinia | 2.1 | 状态管理 |
| Vue Router | 4.2 | 路由管理 |
| Tailwind CSS | 3.4 | 样式框架 |
| @vueuse/core | 10.9 | 工具函数库 |
| Lucide Vue | 0.400 | 图标库 |
| Docker | - | 容器化部署 |
| Nginx | Alpine | 静态托管 |

## 📁 目录结构

```
tl-0064-1/
├── src/
│   ├── components/          # 组件目录
│   │   ├── RadarGrid.vue        # 雷达图阵列容器
│   │   ├── RadarCard.vue        # 单机器雷达卡片
│   │   ├── FilterBar.vue        # 顶部筛选器
│   │   ├── TimelineSidebar.vue  # 侧栏时间线
│   │   └── ConsumptionModal.vue # 消耗折线弹窗
│   ├── stores/              # Pinia 状态管理
│   │   ├── filterStore.ts       # 筛选状态
│   │   ├── inventoryStore.ts    # 库存状态
│   │   └── timelineStore.ts     # 时间线状态
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── data/                # Mock 数据
│   │   └── mockData.ts
│   ├── composables/         # 组合式函数
│   │   ├── useECharts.ts        # ECharts 封装
│   │   ├── useResize.ts         # resize 防抖
│   │   └── useDevice.ts         # 设备检测
│   ├── utils/               # 工具函数
│   │   └── index.ts
│   ├── pages/               # 页面
│   │   └── HomePage.vue
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── nginx/                   # Nginx 配置
│   └── nginx.conf
├── mock-server/             # 可选 Mock API 服务
│   ├── server.js
│   └── package.json
├── docker-compose.yml
├── Dockerfile
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## 📊 雷达数据 Schema

### Series（系列定义）

```typescript
interface Series {
  id: string;           // 系列唯一标识
  name: string;         // 系列名称：LABUBU、DIMOO 等
  color: string;        // 轴颜色（十六进制）
  hasHidden: boolean;   // 是否含有隐藏款
}
```

### SeriesInventory（单系列库存）

```typescript
interface SeriesInventory {
  seriesId: string;     // 关联系列 ID
  stock: number;        // 端盒剩余数量（0-12）
  isLowStock: boolean;  // 是否低库存（stock ≤ 2）
  isRestocked: boolean; // 是否已标记补货
  lastUpdated: number;  // 最后更新时间戳
}
```

### MachineInventory（单机器完整数据）

```typescript
interface MachineInventory {
  machineId: number;                    // 机器编号（1-12）
  series: SeriesInventory[];            // 8 个系列库存数据
  lastConsumption: ConsumptionPoint[];  // 近 6 小时消耗数据
}
```

### ConsumptionPoint（消耗数据点）

```typescript
interface ConsumptionPoint {
  timestamp: number;  // 时间戳
  seriesId: string;   // 系列 ID
  consumed: number;   // 消耗盒数
}
```

### TimelineEvent（时间线事件）

```typescript
interface TimelineEvent {
  id: string;                    // 事件唯一 ID
  machineId: number;             // 机器编号
  seriesId: string;              // 系列 ID
  eventType: 'low_stock' | 'restocked';  // 事件类型
  timestamp: number;             // 发生时间戳
  stockLevel: number;            // 触发时库存数量
}
```

### FilterState（筛选状态）

```typescript
interface FilterState {
  selectedMachines: number[];  // 选中的机器编号，空数组为全部
  selectedSeries: string[];    // 选中的系列 ID，空数组为全部
  hasHiddenOnly: boolean;      // 仅显示含隐藏款的机器
}
```

## 🏪 8 个系列定义

| 序号 | 系列名称 | 英文名 | 颜色 | 隐藏款 |
|------|----------|--------|------|--------|
| 1 | Labubu | LABUBU | `#ff2d78` | ✅ |
| 2 | DIMOO | DIMOO | `#8b5cf6` | ✅ |
| 3 | MOLLY | MOLLY | `#00d4ff` | ✅ |
| 4 | HIRONO | HIRONO | `#f59e0b` | ✅ |
| 5 | SKULLPANDA | SKULLPANDA | `#10b981` | ✅ |
| 6 | CRYBABY | CRYBABY | `#ec4899` | ❌ |
| 7 | PUCKY | PUCKY | `#6366f1` | ❌ |
| 8 | Sweet Bean | SweetBean | `#14b8a6` | ❌ |

## 🗂 Pinia 模块划分

### 1. filterStore - 筛选状态管理

**State**
- `selectedMachines: number[]` - 选中的机器编号列表
- `selectedSeries: string[]` - 选中的系列 ID 列表
- `hasHiddenOnly: boolean` - 是否仅显示含隐藏款

**Getters**
- `hasActiveFilters: boolean` - 是否有激活的筛选条件
- `isMachineHighlighted(machineId): boolean` - 机器是否应高亮
- `isSeriesHighlighted(seriesId): boolean` - 系列是否应高亮

**Actions**
- `toggleMachine(machineId)` - 切换机器选中状态
- `toggleSeries(seriesId)` - 切换系列选中状态
- `setHasHiddenOnly(value)` - 设置隐藏款筛选开关
- `clearFilters()` - 清除所有筛选条件
- `filterMachines(machines, seriesList)` - 根据筛选条件过滤机器列表

**文件位置**：[src/stores/filterStore.ts](src/stores/filterStore.ts)

---

### 2. inventoryStore - 库存状态管理

**State**
- `machines: MachineInventory[]` - 12 台机器的完整库存数据
- `seriesList: Series[]` - 8 个系列定义

**Getters**
- `getMachineById(id): MachineInventory` - 根据 ID 获取机器数据
- `getSeriesById(id): Series` - 根据 ID 获取系列定义

**Actions**
- `getSeriesStock(machineId, seriesId): number` - 获取指定机器指定系列的库存
- `hasLowStock(machineId): boolean` - 检查机器是否有低库存系列
- `markRestocked(machineId, seriesId)` - 标记系列为已补货
- `updateStock(machineId, seriesId, newStock)` - 更新库存数量
- `loadMockData()` - 加载 Mock 数据

**文件位置**：[src/stores/inventoryStore.ts](src/stores/inventoryStore.ts)

---

### 3. timelineStore - 时间线状态管理

**State**
- `events: TimelineEvent[]` - 所有历史事件列表

**Getters**
- `eventsByMachine(machineId): TimelineEvent[]` - 获取指定机器的事件
- `lowStockEvents: TimelineEvent[]` - 获取所有低库存预警事件
- `restockedEvents: TimelineEvent[]` - 获取所有补货标记事件

**Actions**
- `addEvent(event)` - 添加新事件
- `clearAll()` - 清除所有事件
- `loadMockData()` - 加载 Mock 历史数据

**文件位置**：[src/stores/timelineStore.ts](src/stores/timelineStore.ts)

## 🚀 本地开发

### 环境要求

- Node.js ≥ 18
- npm ≥ 9 或 pnpm ≥ 8

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 查看应用。

### 类型检查

```bash
npm run check
```

### 代码检查

```bash
npm run lint
```

### 自动修复

```bash
npm run lint:fix
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 🐳 Docker 部署

### 仅启动前端（推荐）

使用前端内置的 Mock 数据，无需额外服务：

```bash
docker-compose --profile web up -d --build
```

访问 http://localhost:8080

### 启动完整服务（前端 + Mock API）

```bash
docker-compose --profile all up -d --build
```

- 前端：http://localhost:8080
- Mock API：http://localhost:3000

### 仅启动 Mock API

```bash
docker-compose --profile mock up -d
```

### 停止服务

```bash
docker-compose down
```

### 查看日志

```bash
docker-compose logs -f web
docker-compose logs -f mock-api
```

## 🔌 Mock API 接口

| Method | Path | 描述 |
|--------|------|------|
| GET | `/api/series` | 获取系列列表 |
| GET | `/api/inventory` | 获取所有机器库存 |
| GET | `/api/inventory/:machineId` | 获取单机器库存 |
| GET | `/api/consumption/:machineId` | 获取近 6 小时消耗数据 |
| POST | `/api/restock` | 标记补货 `{ machineId, seriesId }` |
| GET | `/api/timeline` | 获取时间线事件（支持 `machineId`、`type` 查询参数） |
| POST | `/api/timeline` | 添加时间线事件 |
| GET | `/api/health` | 健康检查 |

## 📱 设备适配

### 桌面端（≥1400px）
- 3×4 雷达阵列布局
- 右侧常驻时间线侧边栏
- 完整交互功能

### iPad 横屏（1024-1400px）
- **只读模式**：自动禁用补货标记功能
- 3×4 雷达阵列全屏展示
- 时间线可收起

### iPad 竖屏 / 平板（768-1024px）
- 2×6 雷达阵列布局
- 时间线可滑动抽屉

### 移动端（<768px）
- 单列雷达布局
- 筛选器可折叠

## 🎨 设计规范

### 配色方案

| 用途 | 颜色值 |
|------|--------|
| 主背景 | `#0a0a0f` |
| 卡片背景 | `rgba(20,20,30,0.8)` |
| 主色调 | `#8b5cf6`（电光紫） |
| 强调色 | `#ff2d78`（霓虹粉） |
| 辅助色 | `#00d4ff`（赛博蓝） |
| 低库存预警 | `#ff3b30`（危险红） |
| 补货标记 | `#007aff`（补货蓝） |
| 正文文字 | `#e4e4e7` |
| 次要文字 | `#a1a1aa` |
| 辅助文字 | `#71717a` |

### 字体

- **显示字体**：Space Grotesk（用于标题、数字、机器编号）
- **正文字体**：Inter（用于正文、说明文字）

### 动画

- 低库存闪烁：`1.2s ease-in-out infinite`
- 悬浮过渡：`0.2s ease`
- 模态框过渡：`0.3s ease`
- Resize 防抖：`300ms`

## 📝 交互说明

### 日常操作

1. **查看库存**：直接读取雷达图各轴长度，轴越长库存越多
2. **筛选机器**：点击顶部机器编号按钮，选中的机器高亮，其余半透明
3. **筛选系列**：展开系列筛选，点击系列名称筛选
4. **隐藏款筛选**：开启"仅显示含隐藏款"开关

### 低库存处理

1. 看到雷达轴段变红并闪烁 → 该系列库存 ≤ 2 盒
2. **单击**红色轴段 → 标记为"补货待上架"
3. 轴段变为蓝色，停止闪烁，记录写入时间线

### 数据分析

1. **双击**任意雷达图 → 弹出该机器近 6 小时消耗折线图
2. 查看侧栏时间线 → 追溯历史低库存和补货记录

## 🔧 核心组件说明

### RadarCard.vue - 单机器雷达卡片

**Props**
- `machineId: number` - 机器编号

**Emits**
- `dblclick(machineId)` - 双击触发

**功能**
- 渲染 8 轴雷达图，轴长映射库存
- 低库存系列红色闪烁动画
- 补货标记后蓝色显示
- 未筛选匹配时半透明

### FilterBar.vue - 顶部筛选器

**功能**
- 机器编号多选（1-12）
- 系列名称可展开多选
- "仅显示含隐藏款"开关
- 一键清除筛选

### TimelineSidebar.vue - 侧栏时间线

**功能**
- 时间轴展示所有事件
- 低库存/补货事件区分显示
- 可折叠收起
- 响应式抽屉设计

### ConsumptionModal.vue - 消耗折线弹窗

**Props**
- `visible: boolean` - 显示状态
- `machineId: number | null` - 机器编号

**功能**
- ECharts 折线图展示近 6 小时消耗
- 8 系列多色对比
- 平滑曲线 + 面积填充
- 坐标轴十字准星

## 📄 License

MIT License

---

**Made with ❤️ for Pop Mart 快闪角**

*上海静安大悦城 · 让每一次询问都秒级响应*
