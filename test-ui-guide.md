# Biomni UI Test Guide

## Opening the Panel
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Biomni: Open Panel`
3. Press Enter

Or use keyboard shortcut: `Cmd+Shift+B`

## Testing Each Tab

### 1. Home Tab (Default)
- Should show welcome message with "🧬 Biomni"
- Quick action buttons should be visible:
  - Validate File
  - Query Database
  - Run Analysis
  - View Settings
- Statistics section (initially empty)

### 2. Database Tab
Test the query form:
- **Database Dropdown**: Try selecting different databases (UniProt, PDB, AlphaFold, InterPro)
- **Query Input**: Enter a test query like "hemoglobin" or "P12345"
- **Max Results**: Set to 10
- **Search Button**: Click to execute query
- **Results Area**: Should show progress indicator then results

Example queries to try:
- UniProt: "insulin human"
- PDB: "1HBB"
- AlphaFold: "P12345"
- InterPro: "IPR000001"

### 3. Analysis Tab
Test the analysis form:
- **Analysis Type Dropdown**: Select different types
  - File Validation
  - BLAST Search
  - Sequence Properties
  - ORF Finding
  - Gene Annotation
  - Molecular Docking
  - ADMET Prediction
- **Dynamic Options**: Form should update based on selection
  - BLAST: Shows database and E-value fields
  - Validation: Shows file type field
  - ORFs: Shows minimum length field
  - Docking: Shows ligand and receptor file fields

### 4. Settings Tab
Test the settings form:
- **API Keys Section**: 
  - Enter test keys (they won't be sent anywhere yet)
  - Password fields should mask input
- **Preferences Section**:
  - Default Database dropdown
  - Enable Cache checkbox
  - Cache Size input
- **Actions**:
  - Save Settings button
  - Validate Configuration button
- **Quick Actions**:
  - Export Settings
  - Import Settings
  - Clear Cache
  - Reset to Defaults

## Visual Features to Check
- Tab navigation should be smooth with active state
- Forms should have proper styling
- Hover effects on buttons
- VSCode theme integration (try switching themes)
- Responsive layout (resize the panel)

## Console Monitoring
Open Developer Tools to see messages:
1. `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
2. Go to Console tab
3. Look for messages starting with "[Biomni]"

## What's Working Now
✅ Tab navigation
✅ Form rendering
✅ Message passing infrastructure
✅ Progress indicators
✅ Status updates
✅ Theme integration

## What's Coming in Task #26
- Status bar item
- Additional keyboard shortcuts
- Command palette integration
- Built-in documentation