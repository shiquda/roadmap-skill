import type {
  Prompt,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * 精选Prompts - 帮助Agent更智能地使用Roadmap Skill
 */
export const projectPrompts: Prompt[] = [
  {
    name: 'recommendNextTasks',
    description: '智能推荐接下来要完成的优先任务，基于优先级、截止日期和项目状态',
    arguments: [
      {
        name: 'projectId',
        description: '特定项目的ID（可选，不提供则分析所有项目）',
        required: false,
      },
      {
        name: 'limit',
        description: '推荐任务数量（默认3个）',
        required: false,
      },
    ],
  },
  {
    name: 'autoPrioritize',
    description: '自动分析任务并智能调整优先级，考虑截止日期、任务依赖和项目重要性',
    arguments: [
      {
        name: 'projectId',
        description: '特定项目的ID（可选，不提供则分析所有项目）',
        required: false,
      },
    ],
  },
  {
    name: 'enhanceTaskDetails',
    description: '智能补充任务细节，包括描述、验收标准、子任务和所需资源',
    arguments: [
      {
        name: 'taskId',
        description: '要完善的任务ID',
        required: true,
      },
    ],
  },
  {
    name: 'quickCapture',
    description: '快速捕捉想法/任务，自动分类并建议优先级',
    arguments: [
      {
        name: 'idea',
        description: '要捕捉的想法或任务描述',
        required: true,
      },
      {
        name: 'projectId',
        description: '目标项目ID（可选）',
        required: false,
      },
    ],
  },
];

/**
 * 智能推荐下一步任务
 * 分析所有任务，基于优先级、截止日期、依赖关系推荐最优执行顺序
 */
export function getRecommendNextTasksPrompt(projectId?: string, limit?: string): GetPromptResult {
  const context = projectId
    ? `分析项目 ${projectId} 的任务`
    : '分析所有活跃项目的任务';

  const taskLimit = limit ? parseInt(limit, 10) : 3;

  return {
    description: '智能任务推荐助手',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${context}，请帮我推荐接下来应该优先完成的${taskLimit}个任务。

## 推荐逻辑（按优先级排序）：

### 1. 紧急且重要（Critical优先级 + 截止日期近）
- 今天或明天到期的Critical任务
- 已逾期的高优先级任务

### 2. 高价值任务（High优先级 + 有明确截止日期）
- 本周内到期的High优先级任务
- 阻塞其他任务的关键路径任务

### 3. 快速获胜（Medium优先级 + 预计耗时短）
- 可以在1-2小时内完成的Medium任务
- 能明显提升项目进度的任务

### 4. 计划内工作
- 已标记为"in-progress"但未完成的任务
- 即将到期的Normal优先级任务

## 请执行以下步骤：

1. **列出所有待办任务**（status = todo 或 in-progress）
2. **筛选出高优先级任务**：critical 和 high
3. **检查截止日期**：找出即将到期或已逾期的任务
4. **分析阻塞关系**：识别哪些任务阻塞了其他任务
5. **生成推荐列表**：给出${taskLimit}个最应该优先处理的任务，包含理由

## 输出格式：

### 立即处理（Critical）
1. **任务名** (项目名)
   - 原因：[为什么这个任务最紧急]
   - 建议行动：[具体做什么]

### 今日重点（High）
2. **任务名** (项目名)
   - 原因：[为什么这个任务重要]
   - 建议行动：[具体做什么]

### 后续跟进
3. **任务名** (项目名)
   - 原因：[为什么应该接下来做]
   - 建议行动：[具体做什么]

 请使用 list_tasks 工具获取任务数据，然后给出智能推荐。

## Important Reminder
When you start working on recommended tasks, please:
1. Use update_task to set task status to in-progress
2. After completing the task, use update_task to set status to done
3. If blocked or have issues, document in description and update status to review

Keep task status synchronized with actual progress!`,
        },
      },
    ],
  };
}

/**
 * 自动优先级优化
 * 根据截止日期、项目进度、任务依赖自动调整优先级
 */
export function getAutoPrioritizePrompt(projectId?: string): GetPromptResult {
  const context = projectId
    ? `分析项目 ${projectId} 的任务优先级`
    : '分析所有项目的任务优先级';

  return {
    description: '智能优先级优化助手',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${context}，请自动分析并建议优先级调整。

## 优先级调整规则：

### 升级为 Critical 的条件：
- [ ] 截止日期在48小时内且未完成
- [ ] 阻塞了其他high/critical任务
- [ ] 是项目关键路径上的任务且进度落后
- [ ] 有外部依赖（如客户、合作方）且时间紧迫

### 升级为 High 的条件：
- [ ] 截止日期在1周内
- [ ] 是重要里程碑的前置任务
- [ ] 长期卡在"in-progress"状态（超过3天）
- [ ] 影响多个团队成员的工作

### 降级为 Medium/Low 的条件：
- [ ] 截止日期还很远（>2周）且没有依赖
- [ ] 是"nice to have"功能而非核心功能
- [ ] 当前阶段不需要，可以延后

### 其他考虑因素：
- **项目整体进度**：进度落后的项目任务应提升优先级
- **资源可用性**：如果资源紧张，聚焦最高优先级
- **风险因素**：风险高的任务应提前处理

## 请执行以下步骤：

1. **获取所有任务**：使用 list_tasks 获取任务列表
2. **分析每个任务**：
   - 检查截止日期与当前日期的差距
   - 识别任务依赖关系
   - 评估项目整体健康度
3. **生成调整建议**：列出需要调整优先级的任务及理由
4. **批量更新**：使用 batch_update_tasks 执行优先级调整

## 输出格式：

### 建议升级为 Critical
| 任务 | 当前优先级 | 建议优先级 | 理由 |
|------|-----------|-----------|------|
| XXX | high → critical | 明天到期 |

### 建议升级为 High
| 任务 | 当前优先级 | 建议优先级 | 理由 |
|------|-----------|-----------|------|
| XXX | medium → high | 阻塞后续任务 |

### 建议降级
| 任务 | 当前优先级 | 建议优先级 | 理由 |
|------|-----------|-----------|------|
| XXX | high → medium | 可延后处理 |

### 保持不变（优先级合理）
- 列出优先级设置合理的任务

请给出分析结果，并在用户确认后执行批量更新。`,
        },
      },
    ],
  };
}

/**
 * 智能补充任务细节
 * 根据任务标题和上下文自动补充描述、验收标准等
 */
export function getEnhanceTaskDetailsPrompt(taskId: string): GetPromptResult {
  return {
    description: '任务细节完善助手',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `请帮我完善任务 ${taskId} 的细节。

## 完善内容：

### 1. 详细描述
- 任务的具体内容和背景
- 为什么要做这个任务
- 预期的业务价值或技术价值

### 2. 验收标准（Definition of Done）
列出明确的完成标准，例如：
- [ ] 功能实现并本地测试通过
- [ ] 代码通过Code Review
- [ ] 相关文档已更新
- [ ] 单元测试覆盖率>80%

### 3. 技术/实现细节
- 涉及的技术栈或模块
- 可能需要修改的文件
- 潜在的挑战或注意事项

### 4. 相关资源
- 相关文档链接
- 参考实现或示例代码
- 需要咨询的人员

### 5. 子任务建议（如果需要）
如果任务较复杂，建议拆分为子任务：
- 子任务1：...
- 子任务2：...
- 子任务3：...

## 请执行以下步骤：

1. **获取任务信息**：使用 get_task 查看当前任务详情
2. **获取项目上下文**：使用 get_project 了解项目背景
3. **分析任务类型**：
   - 如果是开发任务：补充技术细节、代码位置
   - 如果是设计任务：补充设计规范、评审标准
   - 如果是文档任务：补充文档结构、参考资料
   - 如果是测试任务：补充测试场景、覆盖范围
4. **生成完善内容**：使用 update_task 更新任务描述

## 更新后任务应包含：

\`\`\`
## 背景
[任务背景和目的]

## 验收标准
- [ ] [标准1]
- [ ] [标准2]
- [ ] [标准3]

## 技术细节
- 涉及模块：[模块名]
- 关键文件：[文件路径]
- 注意事项：[重要提醒]

## 相关资源
- 文档：[链接]
- 参考：[链接]
\`\`\`

请获取任务信息后，给出详细的完善建议。`,
        },
      },
    ],
  };
}

/**
 * 快速捕捉想法
 * 自动分类、建议优先级、推荐项目
 */
export function getQuickCapturePrompt(idea: string, projectId?: string): GetPromptResult {
  const projectContext = projectId
    ? `添加到项目 ${projectId}`
    : '自动选择最合适的项目';

  return {
    description: '快速捕捉助手',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `我要快速捕捉一个想法/任务："${idea}"

${projectContext}

## 请帮我完成以下步骤：

### 1. 任务信息提取
从描述中提取：
- **任务标题**：简洁明确的标题（动词开头）
- **任务描述**：补充上下文和细节
- **任务类型**：bug / feature / refactor / docs / chore
- **预估优先级**：critical / high / medium / low（基于描述判断紧急程度）

### 2. 项目推荐（如果未指定项目）
如果用户没有指定项目，请：
- 列出所有活跃项目
- 分析任务内容与哪个项目最相关
- 推荐最合适的项目

### 3. 标签建议
建议相关的标签：
- 类型标签：bug, feature, refactor, docs
- 优先级标签：urgent, important
- 领域标签：frontend, backend, design, testing（如适用）

### 4. 生成任务
使用 create_task 创建任务

### 5. Status Recommendation
After creating the task, if you start working on it immediately, consider setting the status to in-progress. Use update_task to keep progress updated during work, and mark as done when completed.

## 示例：

**输入**："用户反馈登录页面在手机上显示不对"

**输出**：
- 标题：修复登录页面移动端适配问题
- 描述：用户反馈登录页面在移动设备上显示异常，需要检查响应式布局。
- 类型：Bug
- 优先级：High（影响用户体验）
- 建议标签：bug, frontend, mobile
- 推荐项目：[如果有web项目则推荐]

## 当前想法分析：

想法："${idea}"

请分析并生成任务建议。用户确认后，执行 create_task 创建任务。`,
        },
      },
    ],
  };
}

/**
 * 根据名称获取Prompt
 */
export function getPromptByName(name: string, args?: Record<string, string>): GetPromptResult | null {
  switch (name) {
    case 'recommendNextTasks':
      return getRecommendNextTasksPrompt(args?.projectId, args?.limit);
    case 'autoPrioritize':
      return getAutoPrioritizePrompt(args?.projectId);
    case 'enhanceTaskDetails':
      return getEnhanceTaskDetailsPrompt(args?.taskId || '');
    case 'quickCapture':
      return getQuickCapturePrompt(args?.idea || '', args?.projectId);
    default:
      return null;
  }
}

/**
 * 获取所有可用的Prompts
 */
export function getAllPrompts(): Prompt[] {
  return projectPrompts;
}
