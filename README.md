# SVG 命令行编辑器

已完成的 Phase 1 使用 TypeScript 实现 SVG 命令行编辑器，支持六种内置图形、嵌套容器、编辑命令的撤销重做，以及 SVG 文件读写。其架构设计、开发过程和验证证据见 [Phase 1 实验报告](doc/README.md)。

Phase 2 的 VSCode 扩展实践已实现并取得隔离宿主截图；CLI 插件式重构进行中，目前保持 Phase 1 命令行为。[新增需求与验收矩阵](doc/phase2/requirements.md)记录已验证范围与未决事项，[开发流程与门禁](doc/phase2/workflow.md)约束后续工作。扩展启动步骤见 [VSCode 扩展说明](vscode-extension/README.md)。

## 运行

使用 Node.js 22.20 或更高的 22.x 版本，或 Node.js 24.12 及更新版本。在仓库根目录执行：

```text
npm ci
npm run cli
```

启动后输入 `help` 查看命令语法。运行全部测试使用 `npm test`。

## 目录

| 路径                | 内容                               |
| ------------------- | ---------------------------------- |
| `src/model/`        | 图形对象、文档树与领域规则         |
| `src/core/editor/`  | 编辑会话、命令与撤销重做历史       |
| `src/adapters/svg/` | SVG 编解码与文件适配               |
| `src/host/cli/`     | 命令解析、结果反馈与树形排版       |
| `src/main.ts`       | 命令行入口与对象装配               |
| `test/`             | 分层测试与验收会话素材             |
| `doc/`              | 实验报告、架构决策与图示           |
| `scripts/`          | 依赖边界和 Git 追踪范围检查        |
| `vscode-extension/` | Phase 2 SVG 文件标记与原生大纲扩展 |
