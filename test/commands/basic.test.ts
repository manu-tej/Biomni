import { BIOMNI_COMMANDS } from '../../src/commands/index';

describe('Basic Command System Tests', () => {
  describe('Command Definitions', () => {
    it('should have defined commands', () => {
      expect(BIOMNI_COMMANDS.length).toBeGreaterThanOrEqual(20);
    });

    it('should have all required properties', () => {
      BIOMNI_COMMANDS.forEach(cmd => {
        expect(cmd.command).toMatch(/^biomni\./);
        expect(cmd.title).toBeTruthy();
        expect(cmd.category).toBeTruthy();
        expect(cmd.description).toBeTruthy();
        expect(cmd.handler).toMatch(/^handle[A-Z]/);
        expect(cmd.priority).toBeGreaterThan(0);
      });
    });

    it('should have unique command identifiers', () => {
      const commandIds = BIOMNI_COMMANDS.map(cmd => cmd.command);
      const uniqueIds = new Set(commandIds);
      expect(uniqueIds.size).toBe(commandIds.length);
    });

    it('should have high priority core database commands', () => {
      const coreDatabaseCommands = BIOMNI_COMMANDS.filter(cmd => 
        cmd.category === 'Database' && cmd.command.startsWith('biomni.database.')
      );
      expect(coreDatabaseCommands.length).toBeGreaterThan(0);
      coreDatabaseCommands.forEach(cmd => {
        expect(cmd.priority).toBeGreaterThanOrEqual(85);
      });
    });

    it('should have genomics commands with appropriate priorities', () => {
      const genomicsCommands = BIOMNI_COMMANDS.filter(cmd => cmd.category === 'Genomics');
      expect(genomicsCommands.length).toBeGreaterThan(0);
      
      const blastCommand = genomicsCommands.find(cmd => cmd.command === 'biomni.genomics.blastSequence');
      expect(blastCommand).toBeDefined();
      expect(blastCommand?.priority).toBe(100);
    });

    it('should have keyboard shortcuts for key commands', () => {
      const shortcutCommands = BIOMNI_COMMANDS.filter(cmd => cmd.keybinding);
      expect(shortcutCommands.length).toBeGreaterThanOrEqual(4);
      
      const shortcuts = shortcutCommands.reduce((acc, cmd) => {
        acc[cmd.command] = cmd.keybinding;
        return acc;
      }, {} as Record<string, string | undefined>);

      expect(shortcuts['biomni.database.queryUniprot']).toBe('ctrl+shift+u');
      expect(shortcuts['biomni.genomics.blastSequence']).toBe('ctrl+shift+b');
      expect(shortcuts['biomni.pharmacology.runDiffDock']).toBe('ctrl+shift+d');
      expect(shortcuts['biomni.file.validateFormat']).toBe('ctrl+shift+v');
    });

    it('should have context-sensitive commands', () => {
      const contextualCommands = BIOMNI_COMMANDS.filter(cmd => cmd.when);
      expect(contextualCommands.length).toBeGreaterThan(0);
      
      const fastaCommands = contextualCommands.filter(cmd => 
        cmd.when && cmd.when.includes('fasta')
      );
      expect(fastaCommands.length).toBeGreaterThan(0);
    });
  });
});