import { PromptModule } from '@ai-pentest/contracts';
import { PromptRegistry } from './prompt-registry';

export class PromptLoader {
  private registry: PromptRegistry;

  constructor(registry: PromptRegistry) {
    this.registry = registry;
  }

  public assemble(tags: string[], variables: Record<string, string>): string {
    const modules: PromptModule[] = [];
    
    // De-duplicate modules if multiple tags pull the same module ID
    const selectedIds = new Set<string>();

    for (const tag of tags) {
      const tagModules = this.registry.findModulesByTag(tag);
      for (const mod of tagModules) {
        if (!selectedIds.has(mod.id)) {
          modules.push(mod);
          selectedIds.add(mod.id);
        }
      }
    }

    // Sort by some priority or just ID for consistency
    modules.sort((a, b) => a.id.localeCompare(b.id));

    return modules.map(mod => {
      let template = mod.template;
      for (const [key, value] of Object.entries(variables)) {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      return template;
    }).join('\n\n');
  }
}
