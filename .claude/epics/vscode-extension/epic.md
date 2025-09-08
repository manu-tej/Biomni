---
name: vscode-extension
status: backlog
created: 2025-09-07T17:51:27Z
progress: 0%
prd: .claude/prds/vscode-extension.md
github: https://github.com/manu-tej/Biomni/issues/38
---

# Epic: vscode-extension

## Overview

The Biomni VSCode Extension provides seamless integration of 100+ biomedical AI tools directly into VSCode, eliminating context switching for biomedical researchers and developers. The extension leverages VSCode's native MCP support and custom webviews to deliver AI chat integration, smart file detection, and rich visualization capabilities for biological data analysis.

## Architecture Decisions

- **MCP-First Integration**: Leverage VSCode's native Model Context Protocol support for AI chat integration
- **Extension API + WebViews**: Use standard VSCode extension APIs with custom webviews for complex visualizations
- **TypeScript Development**: Follow VSCode extension best practices with TypeScript for type safety
- **Modular Design**: Separate concerns between MCP communication, UI components, and data visualization
- **Progressive Enhancement**: Start with command palette and AI chat, add rich visualizations in phases

## Technical Approach

### Frontend Components
- **Extension Host**: Main extension entry point managing lifecycle and MCP server communication
- **Command Handlers**: Command palette integration for top 20 Biomni tools
- **AI Chat Provider**: Slash command integration (`/biomni.*`) for all tools
- **WebView Panels**: Custom panels for molecular visualization, sequence alignments, and complex results
- **Status Bar Integration**: Connection status, progress indicators, and quick actions
- **Settings Provider**: Configuration UI for API keys, preferences, and tool settings

### Backend Services
- **MCP Server Management**: Auto-start/stop existing `run_mcp_server.py` with extension lifecycle
- **Tool Registry**: Enhanced metadata system for tool discovery and context-aware suggestions
- **Result Processing**: Standardized result formatting for consistent UI presentation
- **File Analysis**: Content parsing for biological file formats (.fasta, .vcf, .pdb)
- **Background Jobs**: Non-blocking execution of long-running analyses

### Infrastructure
- **VSCode Marketplace**: Standard extension distribution and updates
- **Local Python Environment**: Leverage user's existing Python setup for MCP server
- **WebGL Visualization**: Browser-based 3D molecular rendering using existing libraries
- **Extension Packaging**: Standard webpack bundling with tree-shaking optimization

## Implementation Strategy

### Phase 1: Core Integration (3-4 weeks)
- MCP server lifecycle management
- Command palette integration
- AI chat slash commands
- Basic settings and API key management

### Phase 2: Smart Context (2-3 weeks)
- File type detection and analysis
- Context-aware tool suggestions
- Enhanced result presentation

### Phase 3: Rich Visualization (3-4 weeks)
- Custom webview panels
- 3D molecular visualization
- Interactive sequence alignments

## Task Breakdown Preview

High-level task categories that will be created:
- [ ] Extension Bootstrap: Project setup, TypeScript configuration, build system
- [ ] MCP Integration: Server lifecycle, communication protocols, error handling
- [ ] Command System: Palette integration, AI chat providers, tool registry
- [ ] Settings Management: Configuration UI, API key storage, user preferences
- [ ] File Detection: Biological format recognition, content analysis, smart suggestions
- [ ] WebView Framework: Custom panel architecture, messaging protocols
- [ ] Visualization Components: 3D rendering, sequence viewers, interactive charts
- [ ] Testing & Quality: Unit tests, integration tests, performance optimization
- [ ] Documentation: User guides, API docs, contribution guidelines
- [ ] Release Preparation: Marketplace listing, CI/CD pipeline, community outreach

## Dependencies

### External Service Dependencies
- VSCode 1.95+ with MCP support
- Python 3.8+ environment for MCP server
- Internet access for biomedical database queries
- User-provided API keys (Anthropic, OpenAI)

### Internal Team Dependencies
- Enhanced MCP server with improved tool metadata
- Performance optimization for interactive use cases
- Standardized result formats across all tools
- Community documentation and support materials

### Prerequisite Work
- Existing Biomni MCP server implementation
- Established tool registry with 100+ biomedical tools
- User community validation from GitHub Issue #174

## Success Criteria (Technical)

### Performance Benchmarks
- Extension activation time < 2 seconds
- Simple tool queries < 5 seconds response time
- Complex analyses < 30 seconds with progress indicators
- Memory overhead < 100MB for extension process

### Quality Gates
- 95% test coverage for core functionality
- Zero security vulnerabilities in dependency audit
- Successful CI/CD pipeline with automated testing
- VSCode marketplace compliance and approval

### Acceptance Criteria
- All 100+ Biomni tools accessible via AI chat
- Top 20 tools available in command palette
- Biological file formats automatically detected
- Rich visualization for protein structures and sequences

## Estimated Effort

### Overall Timeline: 8-10 weeks
- **Phase 1 (Core)**: 3-4 weeks - MCP integration, commands, basic UI
- **Phase 2 (Smart)**: 2-3 weeks - Context detection, enhanced UX
- **Phase 3 (Visual)**: 3-4 weeks - WebViews, 3D rendering, advanced features

### Resource Requirements
- 1 senior TypeScript/VSCode extension developer
- 0.5 Python developer for MCP server enhancements
- 0.25 UX designer for interface and workflow optimization
- 0.25 technical writer for documentation

### Critical Path Items
1. VSCode MCP integration stability and performance
2. Enhanced MCP server with interactive response times
3. WebGL visualization library selection and integration
4. VSCode marketplace approval and distribution process

## Tasks Created
- [ ] 001.md - Extension Bootstrap & Project Setup (parallel: true)
- [ ] 002.md - MCP Server Integration & Lifecycle Management (parallel: false)
- [ ] 003.md - Settings Management & Configuration UI (parallel: true)
- [ ] 004.md - Fix TypeScript Compilation and Enable Testing (parallel: false)
- [ ] 005.md - Connect Real Biomni MCP Server Integration (parallel: false)
- [ ] 006.md - Complete Export Functionality & Results Management (parallel: true)
- [ ] 007.md - Enhance Sidebar Provider & Tool Browsing (parallel: true)
- [ ] 008.md - Production Build & Performance Optimization (parallel: false)
- [ ] 009.md - VSIX Package Creation & Testing (parallel: false)
- [ ] 010.md - VSCode Marketplace Submission & Community Engagement (parallel: false)

Total tasks: 10
Parallel tasks: 4
Sequential tasks: 6
Estimated total effort: 130 hours