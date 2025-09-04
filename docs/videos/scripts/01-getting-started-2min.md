# Video Script: Getting Started with Biomni in 2 Minutes

**Duration**: 2:00  
**Target Audience**: New users, beginners  
**Prerequisites**: VS Code installed  
**Learning Objectives**: Install extension, open biological file, run first analysis

---

## Pre-Recording Setup

- VS Code with dark theme, 16pt font
- Screen recording at 1920x1080, 30fps
- Sample files ready: `sample_sequences.fasta`
- Extension not yet installed (fresh VS Code workspace)
- Cursor highlighting enabled

---

## Script with Timing

### [00:00 - 00:05] Opening Hook
**Visual**: VS Code start screen  
**Audio**: "In just 2 minutes, you'll transform VS Code into a powerful bioinformatics workbench. Let's get started with the Biomni extension."

### [00:05 - 00:15] Installation
**Visual**: Navigate to Extensions panel (Ctrl+Shift+X)  
**Audio**: "First, open the Extensions panel with Ctrl+Shift+X. Search for 'Biomni MCP Integration' and click Install."  
**Screen Action**: Type "biomni" in search, click "Install" button  
**Accessibility**: "We're clicking the Extensions icon in the left sidebar, then typing B-I-O-M-N-I in the search box"

### [00:15 - 00:25] Extension Activation
**Visual**: Extension installing, then enabled  
**Audio**: "The extension installs automatically and is ready to use. Notice it's now enabled in your extensions list."  
**Screen Action**: Show extension in enabled state, quick flash of status bar

### [00:25 - 00:40] Opening a Biological File
**Visual**: File > Open, navigate to sample.fasta  
**Audio**: "Now let's open a biological file. I'll open this sample FASTA file containing DNA sequences. Notice how Biomni automatically recognizes the format and applies syntax highlighting."  
**Screen Action**: Open file, show syntax coloring, file type in status bar  
**Accessibility**: "The file contains genetic sequences starting with greater-than symbols, followed by sequence identifiers and DNA bases"

### [00:40 - 00:50] File Information
**Visual**: Right-click in file  
**Audio**: "Right-click anywhere in the file to see Biomni's context menu. Let's get basic file information first."  
**Screen Action**: Right-click, hover over menu items, click "Show File Info"  
**Accessibility**: "The context menu shows several Biomni options including Validate File Format, Show File Info, and Run BLAST"

### [00:50 - 01:05] View Results
**Visual**: Information dialog/panel  
**Audio**: "Perfect! Biomni instantly analyzes our file and shows we have 3 sequences with a total length of 450 base pairs. It even calculated the GC content at 52%."  
**Screen Action**: Show results dialog with statistics  
**Accessibility**: "A dialog appears showing file statistics: 3 sequences, 450 total base pairs, average length 150 base pairs"

### [01:05 - 01:20] First BLAST Search
**Visual**: Select sequence text, right-click  
**Audio**: "Now let's do something exciting - let's search for similar sequences in databases. I'll select this first sequence and run a BLAST search."  
**Screen Action**: Select sequence text, right-click, choose "Run BLAST"  
**Accessibility**: "We're selecting the DNA sequence text starting with ATCG, then right-clicking to access the BLAST option"

### [01:20 - 01:35] BLAST Configuration
**Visual**: BLAST dialog with default settings  
**Audio**: "Biomni opens the BLAST configuration with sensible defaults - searching the nucleotide database with an E-value of 0.01. Let's run it."  
**Screen Action**: Show dialog, click "Run Search"  
**Accessibility**: "A BLAST search dialog shows database selection dropdown set to 'nt' and E-value threshold set to 0.01"

### [01:35 - 01:50] Quick Results Preview
**Visual**: BLAST results starting to load  
**Audio**: "And there we go! BLAST results are loading, showing potential matches from the NCBI database. You can see similarity scores, E-values, and sequence alignments."  
**Screen Action**: Show results panel with initial hits  
**Accessibility**: "The results show a table with columns for accession numbers, descriptions, and E-values, indicating how similar our sequence is to known sequences"

### [01:50 - 02:00] Wrap-up
**Visual**: Overview of what was accomplished  
**Audio**: "In under 2 minutes, you've installed Biomni, analyzed a FASTA file, and run your first BLAST search. You're ready to explore advanced features! Check the description for links to detailed tutorials."  
**Screen Action**: Quick pan over VS Code with extension active  
**Accessibility**: "The screen shows VS Code with the Biomni extension active, FASTA file open with syntax highlighting, and BLAST results displayed"

---

## Visual Elements Checklist

- [ ] Extension installation flow clearly visible
- [ ] File type recognition highlighted (syntax colors, status bar)
- [ ] Context menu options prominently displayed
- [ ] File statistics clearly readable
- [ ] BLAST configuration dialog fully visible
- [ ] Results table formatted and readable
- [ ] All text large enough for mobile viewing
- [ ] Cursor movements smooth and intentional

## Audio Checklist

- [ ] Clear, professional narration
- [ ] Appropriate pacing (not rushed)
- [ ] Technical terms pronounced correctly
- [ ] Background music subtle or absent
- [ ] Audio levels consistent throughout
- [ ] No background noise or interference

## Accessibility Checklist

- [ ] All visual actions described in narration
- [ ] UI elements identified by name and location
- [ ] Keyboard shortcuts mentioned when used
- [ ] Text content read aloud when relevant
- [ ] Color not the only way information is conveyed
- [ ] Closed captions with accurate technical terminology

## Post-Production Elements

### Title Cards
- Opening: "Biomni VSCode Extension - Getting Started in 2 Minutes"
- Closing: "Next: Core Features Demo | More at github.com/manu-tej/epic-vscode-extension"

### Captions Template
```srt
1
00:00:00,000 --> 00:00:05,000
In just 2 minutes, you'll transform VS Code into a powerful bioinformatics workbench. Let's get started with the Biomni extension.

2
00:00:05,000 --> 00:00:15,000
First, open the Extensions panel with Ctrl+Shift+X. Search for "Biomni MCP Integration" and click Install.
```

### End Screen Elements
- Subscribe button overlay
- Links to related tutorials:
  - "Core Features Demo" (next video)
  - "Installation Guide" (detailed docs)
  - "GitHub Repository" (source code)
- Biomni logo with tagline

### Description Template
```
Learn to use the Biomni VSCode Extension for bioinformatics in just 2 minutes! This quick tutorial covers:

✅ Installing the Biomni extension
✅ Opening biological files (FASTA)
✅ Getting file statistics
✅ Running your first BLAST search

🔗 Links:
• Extension: https://marketplace.visualstudio.com/items?itemName=biomni.biomni-mcp-integration
• Documentation: https://manu-tej.github.io/epic-vscode-extension/
• GitHub: https://github.com/manu-tej/epic-vscode-extension
• Sample Files: https://github.com/manu-tej/epic-vscode-extension/tree/main/docs/videos/sample-files

⏰ Timestamps:
0:00 Introduction
0:05 Installing Biomni
0:25 Opening biological files
0:40 File analysis
1:05 BLAST search
1:50 Next steps

🎯 Perfect for:
• Bioinformatics beginners
• VS Code users
• Researchers working with sequences
• Students learning computational biology

#VSCode #Bioinformatics #BLAST #FASTA #Genomics #ComputationalBiology #Biomni
```

### Tags
- bioinformatics
- vscode
- extension
- blast
- fasta
- genomics
- tutorial
- sequence-analysis
- computational-biology

---

## Files Needed for Recording

### Sample FASTA File (`sample_sequences.fasta`)
```fasta
>Human_GAPDH_partial
ATGGGGAAGGTGAAGGTCGGAGTCAACGGATTTGGTCGTATTGGGCGCCTGGTCACCAGGGCTGCTTTTAACTCTGGTAAAGTGGATATTGTTGCCATCAATGACCCCTTCATTGACCTCAACTACATGGTTTACATGTTCCAATATGATTCCACCCATGGCAAATTCCATGGCACCGTCAAGGCTGAGAACGGGAAGCTTGTCATCAATGGAAATCCCATCACCATCTTCCAGGAGCGAGATCCCTCCAAAATCAAGTGGGGCGATGCTGGCGCTGAGTACGTCGTGGAGTCCACTGGCGTCTTCACCACCATGGAGAAGGCTGGGGCTCATTTGCAGGGGGGAGCCAAAAGGGTCATCATCTCTGCCCCCTCTGCTGATGCCCCCATGTTCGTCATGGGTGTGAACCATGAGAAGTATGACAACAGCCTCAAGATCATCAGCAATGCCTCCTGCACCACCAACTGCTTAGCACCCCTGGCCAAGGTCATCCATGACAACTTTGGTATCGTGGAAGGACTCATGACCACAGTCCATGCCATCACTGCCACCCAGAAGACTGTGGATGGCCCCTCCGGGAAACTGTGGCGTGA

>Mouse_GAPDH_partial
ATGGGGAAGGTGAAGGTCGGAGTCAACGGATTTGGTCGTATTGGGCGCCTGGTCACCAGGGCTGCTTTTAACTCTGGTAAAGTGGATATTGTTGCCATCAATGACCCCTTCATTGACCTCAACTACATGGTTTACATGTTCCAATATGATTCCACCCATGGCAAATTCCATGGCACCGTCAAGGCTGAGAACGGGAAGCTTGTCATCAATGGAAATCCCATCACCATCTTCCAGGAGCGAGATCCCTCCAAAATCAAGTGGGGCGATGCTGGCGCTGAGTACGTCGTGGAGTCCACTGGCGTCTTCACCACCATGGAGAAGGCTGGGGCTCATTTGCAGGGGGGAGCCAAAAGGGTCATCATCTCTGCCCCCTCTGCTGATGCCCCCATGTTCGTCATGGGTGTGAACCATGAGAAGTATGACAACAGCCTCAAGATCATCAGCAATGCCTCCTGCACCACCAACTGCTTAGCACCCCTGGCCAAGGTCATCCATGACAACTTTGGTATCGTGGAAGGACTCATGACCACAGTCCATGCCATCACTGCCACCCAGAAGACTGTGGATGGCCCCTCCGGGAAACTGTGGCGTGA

>Yeast_GAPDH_partial
ATGGGTAAGGTTAAGGTTGGTAGTAACGGATTTGGTAGGATTGGTGCTTTGGTTACCAGGCTTGCATTCAACTCTGGTAAGGTTGATATTGTTGCAATCAACGATCCATTCATTGATTTGAACTACATGGTATACATGTTCCAATATGATTCCACCCATGGAAAATTCCATGGAACCGTTAAGGCTGAAAACGGCAAGTTGGTTATTAACGGCAACCCTATCACCATTTTCCAAGAACGAGATCCATCAAAGATTAAGGTGGGCGACGCTGGAGCTGAGTACGTAGTAGAGTCTACCGGAGTCTTGACCACCATGGAGAAGGCTGGCGCTCATTTGCAAGGCGGAGCAAAGAGGGTCATTGTCTCTGCACCTTCCGCTGACGCCCCAATGTTCGTTGTTGGAGTTAACCACGAAAAGTATGATAACAGCCTCAAGATTATTAAAGATGCTCCGTGCACCACAAACTGGTTGGCACCTTTAGCAAAGGTTATTCACGATAACTTTGGAATTGTTGAAGGTCTTATGACTACAGTACATGCTATTACTGCAACCCAAAAGGCTGTAGATGGACCATCTGGCAAGTTGTGGAGA
```

## Quality Assurance

### Pre-Recording Checklist
- [ ] VS Code clean install or reset
- [ ] Extension not pre-installed
- [ ] Sample files in accessible location
- [ ] Screen recording software configured
- [ ] Audio equipment tested
- [ ] Script reviewed and timed

### Post-Recording Review
- [ ] All objectives covered
- [ ] No technical errors
- [ ] Audio quality acceptable
- [ ] Visual elements clear
- [ ] Timing within target (2:00 ±10 seconds)
- [ ] Accessibility requirements met

### Pre-Publishing Checklist
- [ ] Captions accurate and synchronized
- [ ] Title cards and branding applied
- [ ] End screen elements configured
- [ ] Description and tags optimized
- [ ] Thumbnail designed and uploaded
- [ ] Links tested and functional