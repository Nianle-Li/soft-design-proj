# Phase 2 关键证据与设计记录

## VSCode 扩展实践（2026-11-23）

- A.1 使用 `FileDecorationProvider` 返回 UI 标记 `[]`，不改文件名或内容；A.2 使用 `DocumentSymbolProvider` 接入原生 Outline。曾比较直接改 Explorer 树与文件装饰、自定义 `TreeView` 与文档符号接口，选择后者以保留 VSCode 的渲染、层级及源码定位职责。`SvgCodec` 会校验 CLI 子集并补无 id 节点，且不保留源码范围，因此扩展使用独立的轻量源码投影。模式角色与复用理由详见[扩展说明](../../vscode-extension/README.md)。
- 隔离的 VSCode 1.147.0 宿主禁用其他扩展后，以文本编辑器打开 SVG，原生 Outline 显示“无符号”，见[基线截图](images/vscode-baseline-outline.png)。加载本扩展后，[标记截图](images/vscode-svg-badge.png)显示 `example.svg` 的 `[]` 与 `SVG file` 提示，目录及 `README.md` 无标记；[大纲截图](images/vscode-svg-outline.png)显示 `svg → g#flow → rect#start/text`，选中矩形后状态栏为第 3 行、第 5 列。截图均为实际窗口画面，未编辑。
- 启动步骤曾忽略 VSCode 1.147.0 默认将 SVG 打开为图像预览这一点；实际核验后补充了 **View: Reopen Editor with Text Editor**。普通 Git 装饰会与 `[]` 同时显示，标记截图仅关闭了 Git 装饰；这不改变扩展行为。
- 扩展 8 项单测及隔离宿主断言通过；Phase 1 的 178 项回归通过。宿主的 `WorkspaceEdit` 验证编辑后文档符号更新及不完整 XML 返回空数组。另修改磁盘文件并重新聚焦编辑器时，Outline 实际显示 `rect#changed`，不完整 XML 时显示“无符号”，恢复后回到 `rect#start`，示例文件 SHA-256 恢复一致。编辑器内直接输入后的可见刷新尚未可靠观察，报告中须与程序化测试区分。

## Phase 1 逐字节兼容基线（2026-11-23）

- 以 `final`（`049b3a7`）的归档源码在隔离临时目录运行 §6 基础会话与 §6.1 版本 A 流程图会话；输入从该标签的题目会话夹具提取，只含命令。捕获原始标准输出与保存的 SVG，存于 `test/fixtures/final-baseline/`。§6 还使用 `final` 的 `other.svg` 输入。两次运行退出码均为 0，标准错误为空；标准输出分别为 1258、943 字节，SVG 分别为 390、524 字节。
- 选择保存完整原始字节并用 `Buffer` 比较，而非只保存哈希或从题目示例重建期望输出：前者便于审阅空格、换行与 SVG 序列化差异，也能独立约束后续重构。现有会话语义测试继续保留；版本 B 的 `box` 会话待插件实现后另行验证。
- 两份标准输出均以没有换行的 `svg> ` 提示符结尾。该空格是 `final` 行为，须原样保留；`.gitattributes` 只对这两份输出关闭行尾空格提示。

## CLI B+ 架构选择

- `ShapeSpec` 是六种类型的封闭联合；`SvgDocument.create` 只检查根 id，`undoCreation` 拒绝非空容器；`SvgCodec` 对未知属性直接报错。因而只在 `ShapeFactory` 外加注册表无法满足 `box` 的整棵子树创建、撤销及 `data-kind` 读回。用户选择 B+：按职责分开核心、CLI 宿主、SVG 适配与插件，并以受控插件公开面和机械规则验证依赖；详见[ADR-005](../adr/ADR-005-phase2-plugin-boundaries.md)。
- 复核 Phase 2 §1、§6–7：迁移文件数和工时不是明示评分项；验收看扩展行为、依赖方向、接入提交差异与可复现证据。此前偏重迁移成本的推荐已修正；B+ 的优势在于把 CLI 表现知识移出核心，而非仅改目录。四扩展点签名及未规定的语义仍待各自 ADR 和测试。
- B+ 依赖门禁先于运行模块迁移：检查器扫描 `src/` 与 `plugins/`，用反例锁定插件唯一核心入口、加载器动态导入例外及 SVG 的类型端口；旧目录仅作迁移期白名单，迁走时须逐项删除。插件第三方依赖由本插件 `package.json` 声明，Node API 仅在本插件 `adapters/` 使用，避免把 I/O 藏在命令或图形实现里。此时尚无插件实现，检查器测试使用临时目录夹具。
- CLI 文字知识由 `src/cli/` 整体迁入 `src/host/cli/`：解析器、树格式器和 `CliApp` 一起搬迁，避免过渡期旧目录反向依赖新宿主；同时删除旧 `cli` 检查器白名单。Phase 1 报告的原路径仍是 `final` 时点的历史事实。此切片只改导入与路径，不改变命令分派或反馈内容。
