import { 
  BIOMNI_COMMANDS, 
  getCommandsByCategory, 
  getCommandsByPriority, 
  getContextualCommands, 
  getCommandById, 
  getAllCategories,
  generateCommandContributions,
  generateKeybindingContributions,
  generateMenuContributions
} from '../../src/commands/index';

describe('Command Definitions', () => {
  describe('BIOMNI_COMMANDS', () => {
    it('should contain exactly 20 commands', () => {
      expect(BIOMNI_COMMANDS).toHaveLength(20);
    });

    it('should have all required properties for each command', () => {
      BIOMNI_COMMANDS.forEach(cmd => {
        expect(cmd).toHaveProperty('command');
        expect(cmd).toHaveProperty('title');
        expect(cmd).toHaveProperty('category');
        expect(cmd).toHaveProperty('description');
        expect(cmd).toHaveProperty('handler');
        expect(cmd).toHaveProperty('priority');
        
        expect(typeof cmd.command).toBe('string');
        expect(typeof cmd.title).toBe('string');
        expect(typeof cmd.category).toBe('string');
        expect(typeof cmd.description).toBe('string');
        expect(typeof cmd.handler).toBe('string');
        expect(typeof cmd.priority).toBe('number');
      });
    });

    it('should have unique command identifiers', () => {
      const commandIds = BIOMNI_COMMANDS.map(cmd => cmd.command);
      const uniqueIds = new Set(commandIds);
      expect(uniqueIds.size).toBe(commandIds.length);
    });

    it('should have valid priority values', () => {
      BIOMNI_COMMANDS.forEach(cmd => {
        expect(cmd.priority).toBeGreaterThan(0);
        expect(cmd.priority).toBeLessThanOrEqual(100);
      });
    });

    it('should have valid handler method names', () => {
      BIOMNI_COMMANDS.forEach(cmd => {
        expect(cmd.handler).toMatch(/^handle[A-Z]/);
      });
    });
  });

  describe('getCommandsByCategory', () => {
    it('should return commands filtered by category', () => {
      const databaseCommands = getCommandsByCategory('Database');
      expect(databaseCommands.length).toBeGreaterThan(0);
      databaseCommands.forEach(cmd => {
        expect(cmd.category).toBe('Database');
      });
    });

    it('should return empty array for non-existent category', () => {
      const nonExistentCommands = getCommandsByCategory('NonExistent' as any);
      expect(nonExistentCommands).toHaveLength(0);
    });

    it('should return genomics commands', () => {
      const genomicsCommands = getCommandsByCategory('Genomics');
      expect(genomicsCommands.length).toBeGreaterThan(0);
      
      const blastCommand = genomicsCommands.find(cmd => cmd.command === 'biomni.genomics.blastSequence');
      expect(blastCommand).toBeDefined();
    });
  });

  describe('getCommandsByPriority', () => {
    it('should return commands sorted by priority (descending)', () => {
      const sortedCommands = getCommandsByPriority();
      expect(sortedCommands).toHaveLength(BIOMNI_COMMANDS.length);
      
      for (let i = 0; i < sortedCommands.length - 1; i++) {
        expect(sortedCommands[i].priority).toBeGreaterThanOrEqual(sortedCommands[i + 1].priority);
      }
    });

    it('should have highest priority commands first', () => {
      const sortedCommands = getCommandsByPriority();
      const firstCommand = sortedCommands[0];
      expect(firstCommand.priority).toBe(100);
    });
  });

  describe('getContextualCommands', () => {
    it('should return FASTA-specific commands for .fasta files', () => {
      const fastaCommands = getContextualCommands('.fasta');
      const blastCommand = fastaCommands.find(cmd => cmd.command === 'biomni.genomics.blastSequence');
      expect(blastCommand).toBeDefined();
    });

    it('should return general commands when no specific context', () => {
      const generalCommands = getContextualCommands('.txt');
      expect(generalCommands.length).toBeGreaterThan(0);
      
      // Should include commands without 'when' conditions
      const uniprotCommand = generalCommands.find(cmd => cmd.command === 'biomni.database.queryUniprot');
      expect(uniprotCommand).toBeDefined();
    });

    it('should return scRNA-seq commands for .h5 files', () => {
      const h5Commands = getContextualCommands('.h5');
      const scRNACommand = h5Commands.find(cmd => cmd.command === 'biomni.genomics.annotateScRNA');
      expect(scRNACommand).toBeDefined();
    });
  });

  describe('getCommandById', () => {
    it('should return correct command for valid ID', () => {
      const command = getCommandById('biomni.database.queryUniprot');
      expect(command).toBeDefined();
      expect(command?.title).toBe('Query UniProt Database');
    });

    it('should return undefined for invalid ID', () => {
      const command = getCommandById('invalid.command.id');
      expect(command).toBeUndefined();
    });
  });

  describe('getAllCategories', () => {
    it('should return all unique categories', () => {
      const categories = getAllCategories();
      expect(categories.length).toBeGreaterThan(0);
      
      // Check that some expected categories exist
      expect(categories).toContain('Database');
      expect(categories).toContain('Genomics');
      expect(categories).toContain('Pharmacology');
    });

    it('should return categories in sorted order', () => {
      const categories = getAllCategories();
      const sortedCategories = [...categories].sort();
      expect(categories).toEqual(sortedCategories);
    });
  });

  describe('generateCommandContributions', () => {
    it('should generate valid VSCode command contributions', () => {
      const contributions = generateCommandContributions();
      expect(contributions).toHaveLength(BIOMNI_COMMANDS.length);
      
      contributions.forEach(contrib => {
        expect(contrib).toHaveProperty('command');
        expect(contrib).toHaveProperty('title');
        expect(contrib).toHaveProperty('category');
        expect(contrib).toHaveProperty('shortTitle');
        expect(contrib).toHaveProperty('icon');
        
        expect(contrib.category).toMatch(/^Biomni /);
      });
    });

    it('should preserve command identifiers', () => {
      const contributions = generateCommandContributions();
      const originalCommands = BIOMNI_COMMANDS.map(cmd => cmd.command);
      const contributedCommands = contributions.map(contrib => contrib.command);
      
      expect(contributedCommands.sort()).toEqual(originalCommands.sort());
    });
  });

  describe('generateKeybindingContributions', () => {
    it('should generate keybindings only for commands with shortcuts', () => {
      const keybindings = generateKeybindingContributions();
      
      keybindings.forEach(binding => {
        expect(binding).toHaveProperty('command');
        expect(binding).toHaveProperty('key');
        expect(binding).toHaveProperty('when');
        
        const originalCommand = BIOMNI_COMMANDS.find(cmd => cmd.command === binding.command);
        expect(originalCommand).toBeDefined();
        expect(originalCommand?.keybinding).toBe(binding.key);
      });
    });

    it('should include expected keyboard shortcuts', () => {
      const keybindings = generateKeybindingContributions();
      const keybindingMap = keybindings.reduce((acc, kb) => {
        acc[kb.command] = kb.key;
        return acc;
      }, {} as Record<string, string>);
      
      expect(keybindingMap['biomni.database.queryUniprot']).toBe('ctrl+shift+u');
      expect(keybindingMap['biomni.genomics.blastSequence']).toBe('ctrl+shift+b');
      expect(keybindingMap['biomni.pharmacology.runDiffDock']).toBe('ctrl+shift+d');
      expect(keybindingMap['biomni.file.validateFormat']).toBe('ctrl+shift+v');
    });
  });

  describe('generateMenuContributions', () => {
    it('should generate valid menu contributions', () => {
      const menus = generateMenuContributions();
      
      expect(menus).toHaveProperty('explorer/context');
      expect(menus).toHaveProperty('editor/context');
      expect(menus).toHaveProperty('commandPalette');
      
      expect(Array.isArray(menus['explorer/context'])).toBe(true);
      expect(Array.isArray(menus['editor/context'])).toBe(true);
      expect(Array.isArray(menus['commandPalette'])).toBe(true);
    });

    it('should include context-aware menu items', () => {
      const menus = generateMenuContributions();
      const explorerMenu = menus['explorer/context'];
      
      const fastaBlastMenu = explorerMenu.find((item: any) => 
        item.command === 'biomni.genomics.blastSequence'
      );
      expect(fastaBlastMenu).toBeDefined();
      expect(fastaBlastMenu.when).toContain('fasta');
    });

    it('should include all commands in command palette', () => {
      const menus = generateMenuContributions();
      const paletteCommands = menus['commandPalette'].map((item: any) => item.command);
      
      // Should include all main analysis commands
      expect(paletteCommands).toContain('biomni.database.queryUniprot');
      expect(paletteCommands).toContain('biomni.genomics.blastSequence');
      expect(paletteCommands).toContain('biomni.pharmacology.runDiffDock');
    });
  });

  describe('Command Categories Distribution', () => {
    it('should have appropriate distribution of commands across categories', () => {
      const categoryCount = BIOMNI_COMMANDS.reduce((acc, cmd) => {
        acc[cmd.category] = (acc[cmd.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Database category should have multiple commands
      expect(categoryCount['Database']).toBeGreaterThan(1);
      
      // Should have genomics commands
      expect(categoryCount['Genomics']).toBeGreaterThan(0);
      
      // Should have pharmacology commands
      expect(categoryCount['Pharmacology']).toBeGreaterThan(0);
    });
  });

  describe('Command Priorities', () => {
    it('should have database commands with high priority', () => {
      const databaseCommands = getCommandsByCategory('Database');
      databaseCommands.forEach(cmd => {
        expect(cmd.priority).toBeGreaterThanOrEqual(85);
      });
    });

    it('should have genomics commands with high priority', () => {
      const genomicsCommands = getCommandsByCategory('Genomics');
      const highPriorityCommands = genomicsCommands.filter(cmd => cmd.priority >= 85);
      expect(highPriorityCommands.length).toBeGreaterThan(0);
    });
  });
});