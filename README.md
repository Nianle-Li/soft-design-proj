# SVG 编辑器：VSCode 扩展与插件式 CLI

本仓库是 Software Design Lab Phase 2 的完整实现。在保持 Phase 1 CLI 行为与输出兼容的基础上，CLI 已重构为支持图形、命令、树标签和属性语义四类扩展点的插件式框架；仓库同时提供 SVG 文件标记与原生 Outline 的 VSCode 扩展。

设计、实现和验收证据见 [Phase 2 实验报告](doc/README.md)，要求—证据对应关系见[验收矩阵](doc/phase2/requirements.md)，扩展的独立启动步骤见 [VSCode 扩展说明](vscode-extension/README.md)。Phase 1 的发布版本由不可移动的 `final` 标签保存。

## 环境与安装

使用 Node.js `^22.20.0` 或 `>=24.12.0`。以下命令均在仓库根目录执行；首次运行先按锁文件安装依赖：

```powershell
npm ci
```

## 运行 CLI

### 代码装配

默认入口通过代码组合根装入 `box`、`diamond`、`stats` 和 `dir` 插件：

```powershell
npm run cli
```

### 配置装配

仓库级 `plugins.config.json` 装入同一组能力，并额外启用 `modified-star` 树标签：

```powershell
npm run cli -- --config plugins.config.json
```

配置中的相对模块路径以配置文件所在目录为基准；数组顺序决定安装顺序，`enabled: false` 可跳过单项插件。合法插件经过同一套清单校验、重名检查和原子注册流程，单个插件失败不会阻止后续插件加载。

启动后输入 `help` 查看完整语法。下面的最小会话可验证内置图形、复合图形和命令插件：

```text
svg> init 800 600
svg> create rect r1 10 20 120 60
svg> create box n1 180 20 160 60 "处理"
svg> create diamond d1 400 20 120 80 blue
svg> stats
svg> tree
svg> save output.svg
```

`dir` 可在尚未创建或读入 SVG 文档时使用，列出 CLI 进程当前工作目录。输入文件、保存语义、错误文本和全部命令示例见 [Phase 2 实验报告](doc/README.md)。

## 运行 VSCode 扩展

扩展要求 VSCode `^1.90.0`。先构建并测试扩展：

```powershell
cd vscode-extension
npm ci --cache ../.npm-cache
npm run typecheck
npm test
npm run build
```

在同一目录启动隔离的 Extension Development Host：

```powershell
code --extensionDevelopmentPath="$PWD" --disable-extensions `
  --user-data-dir="$PWD/../tmp/vscode-ui-user" `
  --extensions-dir="$PWD/../tmp/vscode-ui-extensions" "$PWD"
```

打开 `sample/example.svg` 后，可核验 Explorer 的 `[]` 标记、原生 Outline 层级、点击定位、编辑更新和不完整 XML 容错。若 VSCode 默认使用图片预览，应通过 **Reopen Editor With...** 将 `*.svg` 配置为 Text Editor。完整人工验收步骤及截图见 [VSCode 扩展说明](vscode-extension/README.md)。

## 测试与质量门禁

在仓库根目录执行完整自动验证：

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run deps:check
npm run tracked:check
npm test
npm run coverage
npm --prefix vscode-extension test
```

- `deps:check` 校验内核、宿主、适配器、内置图形与插件之间的依赖方向。
- `tracked:check` 阻止依赖、构建、覆盖率和临时产物进入 Git。
- `npm test` 包含单元、集成、真实进程、双装配以及 Phase 1 逐字节兼容性测试。
- `coverage` 对 CLI 与插件源码执行全局覆盖率门禁；VSCode 扩展测试在其独立包中运行。

可复现的 `final → p2` 文件规模与圈复杂度结果位于 [docs/metrics/metrics.md](docs/metrics/metrics.md)，生成脚本为 `npm run metrics:generate`。

## 文档导航

- [Phase 2 实验报告](doc/README.md)：功能、架构、模式协作、截图和测试结论。
- [Phase 2 验收矩阵](doc/phase2/requirements.md)：题目条目与代码、测试、文档证据的对应关系。
- [架构决策记录](doc/adr/)：模块边界、扩展契约、事务、读回、dirty 和加载策略。
- [VSCode 扩展说明](vscode-extension/README.md)：独立构建、隔离宿主和人工验收步骤。
- [可复现指标](docs/metrics/metrics.md)：由 Git 对象生成的文件职责、行数和圈复杂度对照。

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
