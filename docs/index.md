# Biomni VSCode Extension Documentation

Welcome to the comprehensive documentation for the Biomni VSCode Extension - your gateway to powerful bioinformatics tools directly within Visual Studio Code.

## Quick Navigation

### 📚 User Documentation
- **[Installation Guide](user-guide/installation.md)** - Get up and running in minutes
- **[Getting Started](user-guide/getting-started.md)** - Your first 5 minutes with Biomni
- **[Troubleshooting](user-guide/troubleshooting.md)** - Solutions to common issues

### 🔧 Developer Resources
- **[API Reference](api/commands.md)** - Complete command and configuration API
- **[Contribution Guide](developer/contribution-guide.md)** - Join the development community
- **[Architecture Overview](developer/architecture.md)** - Understanding the extension structure

### 🎥 Video Tutorials
- **[Video Tutorial Scripts](videos/)** - Comprehensive learning resources
- **[Getting Started in 2 Minutes](videos/scripts/01-getting-started-2min.md)** - Quick introduction

### ⚡ Performance & Accessibility
- **[Performance Optimization](performance/optimization-guide.md)** - Maximize speed and efficiency
- **[Accessibility Guide](accessibility/)** - Features for all users

## What is Biomni?

The Biomni VSCode Extension transforms Visual Studio Code into a comprehensive bioinformatics workbench. With support for major biological file formats, integration with popular analysis tools, and intelligent features powered by AI, Biomni makes computational biology accessible to researchers, educators, and students.

### Key Features

🧬 **File Format Support**
- FASTA, FASTQ, VCF, PDB, GFF, GTF, SAM, BAM, BED
- Automatic format detection and syntax highlighting
- Validation and statistics for all supported formats

🔍 **Analysis Tools**
- BLAST searches against multiple databases
- Multiple sequence alignment (ClustalW, MUSCLE, MAFFT)
- Sequence translation and ORF finding
- Variant annotation and filtering

🤖 **AI Integration**
- Model Context Protocol (MCP) server connectivity
- Intelligent suggestions and automation
- Context-aware help and documentation

⚙️ **Developer Friendly**
- Comprehensive API for extensions
- TypeScript-based architecture
- Extensive configuration options
- Performance optimization features

## Getting Started

### Quick Installation
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Biomni MCP Integration"
4. Click Install

### First Steps
1. **Open a biological file** (`.fasta`, `.fastq`, `.vcf`)
2. **Right-click** to see Biomni options
3. **Try a BLAST search** - select sequence text and choose "Run BLAST"
4. **Explore the results** - interactive displays with detailed information

## Documentation Structure

### For Users
```
docs/
├── user-guide/
│   ├── installation.md          # Complete installation instructions
│   ├── getting-started.md       # Tutorial for new users
│   ├── configuration.md         # Settings and customization
│   └── troubleshooting.md       # Common issues and solutions
```

### For Developers
```
docs/
├── api/
│   ├── commands.md              # Command API reference
│   ├── configuration.md         # Configuration schema
│   └── integration.md           # Extension integration guide
├── developer/
│   ├── contribution-guide.md    # How to contribute
│   ├── architecture.md          # System design
│   └── testing.md               # Testing guidelines
```

### Learning Resources
```
docs/
├── videos/
│   ├── scripts/                 # Video tutorial scripts
│   ├── sample-files/            # Practice data
│   └── README.md                # Video guide overview
```

### Advanced Topics
```
docs/
├── performance/
│   └── optimization-guide.md    # Performance tuning
├── accessibility/
│   └── README.md                # Accessibility features
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Windows 10+** | ✅ Full Support | Including WSL |
| **macOS 10.15+** | ✅ Full Support | Intel and Apple Silicon |
| **Linux** | ✅ Full Support | Ubuntu, CentOS, Arch |
| **Web (vscode.dev)** | 🔄 Partial | Limited external tool access |

## File Format Support

| Format | Extensions | Features |
|--------|------------|----------|
| **FASTA** | `.fasta`, `.fa`, `.fas`, `.seq`, `.fna`, `.ffn`, `.frn` | BLAST, alignment, translation |
| **FASTQ** | `.fastq`, `.fq` | Quality control, filtering |
| **VCF** | `.vcf` | Variant annotation, filtering |
| **Other** | `.pdb`, `.gff`, `.gtf`, `.sam`, `.bam`, `.bed` | Validation, information display |

## Community and Support

### Getting Help
- 📖 **Documentation**: You're reading it!
- 💬 **GitHub Discussions**: Community Q&A
- 🐛 **GitHub Issues**: Bug reports and feature requests
- 📧 **Email Support**: For sensitive issues

### Contributing
- 🔧 **Code Contributions**: Fix bugs, add features
- 📝 **Documentation**: Improve guides and examples  
- 🧪 **Testing**: Help test new features
- 🎨 **Design**: UI/UX improvements
- 🌍 **Translation**: Internationalization support

### Community Guidelines
- Be respectful and inclusive
- Provide constructive feedback
- Help newcomers learn
- Share your expertise
- Follow our [Code of Conduct](https://github.com/manu-tej/epic-vscode-extension/blob/main/CODE_OF_CONDUCT.md)

## Roadmap

### Current Version (v0.0.1)
- ✅ Core extension framework
- ✅ Basic file format support
- ✅ BLAST integration
- ✅ Settings management

### Next Release (v0.1.0)
- 🔄 Enhanced MCP integration
- 🔄 Advanced alignment features
- 🔄 Performance optimizations
- 🔄 Extended file format support

### Future Plans
- 🔮 Cloud integration
- 🔮 Collaborative features
- 🔮 Advanced visualization
- 🔮 Workflow automation

## Acknowledgments

### Built With
- **Visual Studio Code Extension API**
- **TypeScript** - Type safety and modern JavaScript
- **Jest** - Testing framework
- **ESLint & Prettier** - Code quality tools

### Biological Tools Integration
- **NCBI BLAST** - Sequence similarity search
- **ClustalW/MUSCLE/MAFFT** - Multiple sequence alignment
- **BioPython** - Computational biology library
- **SAMtools** - Sequence alignment processing

### Community Contributors
Thanks to all the researchers, developers, and educators who have contributed to making Biomni better!

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/manu-tej/epic-vscode-extension/blob/main/LICENSE) file for details.

## Citing Biomni

If you use Biomni in your research or education, please cite:

```bibtex
@software{biomni_vscode_extension,
  author = {Biomni Development Team},
  title = {Biomni VSCode Extension: Bioinformatics Tools for Visual Studio Code},
  url = {https://github.com/manu-tej/epic-vscode-extension},
  version = {0.0.1},
  year = {2025}
}
```

---

## Quick Links

### Essential Documentation
- [📖 Installation Guide](user-guide/installation.md) - Start here
- [🚀 Getting Started](user-guide/getting-started.md) - First steps
- [⚙️ Configuration](api/configuration.md) - Customize your setup
- [🔧 Commands API](api/commands.md) - All available commands

### Learning Resources  
- [🎥 Video Tutorials](videos/) - Visual learning
- [📊 Performance Guide](performance/optimization-guide.md) - Optimization tips
- [♿ Accessibility](accessibility/) - Inclusive features

### Developer Resources
- [🏗️ Architecture](developer/architecture.md) - System design
- [🤝 Contributing](developer/contribution-guide.md) - Join development
- [🧪 Testing](developer/testing.md) - Quality assurance

### Community
- [💬 GitHub Discussions](https://github.com/manu-tej/epic-vscode-extension/discussions)
- [🐛 Issue Tracker](https://github.com/manu-tej/epic-vscode-extension/issues)
- [📈 Project Board](https://github.com/manu-tej/epic-vscode-extension/projects)

---

*Happy bioinformatics coding with Biomni! 🧬✨*