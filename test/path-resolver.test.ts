import { describe, it, expect } from 'vitest';
import * as path from 'path';

describe('PathResolver', () => {
  it('解析项目根目录', async () => {
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const resolver = new PathResolver('/repo');
    expect(resolver.root).toBe('/repo');
  });

  it('openspecDir 指向 openspec/', async () => {
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const resolver = new PathResolver('/repo');
    expect(resolver.openspecDir).toBe(path.join('/repo', 'openspec'));
  });

  it('changesDir 指向 openspec/changes/', async () => {
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const resolver = new PathResolver('/repo');
    expect(resolver.changesDir).toBe(path.join('/repo', 'openspec', 'changes'));
  });

  it('changeDir 返回正确的 change 目录', async () => {
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const resolver = new PathResolver('/repo');
    expect(resolver.changeDir('my-change')).toBe(
      path.join('/repo', 'openspec', 'changes', 'my-change'),
    );
  });

  it('stateFile 返回 .driv.yaml 路径', async () => {
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const resolver = new PathResolver('/repo');
    expect(resolver.stateFile('my-change')).toBe(
      path.join('/repo', 'openspec', 'changes', 'my-change', '.driv.yaml'),
    );
  });

  it('handoffDir 返回 .driv/handoff/ 路径', async () => {
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const resolver = new PathResolver('/repo');
    expect(resolver.handoffDir('my-change')).toBe(
      path.join('/repo', 'openspec', 'changes', 'my-change', '.driv', 'handoff'),
    );
  });

  it('normalize 统一分隔符', async () => {
    const { PathResolver } = await import('../src/core/path-resolver.js');
    const resolver = new PathResolver('/repo');
    const result = resolver.normalize('openspec\\changes\\test');
    expect(result).toBe('openspec/changes/test');
  });
});
