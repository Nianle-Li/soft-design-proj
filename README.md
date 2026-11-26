# SVG 编辑器：VSCode 扩展与插件式 CLI

本仓库是 Software Design Lab Phase 2 的完整实现。在保持 Phase 1 CLI 行为与输出兼容的基础上，CLI 已重构为支持图形、命令、树标签和属性语义四类扩展点的插件式框架；仓库同时提供 SVG 文件标记与原生 Outline 的 VSCode 扩展。

设计、实现和验收证据见 [Phase 2 实验报告](doc/README.md)，要求—证据对应关系见[验收矩阵](doc/phase2/requirements.md)，扩展的独立启动步骤见 [VSCode 扩展说明](vscode-extension/README.md)。Phase 1 的发布版本由不可移动的 `final` 标签保存。

## 运行

使用 Node.js `^22.20.0` 或 `>=24.12.0`。在仓库根目录执行：

```powershell
npm ci
npm run cli
```

启动后输入 `help` 查看命令语法。使用配置装配时执行：

```powershell
npm run cli -- --config plugins.config.json
```

完整质量门禁包括 `npm test`、`npm run coverage`、`npm run typecheck`、`npm run lint`、`npm run format:check`、`npm run deps:check` 和 `npm run tracked:check`。

## 目录

| 路径                | 内容                                             |
| ------------------- | ------------------------------------------------ |
| `src/core/`         | 领域模型、编辑历史、扩展契约与注册表             |
| `src/builtin/`      | Phase 1 六种内置图形及其提供者                   |
| `src/adapters/`     | SVG/XML 与磁盘 I/O 适配                          |
| `src/host/`         | CLI 协议、插件安装、配置加载与应用装配           |
| `plugins/`          | box、diamond、stats、dir 与 modified-star 等插件 |
| `test/`             | 单元、集成、进程级及 Phase 1 字节基线测试        |
| `vscode-extension/` | SVG 文件标记与原生 Outline 扩展                  |
| `doc/`              | 实验报告、ADR、验收矩阵、架构图与真实截图        |
| `docs/metrics/`     | 从 Git 引用生成的可复现规模与复杂度指标          |
| `scripts/`          | 依赖边界、追踪卫生和指标生成检查                 |
