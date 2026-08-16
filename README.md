# dsh-convnav

DeepSeek Harness (dsh) 对话节点导航条插件 —— 会话聊天区左侧的垂直节点串,每个 user 消息一个节点,点击即可快速跳转到对应消息。

## 功能

- **左侧节点串**:聊天区左缘一条聚簇的横条链,每个节点对应一条 user 消息,自动跟随聊天区位置(侧栏折叠、视图切换均正确)
- **点击跳转**:点击节点平滑滚动到对应消息(官方 trajectory 同款 `scrollIntoView`)
- **悬停波浪**:悬停时该节点加长,上下各 3 根按距离递减变长,激活色跟随悬停项
- **消息预览**:悬停显示消息内容 tooltip(官方 tooltip 样式,白字深底)
- **当前节点跟踪**:滚动时自动高亮视口顶部的 user 消息节点
- **实时增量**:通过官方 `useSession` 快照订阅(`s.chat.order` + `s.chat.nodes`),消息流式到来时节点自动更新,零轮询
- **官方样式**:全部使用 dsh 官方 CSS 变量,随日间/深色主题自适应;图标字体本地托管,无 CDN

## 安装

前置:已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(`dsh web` 可运行)。

### 方式一:GitHub 源

```sh
dsh plugin --profile web add github:Nai99/dsh-convnav#main
```

> pnpm 11 的 release-age 门禁可能拦截刚发布的版本,如遇 `declares no dsh.bundle` 报错,在 `~/.dsh/profiles/web/pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude` 中加入 `dsh-convnav@0.1.0` 后重试。

### 方式二:本地目录(开发调试)

```sh
git clone https://github.com/Nai99/dsh-convnav.git
dsh plugin --profile web add /path/to/dsh-convnav
```

安装后**重启 `dsh web`**,刷新浏览器。

## 使用

1. 打开任意会话,聊天区左侧自动出现节点串(无需任何开关,有 user 消息即显示);
2. 悬停节点查看消息预览,点击节点跳转到对应消息;
3. 滚动聊天内容时,当前视口顶部的节点自动高亮。

## 项目结构

```
lib/
  client.js  客户端:节点串组件(useSession 订阅 + DOM 定位跳转),注册于 conversation.session.header.actions
  index.js   Node 半侧:自托管 /dsh-convnav/remixicon.css|woff2 图标字体
  remixicon/ 图标字体资源
cordis.patch.yml  打包挂载配置
```

## 原理

| 层 | 实现 |
|---|---|
| 数据 | `useSession((s) => s.chat.order)` + `s.chat.nodes` 官方会话快照,过滤 `kind === "user"` 节点 |
| 定位 | 节点渲染后带 `data-chat-flow-key`,跳转用 `scrollIntoView({ behavior: "smooth" })` |
| 几何 | 跟随 `[data-conversation-scroll]` 容器,ResizeObserver + 轮询兜底 |

## 许可证

[MIT](LICENSE)
