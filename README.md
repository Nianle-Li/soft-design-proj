# sw-design-lab

软件设计课程项目：Phase 1 SVG 命令行编辑器。

已确认四模块架构，六种 Phase 1 内置图形均可创建，正在按需求切片继续开发编辑与 SVG 读写。当前 CLI 尚未完成全部题目命令；各能力状态见课程文档。

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
