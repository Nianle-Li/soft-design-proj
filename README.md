# sw-design-lab

软件设计课程项目：Phase 1 SVG 命令行编辑器。

已确认四模块架构。当前支持六类内置图形的创建与主要编辑、撤销重做、严格子集的 SVG 读写，以及 `tree`、`show`、`help`；题目两段 Phase 1 会话已逐命令回放。列明的 Phase 1 验收场景已有自动化测试，未决语义与最终交付审计见课程文档；插件能力属于后续阶段。

## 开始使用

```powershell
npm install
npm run typecheck
npm run lint
npm run format:check
npm run deps:check
npm run tracked:check
npm test
npm run cli
```

PowerShell 若使用数组管道回放含中文的 CLI 脚本，请先执行 `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)`；交互输入不需要此设置。

详细的开发规则见 [AGENTS.md](AGENTS.md)，课程交付文档与需求追踪见 [doc/README.md](doc/README.md)。
