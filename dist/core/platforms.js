const OPENCODE_PLATFORM = {
    id: 'opencode',
    name: 'OpenCode',
    skillsDir: '.opencode',
    globalSkillsDir: '.config/opencode',
    openspecToolId: 'opencode',
};
export const PLATFORMS = [OPENCODE_PLATFORM];
export function getPlatformSkillsDir(platform, scope) {
    if (scope === 'global' && platform.globalSkillsDir) {
        return platform.globalSkillsDir;
    }
    return platform.skillsDir;
}
//# sourceMappingURL=platforms.js.map