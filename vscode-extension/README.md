# VSCode SVG 标记与大纲（Phase 2 A.1–A.3）

## 启动与独立核验

1. 在本目录运行 `npm ci --cache ../.npm-cache`、`npm test`、`npm run typecheck`、`npm run build`。
2. 在本目录的 PowerShell 中运行 `code --extensionDevelopmentPath="$PWD" --disable-extensions --user-data-dir="$PWD/../tmp/vscode-ui-user" --extensions-dir="$PWD/../tmp/vscode-ui-extensions" "$PWD"` 启动隔离的 Extension Development Host，打开 `sample/example.svg`，展开 Explorer 和 Outline。VSCode 1.147.0 可能先以图像预览打开 SVG；在编辑器标签执行 **Reopen Editor With... → Configure default editor for `*.svg`... → Text Editor**，关闭并重新打开文件。只临时切换一次编辑器时，后续定位仍可能按默认关联回到图片预览。首次启动的欢迎页可选择 **Continue without Signing In**，然后 **Get Started**。
3. 在独立宿主中先**不加载本扩展**，同样以文本编辑器打开示例 SVG，记录 Outline 是否显示节点及显示格式；再加载本扩展对照。2026-11-23 的实际 UI 基线（VSCode 1.147.0，隔离用户目录与扩展目录，禁用其他扩展）显示 `No symbols found in document 'example.svg'`，见[基线截图](../doc/phase2/images/vscode-baseline-outline.png)。2026-11-13 的程序化基线（VSCode 1.146.0）还得到 `languageId=xml`、文档符号数组为空、SVG 第三方扩展列表为空。当时普通宿主检查到的 `jock.svg` 声明了 `.svg` 语言贡献及语言服务，`simonsiefke.svg-preview` 声明了 SVG 预览功能，因此普通宿主中的既有 Outline 结果不能直接归因于 VSCode 内置行为。
4. 确认 `explorer.decorations.badges` 已启用；先关闭 `git.decorations.enabled` 以隔离其他徽标，再在普通设置下复核。Explorer 中检查 `example.svg` 右侧是否显示完整 `[]`，`README.md` 和目录不显示；核对磁盘文件名与 `sample/example.svg` 内容未变。打开 Outline，检查 `svg`、`g#flow`、`rect#start`、`text` 层级；点击 `rect#start`，确认定位到第 3 行。把 `start` 改成 `changed`，检查大纲更新；暂时删除 `</g>`，检查不会崩溃，恢复后大纲复原。
5. 2026-11-23 在 VSCode 1.147.0 x64 的隔离 Extension Development Host 中取得[文件标记截图](../doc/phase2/images/vscode-svg-badge.png)与[大纲定位截图](../doc/phase2/images/vscode-svg-outline.png)。宿主使用 `--extensionDevelopmentPath` 加载本扩展、`--disable-extensions` 禁用其他扩展，并关闭 Git 装饰以清楚显示 `[]`；截图未经编辑。标记截图中目录与 `README.md` 无附加徽标，悬浮提示显示 `SVG file`；大纲截图中 `rect#start` 被选中，编辑器与状态栏显示第 3 行、第 5 列。

单元测试验证资源筛选、精确标记和从文本到源码偏移的映射。`test-host/index.js` 在 VSCode 1.147.0 的隔离 Extension Development Host 中再次通过程序化断言：非 SVG 文件、符号层级、源码选择范围、编辑更新及不完整 XML；无 id 的节点由单元测试及大纲截图共同核对。Explorer 标记、Outline 可见层级、点击定位与截图已在实际 UI 中核验。另在宿主打开文本编辑器时修改磁盘上的示例文件并重新聚焦：Outline 实际显示 `rect#changed`，不完整 XML 时显示无符号，恢复原文件后显示 `rect#start`，文件 SHA-256 保持不变。**在编辑器内直接输入时的 Outline 可见刷新**尚未可靠观察，待人工复核；宿主的 `WorkspaceEdit` 测试已验证文档符号会更新。

## API 与设计判断

VSCode 负责 Explorer 和原生 Outline 界面。本扩展在 `activate` 注册 `FileDecorationProvider` 和 `DocumentSymbolProvider`，VSCode 在渲染资源或请求当前文档符号时回调。文件提供者只对本地普通 `.svg` 文件返回 `[]` 元数据，不传播到父目录；符号提供者读取当前编辑器文本，生成嵌套的 `DocumentSymbol` 与源代码范围。编辑后由 VSCode 重新请求符号；XML 不完整时返回空数组。

文件标记比较了两种方案：直接改文件名/Explorer 树与使用文件装饰 API。选择后者，因为其返回值仅是 UI 元数据，且不拥有文件内容。大纲比较了自定义 `TreeView` 与 `DocumentSymbolProvider`。选择后者，因为题目要求使用 VSCode 原生 Outline，且 `DocumentSymbol` 自带层级和定位范围。符号解析比较了复用 Phase 1 `SvgCodec` 与独立的轻量 XML 源码投影。`SvgCodec` 面向 CLI 支持的 SVG 子集，会校验尺寸、命名空间、图形类型并给无 id 图形分配 id；它与 `TreeView`、`SvgNodeView` 均不保留原始源码范围。选择独立解析以保留位置、容忍题目未要求 CLI 支持的 SVG 元素，并避免改动 Phase 1 输出。代价是新增一个小型 XML 解析依赖；以后若 CLI 需要源码位置，再评估共享边界。

VSCode 的 file decoration 是注册提供者并附加视觉元数据，与 GoF Decorator 的对象包装和逐层委托不同；本扩展没有把文件对象包装成另一个文件对象。提供者把资源 URI、文件类型及 XML 文本转换为 VSCode 的 `FileDecoration`、`DocumentSymbol` 契约，这具有 Adapter 的接口转换作用，但不是 CLI 文件系统 Adapter 的复用实现。两种 API 都由 VSCode 反向调用扩展对象。
