# Phase 2 关键证据与设计记录

## VSCode 扩展实践（2026-11-23）

- A.1 使用 `FileDecorationProvider` 返回 UI 标记 `[]`，不改文件名或内容；A.2 使用 `DocumentSymbolProvider` 接入原生 Outline。曾比较直接改 Explorer 树与文件装饰、自定义 `TreeView` 与文档符号接口，选择后者以保留 VSCode 的渲染、层级及源码定位职责。`SvgCodec` 会校验 CLI 子集并补无 id 节点，且不保留源码范围，因此扩展使用独立的轻量源码投影。模式角色与复用理由详见[扩展说明](../../vscode-extension/README.md)。
- 隔离的 VSCode 1.147.0 宿主禁用其他扩展后，以文本编辑器打开 SVG，原生 Outline 显示“无符号”，见[基线截图](images/vscode-baseline-outline.png)。加载本扩展后，[标记截图](images/vscode-svg-badge.png)显示 `example.svg` 的 `[]` 与 `SVG file` 提示，目录及 `README.md` 无标记；[大纲截图](images/vscode-svg-outline.png)显示 `svg → g#flow → rect#start/text`，选中矩形后状态栏为第 3 行、第 5 列。截图均为实际窗口画面，未编辑。
- 启动步骤曾忽略 VSCode 1.147.0 默认将 SVG 打开为图像预览这一点；实际核验后补充了 **View: Reopen Editor with Text Editor**。普通 Git 装饰会与 `[]` 同时显示，标记截图仅关闭了 Git 装饰；这不改变扩展行为。
- 扩展 8 项单测及隔离宿主断言通过；Phase 1 的 178 项回归通过。宿主的 `WorkspaceEdit` 验证编辑后文档符号更新及不完整 XML 返回空数组。另修改磁盘文件并重新聚焦编辑器时，Outline 实际显示 `rect#changed`，不完整 XML 时显示“无符号”，恢复后回到 `rect#start`，示例文件 SHA-256 恢复一致。编辑器内直接输入后的可见刷新尚未可靠观察，报告中须与程序化测试区分。
