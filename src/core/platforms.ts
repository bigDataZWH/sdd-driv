export interface Platform {
  id: string;
  name: string;
  skillsDir: string;
  globalSkillsDir?: string;
  openspecToolId: string;
}

const OPENCODE_PLATFORM: Platform = {
  id: 'opencode',
  name: 'OpenCode',
  skillsDir: '.opencode',
  globalSkillsDir: '.config/opencode',
  openspecToolId: 'opencode',
};

export const PLATFORMS: Platform[] = [OPENCODE_PLATFORM];

export function getPlatformSkillsDir(platform: Platform, scope: 'project' | 'global'): string {
  if (scope === 'global' && platform.globalSkillsDir) {
    return platform.globalSkillsDir;
  }
  return platform.skillsDir;
}
