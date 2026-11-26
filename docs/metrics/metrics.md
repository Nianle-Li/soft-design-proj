# Phase 2 可复现指标

- 基线：`final`
- 目标：`p2`
- 行数：Git 中源文件的物理行数。
- 圈复杂度：每个函数/方法基数 1，加 if、循环、catch、case、条件表达式及逻辑短路分支。
- 历史目录映射：`src/model`、`src/editor` 归内核；`src/cli`、`src/svg` 归装配。VSCode 始终单列。

## 汇总

| 分类                | 基线文件 | 目标文件 | Δ文件 | 基线行数 | 目标行数 | Δ行数 | 基线复杂度 | 目标复杂度 | Δ复杂度 |
| ------------------- | -------: | -------: | ----: | -------: | -------: | ----: | ---------: | ---------: | ------: |
| CLI 内核            |       29 |       30 |    +1 |     2606 |     2253 |  -353 |        486 |        425 |     -61 |
| 装配与技术支持      |        6 |       15 |    +9 |      693 |     1220 |  +527 |        222 |        337 |    +115 |
| 内置及可选插件      |        0 |       30 |   +30 |        0 |     1362 | +1362 |          0 |        271 |    +271 |
| VSCode 扩展（单列） |        0 |        3 |    +3 |        0 |      118 |  +118 |          0 |         19 |     +19 |

## 目标文件清单与职责

| 文件                                             | 分类                | 职责                             | 行数 | 圈复杂度 |
| ------------------------------------------------ | ------------------- | -------------------------------- | ---: | -------: |
| `plugins/box/BoxAttributeHandler.ts`             | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   26 |        7 |
| `plugins/box/BoxShape.ts`                        | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   64 |       15 |
| `plugins/box/BoxShapeProvider.ts`                | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   74 |       23 |
| `plugins/box/BoxTypeDecorator.ts`                | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   10 |        3 |
| `plugins/box/index.ts`                           | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   23 |        1 |
| `plugins/diamond/DiamondShape.ts`                | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   44 |       11 |
| `plugins/diamond/DiamondShapeProvider.ts`        | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   86 |       27 |
| `plugins/diamond/index.ts`                       | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   15 |        1 |
| `plugins/dir/DirCommand.ts`                      | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   36 |       15 |
| `plugins/dir/DirectoryReader.ts`                 | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   12 |        0 |
| `plugins/dir/adapters/NodeDirectoryReader.ts`    | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   19 |        7 |
| `plugins/dir/index.ts`                           | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   16 |        1 |
| `plugins/modified-star/ModifiedStarDecorator.ts` | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   39 |        7 |
| `plugins/modified-star/index.ts`                 | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   15 |        1 |
| `plugins/stats/StatsCommand.ts`                  | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   32 |        8 |
| `plugins/stats/index.ts`                         | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   15 |        1 |
| `src/adapters/svg/SvgCodec.ts`                   | 装配与技术支持      | CLI、持久化适配或应用装配        |  222 |       77 |
| `src/adapters/svg/SvgFileStore.ts`               | 装配与技术支持      | CLI、持久化适配或应用装配        |   57 |       10 |
| `src/builtin/shapes/CircleShape.ts`              | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |  101 |       17 |
| `src/builtin/shapes/CircleShapeProvider.ts`      | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   35 |        5 |
| `src/builtin/shapes/EllipseShape.ts`             | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |  116 |       19 |
| `src/builtin/shapes/EllipseShapeProvider.ts`     | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   39 |        5 |
| `src/builtin/shapes/GroupShape.ts`               | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   12 |        2 |
| `src/builtin/shapes/GroupShapeProvider.ts`       | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   27 |        5 |
| `src/builtin/shapes/LineShape.ts`                | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |  118 |       19 |
| `src/builtin/shapes/LineShapeProvider.ts`        | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   39 |        5 |
| `src/builtin/shapes/RectShape.ts`                | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |  116 |       19 |
| `src/builtin/shapes/RectShapeProvider.ts`        | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   37 |        5 |
| `src/builtin/shapes/ShapeArguments.ts`           | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   21 |        8 |
| `src/builtin/shapes/SvgShapeArguments.ts`        | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   34 |       10 |
| `src/builtin/shapes/TextShape.ts`                | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |  108 |       19 |
| `src/builtin/shapes/TextShapeProvider.ts`        | 内置及可选插件      | 具体图形、命令、标签或插件适配器 |   33 |        5 |
| `src/core/command/Command.ts`                    | CLI 内核            | 领域规则、编辑历史或扩展契约     |    6 |        0 |
| `src/core/command/CommandRegistry.ts`            | CLI 内核            | 领域规则、编辑历史或扩展契约     |   26 |        7 |
| `src/core/editor/AddToShapeCommand.ts`           | CLI 内核            | 领域规则、编辑历史或扩展契约     |   51 |        9 |
| `src/core/editor/CommandExecutor.ts`             | CLI 内核            | 领域规则、编辑历史或扩展契约     |   53 |        8 |
| `src/core/editor/CreateShapeCommand.ts`          | CLI 内核            | 领域规则、编辑历史或扩展契约     |   52 |        9 |
| `src/core/editor/DeleteShapeCommand.ts`          | CLI 内核            | 领域规则、编辑历史或扩展契约     |   47 |        8 |
| `src/core/editor/DocumentStore.ts`               | CLI 内核            | 领域规则、编辑历史或扩展契约     |   11 |        0 |
| `src/core/editor/EditCommand.ts`                 | CLI 内核            | 领域规则、编辑历史或扩展契约     |   87 |        0 |
| `src/core/editor/EditorSession.ts`               | CLI 内核            | 领域规则、编辑历史或扩展契约     |  159 |       26 |
| `src/core/editor/GroupShapeCommand.ts`           | CLI 内核            | 领域规则、编辑历史或扩展契约     |   46 |        7 |
| `src/core/editor/MoveShapeCommand.ts`            | CLI 内核            | 领域规则、编辑历史或扩展契约     |   47 |        7 |
| `src/core/editor/ReorderShapeCommand.ts`         | CLI 内核            | 领域规则、编辑历史或扩展契约     |   41 |        7 |
| `src/core/editor/ScaleShapeCommand.ts`           | CLI 内核            | 领域规则、编辑历史或扩展契约     |   45 |        7 |
| `src/core/editor/SetShapeCommand.ts`             | CLI 内核            | 领域规则、编辑历史或扩展契约     |   51 |        8 |
| `src/core/editor/UngroupShapeCommand.ts`         | CLI 内核            | 领域规则、编辑历史或扩展契约     |   45 |        7 |
| `src/core/model/AttributeHandler.ts`             | CLI 内核            | 领域规则、编辑历史或扩展契约     |   12 |        0 |
| `src/core/model/AttributeHandlerRegistry.ts`     | CLI 内核            | 领域规则、编辑历史或扩展契约     |   32 |        8 |
| `src/core/model/ContainerShape.ts`               | CLI 内核            | 领域规则、编辑历史或扩展契约     |  103 |       27 |
| `src/core/model/EditorError.ts`                  | CLI 内核            | 领域规则、编辑历史或扩展契约     |    7 |        1 |
| `src/core/model/PaintStyle.ts`                   | CLI 内核            | 领域规则、编辑历史或扩展契约     |   80 |       21 |
| `src/core/model/Shape.ts`                        | CLI 内核            | 领域规则、编辑历史或扩展契约     |  181 |       41 |
| `src/core/model/ShapeProvider.ts`                | CLI 内核            | 领域规则、编辑历史或扩展契约     |   23 |        0 |
| `src/core/model/ShapeProviderRegistry.ts`        | CLI 内核            | 领域规则、编辑历史或扩展契约     |   58 |       14 |
| `src/core/model/SvgDocument.ts`                  | CLI 内核            | 领域规则、编辑历史或扩展契约     |  859 |      193 |
| `src/core/model/SvgNodeView.ts`                  | CLI 内核            | 领域规则、编辑历史或扩展契约     |   13 |        0 |
| `src/core/model/TreeView.ts`                     | CLI 内核            | 领域规则、编辑历史或扩展契约     |   38 |        0 |
| `src/core/plugin-api.ts`                         | CLI 内核            | 领域规则、编辑历史或扩展契约     |   12 |        0 |
| `src/core/plugin/Plugin.ts`                      | CLI 内核            | 领域规则、编辑历史或扩展契约     |   20 |        0 |
| `src/core/tree/TreeDecorator.ts`                 | CLI 内核            | 领域规则、编辑历史或扩展契约     |   14 |        0 |
| `src/core/tree/TreeDecoratorRegistry.ts`         | CLI 内核            | 领域规则、编辑历史或扩展契约     |   34 |       10 |
| `src/host/assembly/ApplicationAssembly.ts`       | 装配与技术支持      | CLI、持久化适配或应用装配        |   54 |        6 |
| `src/host/assembly/CodePlugins.ts`               | 装配与技术支持      | CLI、持久化适配或应用装配        |   13 |        0 |
| `src/host/assembly/DefaultAttributes.ts`         | 装配与技术支持      | CLI、持久化适配或应用装配        |    9 |        1 |
| `src/host/assembly/DefaultShapes.ts`             | 装配与技术支持      | CLI、持久化适配或应用装配        |   23 |        1 |
| `src/host/assembly/DefaultTreeDecorators.ts`     | 装配与技术支持      | CLI、持久化适配或应用装配        |    9 |        1 |
| `src/host/assembly/PluginConfig.ts`              | 装配与技术支持      | CLI、持久化适配或应用装配        |   42 |       15 |
| `src/host/assembly/PluginInstaller.ts`           | 装配与技术支持      | CLI、持久化适配或应用装配        |  146 |       34 |
| `src/host/assembly/PluginLoader.ts`              | 装配与技术支持      | CLI、持久化适配或应用装配        |  117 |       32 |
| `src/host/cli/ChangePresenter.ts`                | 装配与技术支持      | CLI、持久化适配或应用装配        |   80 |       31 |
| `src/host/cli/CliApp.ts`                         | 装配与技术支持      | CLI、持久化适配或应用装配        |  292 |       90 |
| `src/host/cli/CommandLineParser.ts`              | 装配与技术支持      | CLI、持久化适配或应用装配        |   39 |        9 |
| `src/host/cli/TreeFormatter.ts`                  | 装配与技术支持      | CLI、持久化适配或应用装配        |   90 |       23 |
| `src/main.ts`                                    | 装配与技术支持      | CLI、持久化适配或应用装配        |   27 |        7 |
| `vscode-extension/src/SvgFileMarker.ts`          | VSCode 扩展（单列） | 编辑器标记与大纲实践             |   21 |        4 |
| `vscode-extension/src/SvgOutline.ts`             | VSCode 扩展（单列） | 编辑器标记与大纲实践             |   46 |        8 |
| `vscode-extension/src/extension.ts`              | VSCode 扩展（单列） | 编辑器标记与大纲实践             |   51 |        7 |
