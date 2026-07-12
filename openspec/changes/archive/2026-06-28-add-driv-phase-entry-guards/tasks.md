## 1. Entry Guard 实现

- [x] 1.1 实现 design entry guard（check clarify complete、proposal exists、req review passed）
- [x] 1.2 实现 build entry guard（check design complete、design doc、tech review、handoff hash valid）
- [x] 1.3 实现 verify entry guard（check build complete、code committed、tests pass、code review）
- [x] 1.4 实现 archive entry guard（check verify complete、verifyResult==pass、branch handled）

## 2. PhaseGuard 接入 CLI

- [ ] 2.1 guard 接入 /driv-design CLI 命令
- [ ] 2.2 guard 接入 /driv-build CLI 命令
- [ ] 2.3 guard 接入 /driv-verify CLI 命令
- [ ] 2.4 guard 接入 /driv-archive CLI 命令

## 3. Artifact 统一 + handoff hash

- [x] 3.1 统一 archive artifact 值为字符串
- [x] 3.2 handoff hash 验证接入 build entry
- [x] 3.3 测试覆盖全量 entry guard 场景

## 4. 测试

- [x] 4.1 entry guard 单元测试（per-phase）
- [ ] 4.2 handoff hash drift 测试
- [ ] 4.3 全量测试通过
