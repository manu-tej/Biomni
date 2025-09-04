# Biomni VSCode Extension - Accessibility Guide

## Overview

The Biomni VSCode Extension is committed to providing an accessible experience for all users, including those using assistive technologies such as screen readers, voice control software, and alternative input devices. This guide outlines the accessibility features and provides guidance for users with diverse needs.

## Accessibility Features

### Screen Reader Support

#### Compatible Screen Readers
- **Windows**: NVDA, JAWS, Windows Narrator
- **macOS**: VoiceOver
- **Linux**: Orca, Speakup

#### Screen Reader Optimizations
- Semantic HTML structure in all UI components
- Proper ARIA labels and descriptions
- Keyboard navigation support
- Status announcements for long-running operations
- Progress indicators with spoken updates

**Example Screen Reader Experience**:
```
"FASTA file opened. 3 sequences detected. 
Button: Run BLAST search. 
Button: Show file information.
Edit: Sequence 1, Human Beta Globin, 450 base pairs."
```

### Keyboard Navigation

#### Core Navigation
- **Tab**: Navigate through interactive elements
- **Shift+Tab**: Navigate backwards
- **Enter/Space**: Activate buttons and controls
- **Arrow Keys**: Navigate lists and menus
- **Escape**: Close dialogs and panels

#### Biomni-Specific Shortcuts
| Shortcut | Action | Context |
|----------|--------|---------|
| `Alt+B` | Run BLAST search | When sequence is selected |
| `Alt+I` | Show file information | In biological file |
| `Alt+V` | Validate file format | In biological file |
| `Ctrl+Shift+B` | Open Biomni command palette | Global |
| `F1` | Context help | Any Biomni interface |

#### Custom Keyboard Navigation
```json
{
  // Configure custom keyboard shortcuts
  "biomni.accessibility.customShortcuts": {
    "quickBlast": "Alt+Q",
    "fileInfo": "Alt+F",
    "nextResult": "Alt+N",
    "previousResult": "Alt+P"
  }
}
```

### High Contrast Support

#### Automatic Theme Detection
Biomni automatically detects VS Code's high contrast themes and adjusts accordingly:

- **Windows High Contrast**: Full compatibility
- **macOS Increased Contrast**: Optimized display
- **Linux High Contrast**: GTK theme integration

#### Manual High Contrast Configuration
```json
{
  "biomni.accessibility.highContrast.enabled": true,
  "biomni.accessibility.highContrast.contrastRatio": 7.0,
  "biomni.accessibility.colorScheme": "high-contrast-dark"
}
```

#### Color Scheme Options
- `default`: Standard colors
- `high-contrast-light`: Light background, dark text
- `high-contrast-dark`: Dark background, light text
- `protanopia`: Red-green colorblind friendly
- `deuteranopia`: Red-green colorblind friendly
- `tritanopia`: Blue-yellow colorblind friendly

### Visual Accessibility

#### Font and Display Options
```json
{
  // Adjust font sizes for better readability
  "biomni.accessibility.fontSize": 16,
  "biomni.accessibility.fontFamily": "monospace",
  "biomni.accessibility.lineHeight": 1.5,
  "biomni.accessibility.letterSpacing": 0.05
}
```

#### Sequence Display Accessibility
```json
{
  // Optimize sequence visualization
  "biomni.accessibility.sequences.useSymbols": true,    // Use symbols instead of colors
  "biomni.accessibility.sequences.showPositions": true, // Show base positions
  "biomni.accessibility.sequences.highlightChanges": true,
  "biomni.accessibility.sequences.announceChanges": true
}
```

### Cognitive Accessibility

#### Simplified Interface Mode
```json
{
  // Enable simplified interface for cognitive accessibility
  "biomni.accessibility.cognitiveSupport.enabled": true,
  "biomni.accessibility.cognitiveSupport.simplifiedMenus": true,
  "biomni.accessibility.cognitiveSupport.reduceAnimations": true,
  "biomni.accessibility.cognitiveSupport.largerClickTargets": true
}
```

#### Progress and Status Indicators
- Clear progress bars with percentage completion
- Status messages that remain visible
- Option to disable auto-hiding notifications
- Spoken announcements of completion

### Motor Accessibility

#### Mouse Alternative Support
- Full keyboard navigation for all functions
- Voice control software compatibility
- Switch navigation support
- Configurable click/activation delays

#### Customizable Input Methods
```json
{
  // Configure for motor disabilities
  "biomni.accessibility.motor.dwellClick": 1000,        // ms
  "biomni.accessibility.motor.keyRepeatDelay": 500,     // ms
  "biomni.accessibility.motor.stickyKeys": true,
  "biomni.accessibility.motor.clickAssistance": true
}
```

## Configuration Guide

### Initial Accessibility Setup

1. **Open VS Code Settings**: `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
2. **Search for "biomni accessibility"**
3. **Configure based on your needs**:

```json
{
  // Basic accessibility configuration
  "biomni.accessibility.enabled": true,
  "biomni.accessibility.announceActions": true,
  "biomni.accessibility.highContrast.enabled": false,
  "biomni.accessibility.reducedMotion": false,
  "biomni.accessibility.screenReaderOptimizations": true
}
```

### Screen Reader Configuration

#### NVDA Users (Windows)
1. **Install latest NVDA** (2023.1 or newer recommended)
2. **Configure Biomni settings**:
   ```json
   {
     "biomni.accessibility.screenReader.type": "nvda",
     "biomni.accessibility.screenReader.verbosity": "detailed",
     "biomni.accessibility.announcements.enabled": true
   }
   ```
3. **Enable browse mode** for reading results
4. **Use NVDA's element list** (`NVDA+F7`) to navigate headings and buttons

#### JAWS Users (Windows)
1. **Use JAWS 2023 or newer** for best compatibility
2. **Configure virtual cursor settings**:
   ```json
   {
     "biomni.accessibility.screenReader.type": "jaws",
     "biomni.accessibility.screenReader.virtualCursor": true,
     "biomni.accessibility.announcements.politeness": "polite"
   }
   ```
3. **Use JAWS cursor** for detailed examination of results

#### VoiceOver Users (macOS)
1. **Enable VoiceOver** (`Cmd+F5`)
2. **Configure Biomni for VoiceOver**:
   ```json
   {
     "biomni.accessibility.screenReader.type": "voiceover",
     "biomni.accessibility.screenReader.rotor": true,
     "biomni.accessibility.announcements.enabled": true
   }
   ```
3. **Use VoiceOver rotor** (`Ctrl+Option+U`) to navigate by element type

### Keyboard-Only Navigation

#### Essential Keyboard Commands
```json
{
  // Configure keyboard navigation
  "biomni.accessibility.keyboardNavigation.enabled": true,
  "biomni.accessibility.keyboardNavigation.focusVisible": true,
  "biomni.accessibility.keyboardNavigation.skipLinks": true
}
```

#### Navigation Patterns
1. **Tab Order**: Follows logical flow through interface
2. **Skip Links**: Jump to main content areas
3. **Escape Routes**: Always available to exit modes
4. **Focus Management**: Focus moves logically after actions

### Voice Control Setup

#### Dragon NaturallySpeaking (Windows)
```json
{
  // Optimize for voice control
  "biomni.accessibility.voiceControl.enabled": true,
  "biomni.accessibility.voiceControl.clickableLabels": true,
  "biomni.accessibility.voiceControl.numberOverlay": true
}
```

#### Voice Control (macOS)
```json
{
  // macOS Voice Control optimization
  "biomni.accessibility.voiceControl.type": "macos",
  "biomni.accessibility.voiceControl.showNames": true,
  "biomni.accessibility.voiceControl.customCommands": true
}
```

## Feature-Specific Accessibility

### BLAST Search Accessibility

#### Screen Reader Support
- Results announced as "BLAST search complete. Found 15 hits."
- Each result includes: accession, description, E-value
- Navigation instructions provided
- Progress updates during search

#### Keyboard Navigation
1. **Start Search**: `Enter` on BLAST button or `Alt+B`
2. **Navigate Results**: `Tab` through hits, `Arrow keys` in result list
3. **View Details**: `Enter` to expand result details
4. **Copy Results**: `Ctrl+C` copies current result information

#### Alternative Result Formats
```json
{
  // Configure accessible result display
  "biomni.tools.blast.accessibility.textResults": true,
  "biomni.tools.blast.accessibility.tableNavigation": true,
  "biomni.tools.blast.accessibility.summaryFirst": true
}
```

### File Analysis Accessibility

#### File Information Display
- Statistics announced clearly: "3 sequences, total length 1,500 bases"
- Sequence composition provided in accessible format
- GC content and other metrics clearly labeled

#### Visual Information Alternatives
```json
{
  // Provide text alternatives for visual information
  "biomni.accessibility.alternativeText.enabled": true,
  "biomni.accessibility.alternativeText.verboseDescriptions": true,
  "biomni.accessibility.alternativeText.dataTable": true
}
```

### Sequence Alignment Accessibility

#### Alignment Visualization
- Text-based alignment display option
- Position-by-position navigation available
- Conservation scores announced
- Gap information provided clearly

#### Navigation Commands
- `Ctrl+Right/Left`: Move by alignment columns
- `Ctrl+Up/Down`: Move between sequences
- `Space`: Announce current position and conservation
- `Enter`: Get detailed information about position

### Settings Panel Accessibility

#### Accessible Form Controls
- All settings have clear labels
- Form validation with screen reader announcements
- Grouped related settings with fieldset/legend
- Help text associated with form controls

#### Setting Categories Navigation
```json
{
  // Improve settings navigation
  "biomni.accessibility.settings.categorizedNavigation": true,
  "biomni.accessibility.settings.searchable": true,
  "biomni.accessibility.settings.keyboardShortcuts": true
}
```

## Testing Accessibility

### Automated Testing

#### Built-in Accessibility Checks
Biomni includes automated accessibility testing:

```bash
# Run accessibility tests
npm run test:accessibility

# Check specific components
npm run test:accessibility -- --component=blast-results
npm run test:accessibility -- --component=settings-panel
```

#### Accessibility Checklist
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are clearly visible
- [ ] Color is not the only way information is conveyed
- [ ] Images have appropriate alt text
- [ ] Headings are properly structured
- [ ] Forms have associated labels
- [ ] Error messages are accessible
- [ ] Progress indicators are announced

### Manual Testing Procedures

#### Screen Reader Testing
1. **Navigate with screen reader only** (monitor off)
2. **Verify all content is announced** appropriately
3. **Check navigation efficiency** - can tasks be completed quickly?
4. **Test error scenarios** - are errors clearly communicated?

#### Keyboard Testing
1. **Unplug mouse** and navigate with keyboard only
2. **Verify tab order** is logical and efficient
3. **Test all functionality** is available via keyboard
4. **Check focus traps** in modal dialogs

#### Visual Testing
1. **Test with high contrast** themes enabled
2. **Zoom to 200%** and verify usability
3. **Test with various color schemes** including colorblind simulation
4. **Check minimum contrast ratios** (4.5:1 for normal text, 3:1 for large text)

## Common Accessibility Issues and Solutions

### Issue: Screen Reader Not Announcing Results

**Problem**: BLAST results aren't announced when completed
**Solution**:
```json
{
  "biomni.accessibility.announcements.enabled": true,
  "biomni.accessibility.announcements.politeness": "polite",
  "biomni.accessibility.liveRegions": true
}
```

### Issue: Keyboard Navigation Stuck

**Problem**: Cannot navigate past certain UI elements
**Solution**:
1. Check for focus traps in modal dialogs
2. Verify skip links are working
3. Enable focus debugging:
```json
{
  "biomni.accessibility.debug.focusIndicator": true,
  "biomni.accessibility.debug.tabOrder": true
}
```

### Issue: High Contrast Mode Not Working

**Problem**: Colors don't change in high contrast mode
**Solution**:
```json
{
  "biomni.accessibility.highContrast.respectSystemSettings": true,
  "biomni.accessibility.highContrast.forcedColors": "auto"
}
```

### Issue: Voice Commands Not Recognized

**Problem**: Voice control software can't identify clickable elements
**Solution**:
```json
{
  "biomni.accessibility.voiceControl.clickableLabels": true,
  "biomni.accessibility.voiceControl.roleDescriptions": true
}
```

## Accessibility Standards Compliance

### WCAG 2.1 AA Compliance

Biomni aims to meet or exceed WCAG 2.1 AA standards:

#### Level A Compliance
- ✅ Images have alternative text
- ✅ Videos have captions (tutorial videos)
- ✅ Keyboard navigation available
- ✅ Focus indicators visible
- ✅ Semantic HTML structure

#### Level AA Compliance
- ✅ Color contrast ratios meet 4.5:1 minimum
- ✅ Text can be resized to 200% without loss of functionality
- ✅ Focus order is logical and predictable
- ✅ Error messages are descriptive and helpful
- ✅ Headings and labels describe topic or purpose

### Section 508 Compliance

For US government users, Biomni meets Section 508 requirements:
- Software accessibility standards (36 CFR 1194.21)
- Web-based accessibility standards (36 CFR 1194.22)
- Functional performance criteria (36 CFR 1194.31)

### European Accessibility Standards

Compliant with EN 301 549 and EU Web Accessibility Directive:
- Public sector body requirements
- Mobile accessibility guidelines
- Procurement accessibility requirements

## Accessibility Resources

### Built-in Help

#### Accessibility Help Panel
Access via Command Palette: `Biomni: Show Accessibility Help`

- Keyboard shortcuts reference
- Screen reader command guide
- Voice control setup instructions
- Troubleshooting common issues

#### Context-Sensitive Help
- Press `F1` in any Biomni interface for accessibility options
- Tooltips include keyboard shortcuts
- Status bar shows current accessibility mode

### External Resources

#### Screen Reader User Guides
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [JAWS User Guide](https://support.freedomscientific.com/Teachers/TCTraining/JAWSTraining)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)

#### Accessibility Testing Tools
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Color Oracle](https://colororacle.org/) (colorblind simulation)

### Community Support

#### Accessibility Feedback
- **GitHub Issues**: [Report accessibility issues](https://github.com/manu-tej/epic-vscode-extension/issues)
- **Accessibility Label**: Use the "accessibility" label for relevant issues
- **User Testing**: Participate in accessibility testing programs

#### Accessibility Champions
Join our accessibility community:
- Monthly accessibility testing sessions
- User experience feedback collection
- Feature request prioritization for accessibility improvements

## Customization for Specific Needs

### Visual Impairments

#### Low Vision Configuration
```json
{
  "biomni.accessibility.lowVision.enabled": true,
  "biomni.accessibility.lowVision.magnification": 2.0,
  "biomni.accessibility.lowVision.cursorEnhancement": true,
  "biomni.accessibility.lowVision.focusHighlight": "thick-border"
}
```

#### Blindness Configuration
```json
{
  "biomni.accessibility.blindness.enabled": true,
  "biomni.accessibility.blindness.screenReaderOptimized": true,
  "biomni.accessibility.blindness.textOnlyMode": true,
  "biomni.accessibility.blindness.verboseDescriptions": true
}
```

### Hearing Impairments

#### Deaf/Hard of Hearing Configuration
```json
{
  "biomni.accessibility.hearing.enabled": true,
  "biomni.accessibility.hearing.visualAlerts": true,
  "biomni.accessibility.hearing.flashNotifications": true,
  "biomni.accessibility.hearing.captionDisplay": true
}
```

### Motor Impairments

#### Limited Fine Motor Control
```json
{
  "biomni.accessibility.motor.enabled": true,
  "biomni.accessibility.motor.largeClickTargets": true,
  "biomni.accessibility.motor.dwellTime": 1500,
  "biomni.accessibility.motor.dragThreshold": 10
}
```

### Cognitive Impairments

#### Memory and Attention Support
```json
{
  "biomni.accessibility.cognitive.enabled": true,
  "biomni.accessibility.cognitive.simplifiedInterface": true,
  "biomni.accessibility.cognitive.reminders": true,
  "biomni.accessibility.cognitive.progressSaving": true
}
```

---

## Getting Accessibility Support

### Documentation
- **Complete User Guide**: Accessibility considerations throughout
- **Video Tutorials**: Include audio descriptions and captions
- **API Documentation**: Accessibility properties documented

### Direct Support
- **Email**: accessibility@biomni.org
- **GitHub**: Use accessibility label on issues
- **Community Forum**: Dedicated accessibility section

### Feedback and Improvement
We continuously improve accessibility based on user feedback:
- Regular accessibility audits
- User testing with disabled users
- Community input on new features
- Assistive technology compatibility testing

---

*The Biomni development team is committed to ensuring that bioinformatics tools are accessible to everyone. If you encounter any accessibility barriers or have suggestions for improvement, please don't hesitate to contact us.*