---
template: prd-default
version: 2.0
based_on: 华为产品需求文档（PRD）规范
placeholders_required:
  - change_name
  - proposer
  - created_at
required_sections:
  - 需求概述
  - 需求目标
  - 业务价值
  - 用户场景
  - 功能需求
  - 非功能需求
  - 约束与依赖
  - 风险分析
  - 验收标准
  - 里程碑
---

# 产品需求文档：{{change_name}}

## 一、基本信息

| 项目 | 内容 |
|------|------|
| 变更名称 | {{change_name}} |
| 文档版本 | V1.0 |
| 提案人 | {{proposer}} |
| 创建日期 | {{created_at}} |
| 当前状态 | {{status:草稿/评审中/已确认}} |
| 优先级 | {{priority:P0/P1/P2}} |

## 二、需求概述

### 2.1 需求背景

{{background}}

> 描述需求产生的业务背景、市场机会或客户痛点。

### 2.2 现状分析

{{current_status}}

> 说明当前系统的实现现状、存在的问题或不足。

## 三、需求目标

### 3.1 业务目标

{{business_goal}}

> 用 SMART 原则描述：Specific（具体）、Measurable（可衡量）、Achievable（可达）、Relevant（相关）、Time-bound（有时限）。

### 3.2 量化指标

| 指标名称 | 当前值 | 目标值 | 衡量方式 |
|----------|--------|--------|----------|
| {{metric_name}} | {{current_metric}} | {{target_metric}} | {{measurement}} |

## 四、业务价值

### 4.1 用户价值

{{user_value}}

> 描述对最终用户带来的价值（效率提升、体验优化等）。

### 4.2 业务价值

{{business_value}}

> 描述对业务带来的价值（收入增长、成本降低、风险规避等），尽量量化。

### 4.3 技术价值

{{tech_value}}

> 描述对技术架构的贡献（可维护性、可扩展性、性能提升等）。

## 五、用户场景

### 5.1 用户画像

| 角色 | 特征 | 核心诉求 |
|------|------|----------|
| {{persona}} | {{persona_traits}} | {{persona_needs}} |

### 5.2 用户故事

{{user_stories}}

> 采用 "作为<角色>，我希望<功能>，以便<价值>" 格式。

### 5.3 核心场景

**场景 1：{{scenario_name}}**

- **触发条件**：{{trigger}}
- **前置条件**：{{precondition}}
- **主流程**：
  1. {{step_1}}
  2. {{step_2}}
  3. {{step_3}}
- **预期结果**：{{expected_result}}

## 六、功能需求

### 6.1 功能范围

**范围内**

{{in_scope}}

**范围外**

{{out_scope}}

### 6.2 功能需求清单（FR）

| FR 编号 | 功能名称 | 描述 | 优先级 | 依赖 |
|---------|----------|------|--------|------|
| FR-001 | {{feature_name}} | {{feature_desc}} | {{fr_priority:P0/P1/P2}} | {{dependency}} |

> 优先级定义：
> - **P0（Must Have）**：MVP 必须，缺失则产品不可用
> - **P1（Should Have）**：重要但非首期必须
> - **P2（Nice to Have）**：锦上添花，可后续迭代

### 6.3 功能详细说明

#### FR-001：{{feature_name}}

- **输入**：{{input}}
- **处理逻辑**：{{logic}}
- **输出**：{{output}}
- **异常处理**：{{exception_handling}}

## 七、非功能需求

### 7.1 性能需求

| 指标 | 要求 |
|------|------|
| 响应时间 | {{response_time:≤200ms}} |
| 吞吐量 | {{throughput:≥1000 QPS}} |
| 并发用户数 | {{concurrent_users}} |
| 数据量级 | {{data_volume}} |

### 7.2 安全需求

{{security_requirements}}

> 包括认证授权、数据加密、审计日志、合规要求等。

### 7.3 可用性需求

{{availability_requirements}}

> 包括 SLA、故障恢复时间（RTO）、数据恢复点（RPO）等。

### 7.4 可维护性需求

{{maintainability_requirements}}

> 包括代码规范、测试覆盖率、文档要求、监控告警等。

### 7.5 兼容性需求

{{compatibility_requirements}}

> 包括浏览器/操作系统/数据库版本、API 向后兼容、数据迁移等。

## 八、约束与依赖

### 8.1 技术约束

{{technical_constraints}}

> 技术栈选择、架构约束、遗留系统兼容等。

### 8.2 业务约束

{{business_constraints}}

> 合规要求、时间窗口、资源限制等。

### 8.3 依赖关系

| 依赖项 | 类型 | 说明 | 负责方 |
|--------|------|------|--------|
| {{dependency_name}} | {{dep_type:内部/外部/第三方}} | {{dep_desc}} | {{owner}} |

## 九、风险分析

| 风险编号 | 风险描述 | 影响 | 概率 | 应对策略 |
|----------|----------|------|------|----------|
| R-001 | {{risk_desc}} | {{impact:高/中/低}} | {{probability:高/中/低}} | {{mitigation}} |

> 风险评估矩阵：
> - **高影响 + 高概率**：必须规避或转移
> - **高影响 + 低概率**：制定应急预案
> - **低影响 + 高概率**：降低影响
> - **低影响 + 低概率**：监控即可

## 十、验收标准

### 10.1 功能验收

{{acceptance_criteria}}

> 采用 Given-When-Then 格式，每个 FR 至少 1 条验收用例。

### 10.2 非功能验收

| 验收项 | 验收标准 | 验证方式 |
|--------|----------|----------|
| {{nfr_item}} | {{nfr_criteria}} | {{verification_method}} |

## 十一、里程碑

| 里程碑 | 交付物 | 预计完成 | 负责人 |
|--------|--------|----------|--------|
| M1: 需求确认 | PRD 评审通过 | {{m1_date}} | {{m1_owner}} |
| M2: 设计完成 | design.md + specs | {{m2_date}} | {{m2_owner}} |
| M3: 开发完成 | 源码 + 单元测试 | {{m3_date}} | {{m3_owner}} |
| M4: 验证通过 | 验证报告 | {{m4_date}} | {{m4_owner}} |
| M5: 上线发布 | 归档 + 部署 | {{m5_date}} | {{m5_owner}} |

## 十二、附录

### 12.1 术语表

| 术语 | 含义 |
|------|------|
| {{term}} | {{definition}} |

### 12.2 参考资料

- {{reference_1}}
- {{reference_2}}

### 12.3 修订记录

| 版本 | 日期 | 修订人 | 修订内容 |
|------|------|--------|----------|
| V1.0 | {{created_at}} | {{proposer}} | 初始版本 |
