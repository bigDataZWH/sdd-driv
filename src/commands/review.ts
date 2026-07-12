import * as path from 'path';
import { select, checkbox } from '@inquirer/prompts';
import { fileExists, readDir } from '../utils/file-system.js';
import { ReviewSystemImpl } from '../core/review-system.js';
import { FileSystem } from '../utils/file-system.js';
import { TemplateManager } from '../core/template-manager.js';
import { StateMachine } from '../core/state-machine.js';
import { PathResolver } from '../core/path-resolver.js';
import { YamlParser } from '../utils/yaml-parser.js';
import type { ReviewType, ReviewStatus, ChecklistResult } from '../core/review-system.js';

export interface ReviewOptions {
  json?: boolean;
  type?: ReviewType;
  change?: string;
}

const REVIEW_TYPES: Array<{ value: ReviewType; name: string; description: string }> = [
  { value: 'requirement', name: '需求评审', description: '检查需求描述、验收标准、范围边界' },
  { value: 'technical', name: '技术评审', description: '检查技术方案、架构设计、接口设计' },
  { value: 'code', name: '代码评审', description: '检查代码质量、测试覆盖、安全漏洞' },
];

async function getActiveChanges(projectPath: string): Promise<string[]> {
  const changesDir = path.join(projectPath, 'openspec', 'changes');
  if (!(await fileExists(changesDir))) return [];

  const entries = await readDir(changesDir);
  const changes: string[] = [];

  for (const entry of entries) {
    const changeDir = path.join(changesDir, entry);
    const statePath = path.join(changeDir, '.driv.yaml');
    if (await fileExists(statePath)) {
      changes.push(entry);
    }
  }

  return changes;
}

async function selectChange(projectPath: string, options: ReviewOptions): Promise<string> {
  if (options.change) return options.change;

  const changes = await getActiveChanges(projectPath);
  if (changes.length === 0) {
    throw new Error('No changes found. Create a change first with /driv command.');
  }
  if (changes.length === 1) return changes[0];

  return select({
    message: 'Select a change to review:',
    choices: changes.map((name) => ({ name, value: name })),
  });
}

async function selectReviewType(options: ReviewOptions): Promise<ReviewType> {
  if (options.type) return options.type;

  const typeId = await select({
    message: 'Select review type:',
    choices: REVIEW_TYPES.map((t) => ({ name: `${t.name} — ${t.description}`, value: t.value })),
  });

  return typeId;
}

function formatChecklistResult(result: ChecklistResult): string {
  const lines: string[] = [];
  lines.push(`\n  ${result.type} review checklist:`);

  for (const item of result.items) {
    const statusIcon = item.passed === true ? '✓' : item.passed === false ? '✗' : '○';
    const checkType = item.autoCheck ? '(自动)' : '(人工)';
    lines.push(`    ${statusIcon} ${item.name} ${checkType}`);
    if (item.detail) {
      lines.push(`       ${item.detail}`);
    }
  }

  lines.push(`\n  Auto-checks passed: ${result.allAutoPassed ? 'Yes' : 'No'}`);
  return lines.join('\n');
}

function formatReviewStatus(status: ReviewStatus): string {
  switch (status) {
    case 'passed':
      return '✓ passed';
    case 'failed':
      return '✗ failed';
    default:
      return '○ pending';
  }
}

export async function reviewCommand(
  targetPath: string,
  options: ReviewOptions = {},
): Promise<void> {
  const projectPath = path.resolve(targetPath);
  const log = options.json ? () => undefined : console.log;

  const changeName = await selectChange(projectPath, options);
  const reviewType = await selectReviewType(options);

  const fs = new FileSystem(projectPath);
  const pathResolver = new PathResolver(projectPath);
  const yamlParser = new YamlParser(fs);
  const templateManager = new TemplateManager(fs, projectPath);
  const stateMachine = new StateMachine(fs, yamlParser, pathResolver);
  const reviewSystem = new ReviewSystemImpl(fs, templateManager, stateMachine, pathResolver);

  if (!options.json) {
    log(`\n  Review: ${reviewType} review for ${changeName}\n`);
  }

  const action = await select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Create review', value: 'create' },
      { name: 'Run checklist', value: 'checklist' },
      { name: 'Submit review', value: 'submit' },
      { name: 'Check status', value: 'status' },
      { name: 'List all reviews', value: 'list' },
    ],
  });

  let result: Record<string, unknown> = {};

  switch (action) {
    case 'create': {
      const filePath = await reviewSystem.createReview(changeName, reviewType);
      if (!options.json) {
        log(`  Created review file: ${filePath}`);
      }
      result = { action: 'create', filePath };
      break;
    }
    case 'checklist': {
      const checklistResult = await reviewSystem.executeChecklist(changeName, reviewType);
      if (!options.json) {
        log(formatChecklistResult(checklistResult));
      }
      result = { action: 'checklist', ...checklistResult };
      break;
    }
    case 'submit': {
      await reviewSystem.submitReview(changeName, reviewType);
      const status = await reviewSystem.checkStatus(changeName, reviewType);
      if (!options.json) {
        log(`  Review submitted. Current status: ${formatReviewStatus(status)}`);
      }
      result = { action: 'submit', status };
      break;
    }
    case 'status': {
      const status = await reviewSystem.checkStatus(changeName, reviewType);
      if (!options.json) {
        log(`  ${reviewType} review status: ${formatReviewStatus(status)}`);
      }
      result = { action: 'status', status };
      break;
    }
    case 'list': {
      const reviews = await reviewSystem.listReviews(changeName);
      if (!options.json) {
        if (reviews.length === 0) {
          log('  No reviews found for this change.');
        } else {
          log('  Reviews:');
          for (const review of reviews) {
            log(`    ${review.type} — ${formatReviewStatus(review.status)}`);
          }
        }
      }
      result = { action: 'list', reviews };
      break;
    }
  }

  if (options.json) {
    console.log(JSON.stringify({ change: changeName, reviewType, ...result }, null, 2));
  }
}
