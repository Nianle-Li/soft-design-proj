# 验收素材

本目录保存直接来自 `phase_cli_1.md` 的只读验收素材，供后续测试实现使用。

- `transcripts/phase1-reference.golden.txt`：题目 §6 完整典型会话。
- `transcripts/phase1-flowchart.golden.txt`：题目 §6.1 版本 A 会话。
- `svg/other.svg`：题目 §6 配套的外部 SVG。

`.golden.txt` 当前是“输入、提示符与输出混排”的人类可审计原文，不预设未来测试运行器。建立 CLI 黑盒测试时，应由测试适配层识别 `svg>` 后的输入并核对相邻输出，不能为了适配实现而改写黄金文件。

题目中的版本 B `box` 会话不在这里：它属于后续插件化阶段；Phase 1 只应测试 `create box ...` 返回未知类型错误且状态不变。
