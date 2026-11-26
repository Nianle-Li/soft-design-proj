# ADR-006：ShapeProvider 与模型拆分契约

- 状态：已接受并实现。
- 决策日期：2026-11-23。
- 依据：Phase 2 §1、§4、§6；Phase 1 §4.1、§4.4、§6.1；架构边界见 [ADR-005](ADR-005-phase2-plugin-boundaries.md)。

## 问题与不变量

Phase 1 的中央工厂同时解析 CLI 参数、SVG 属性并构造六种具体图形，封闭的 `ShapeSpec` 和具体 `GroupShape` 类型使新增复合图形必须修改内核。Phase 2 要求所有图形经注册机制创建和读回，同时保持旧命令、错误、树输出、SVG 字节、撤销粒度及失败原子性。

比较了四种方案：扩大中央工厂仍违反开放封闭原则；向插件公开文档写入事务会扩大可变接口；让提供者返回分离树可保持创建原子性，但单独使用时无法保护复合图形的必要子部件。项目最终采用 C+：提供者返回分离的完整图形树，文档统一校验并接入，容器再通过窄的无副作用约束控制移出与解组。

## 最终契约

1. `ShapeProvider` 声明稳定类型名、SVG 标签及可选语义标记，负责解析本类型的创建参数和 SVG 输入。提供者只返回尚未接入文档的 `Shape` 子树，不接触文档索引或编辑历史。
2. `ShapeCreationContext` 只允许按已注册类型请求子图形。复合插件据此组合内置图形，不导入具体类；测试可用提供者替身。
3. `SvgReadInput` 只包含标签、已分配 id、属性映射、直接文本和递归构造的子图形，不泄漏 XML DOM。适配器处理文档级 XML 规则，提供者处理类型专有属性和结构。
4. `ContainerShape` 将“可收纳子节点”与“允许解组”分开，并提供无副作用的移出与解组检查。文档在多目标操作前完成全部检查，避免部分修改。
5. 文档在接入前检查整棵候选树的对象身份、环、id、索引冲突及父子关系。成功后整体索引并保存局部撤销收据；失败时树、索引和历史均不改变。
6. 六种内置图形位于 `src/builtin/shapes/`，与可选图形一样只通过公开契约接入。`SvgDocument`、`EditorSession` 和 `SvgCodec` 均显式接收提供者注册表，核心不导入具体图形实现。

## 行为与错误边界

- `create` 依次完成提供者选择、分离树构造、整树预检和一次性接入；一次创建对应一个 undo 单元。
- `group`、`addto`、`delete` 在修改前检查全部来源容器。任何拒绝都保持结构和历史不变；整棵复合图形的撤销不会逐个拆离必要子部件。
- `read` 先构造完整候选文档，成功后才替换会话。未安装 box 插件时，带其标记的 `g` 降级为普通分组；重复 id 始终拒绝整份输入。
- 未注册类型报 `unknown shape type` 或 Phase 1 兼容的 `unsupported SVG element`；已注册但缺少读回能力时明确报告契约错误，不回退到中央工厂。
- `<text>` 的元素子节点仍由适配器优先报告 `unsupported child element in <text>`，保留 Phase 1 的错误顺序；其他类型专有结构由各提供者验证。

## 实现与验证

所有内置及可选图形均经 `ShapeProviderRegistry` 创建和读回。代码库不包含 `ShapeFactory`、封闭 `ShapeSpec` 或无注册表回退路径，依赖检查拒绝核心导入 `src/builtin/`。测试覆盖非法或重复 id、共享节点、循环引用、注册与禁用、未知类型、失败原子性、容器保护、整树 undo/redo、SVG 降级及 Phase 1 字节基线。

box 的严格结构与必要子部件见 [ADR-011](ADR-011-box-read-and-structure-protection.md)，属性回滚见 [ADR-009](ADR-009-attribute-handler-contract.md)，树装饰与 dirty 语义见 [ADR-010](ADR-010-tree-decoration-and-dirty-semantics.md)，安装事务见 [ADR-012](ADR-012-plugin-installation-transaction.md)。
