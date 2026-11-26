# VSCode SVG 标记与大纲

该扩展实现 Phase 2 A.1–A.3：为本地普通 `.svg` 文件显示 `[]` Explorer 徽标，并在 VSCode 原生 Outline 中按源码层级展示 SVG 元素。点击符号可定位到对应开始标签，编辑文本后大纲同步更新；不完整 XML 返回空符号列表，不影响编辑器运行。

## 构建与测试

在本目录执行：

```powershell
npm ci --cache ../.npm-cache
npm test
npm run typecheck
npm run build
```

单元测试覆盖资源筛选、精确徽标、符号层级、源码范围和不完整 XML。`test-host/index.js` 在隔离的 Extension Development Host 中验证非 SVG 文件、源码选择、编辑更新与错误容忍。

## 人工验收

在本目录的 PowerShell 中启动隔离宿主：

```powershell
code --extensionDevelopmentPath="$PWD" --disable-extensions `
  --user-data-dir="$PWD/../tmp/vscode-ui-user" `
  --extensions-dir="$PWD/../tmp/vscode-ui-extensions" "$PWD"
```

打开 `sample/example.svg`，并完成以下核验：

1. 若 SVG 默认显示为图片，在编辑器标签选择 **Reopen Editor With... → Configure default editor for `*.svg`... → Text Editor**，关闭后重新打开文件。配置为默认文本编辑器可避免点击 Outline 后重新进入图片预览。
2. 确认 `explorer.decorations.badges` 已启用，并暂时关闭 `git.decorations.enabled`。Explorer 中 `example.svg` 右侧显示完整 `[]`，目录和非 SVG 文件不显示该徽标；磁盘文件名与内容不发生变化。
3. Outline 显示 `svg`、`g#flow`、`rect#start`、`text` 的嵌套层级。点击 `rect#start` 后，编辑器定位到第 3 行的开始标签。
4. 将 `id="start"` 改为 `id="changed"`，Outline 与 Breadcrumb 同步显示 `rect#changed`。临时删除 `</g>` 时扩展不崩溃，恢复标签后层级复原。

验收截图位于：

- [隔离宿主基线](../doc/phase2/images/vscode-baseline-outline.png)
- [Explorer 文件标记](../doc/phase2/images/vscode-svg-badge.png)
- [Outline 源码定位](../doc/phase2/images/vscode-outline-source-location.png)
- [Outline 实时更新](../doc/phase2/images/vscode-outline-live-update.png)

截图使用 VSCode 1.147.0 x64、隔离用户目录、隔离扩展目录并禁用其他扩展。Explorer 截图同时关闭 Git 装饰，以排除其他徽标干扰。

## 设计说明

扩展在 `activate` 中注册 `FileDecorationProvider` 与 `DocumentSymbolProvider`。文件提供者只返回 UI 元数据，不改名、不改写文件，也不向父目录传播徽标；符号提供者读取当前编辑器文本，生成带层级和源码范围的 `DocumentSymbol`。

文件标记采用 VSCode 原生装饰 API，而非修改文件名或自建 Explorer 树。大纲采用 `DocumentSymbolProvider`，而非自定义 `TreeView`，因此直接复用原生 Outline、Breadcrumb 和源码定位行为。

符号解析使用独立的轻量 XML 源码投影。CLI 的 `SvgCodec` 负责受支持 SVG 子集的领域校验和读写，不保留原始源码范围；Outline 则需要精确位置并容忍 CLI 领域之外的 SVG 元素。两者共享 XML 事实，但分别封装“可编辑领域文档”和“源码导航投影”，避免把 UI 定位职责引入 CLI 内核。

VSCode file decoration 是提供视觉元数据的扩展 API，不等同于 GoF Decorator 的对象包装。两个提供者都把 URI 或 XML 文本转换为 VSCode 契约，体现 Adapter 的接口转换职责，并由 VSCode 反向调用。
