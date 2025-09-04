# 🧬 BiOMNI Step-by-Step Walkthrough

## What You'll Learn
- How to set up BiOMNI
- How to run your first analysis
- How to interpret results
- Common use cases and examples

---

## 📋 Prerequisites

1. **Python 3.8+** installed
2. **API Key** from Anthropic (for Claude) or OpenAI (for GPT-4)
3. **11GB disk space** for the data lake
4. **BiOMNI installed** (version 0.0.6 detected ✓)

---

## 🚀 Step 1: Set Up Your API Key

BiOMNI needs an LLM to work. The easiest way is to use Claude:

```bash
# Option A: Set it temporarily (current session only)
export ANTHROPIC_API_KEY='your-api-key-here'

# Option B: Create a .env file (recommended)
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env
```

Get your API key from: https://console.anthropic.com/

---

## 🔬 Step 2: Your First BiOMNI Script

Create a simple Python script:

```python
from biomni.agent import A1

# Initialize the agent
agent = A1(path='./data', llm='claude-sonnet-4-20250514')

# Run a simple analysis
result = agent.go("What is the function of the TP53 gene?")
print(result)
```

---

## 🧪 Step 3: Try Different Types of Analysis

### A. Drug Analysis
```python
# Analyze a drug compound (Aspirin)
aspirin_smiles = "CC(=O)OC1=CC=CC=C1C(=O)O"
result = agent.go(f"""
Analyze this compound (Aspirin): {aspirin_smiles}
- Predict ADMET properties
- Identify drug interactions
- List side effects
""")
```

### B. Gene Expression
```python
# Get gene expression data
result = agent.go("""
For the BRCA1 gene:
1. Get tissue-specific expression levels
2. Which tissues have highest expression?
3. What cancers is it associated with?
""")
```

### C. Protein Analysis
```python
# Analyze a protein sequence
sequence = "MTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYDPTIEDSYRKQVVIDGETCLLDILDTAGQEEYSAMRDQYMRTGEGFLCVFAINNTKSFEDIHQYREQIKRVKDSDDVPMVLVGNKCDLAARTVESRQAQDLARSYGIPYIETSAKTRQGVEDAFYTLVREIRQHKLRKLNPPDESGPGCMSCKCVLS"

result = agent.go(f"""
Analyze this protein sequence:
{sequence}
1. Predict secondary structure
2. Identify functional domains
3. Find similar proteins
""")
```

### D. FDA Database Query
```python
# Search FDA adverse events
result = agent.go("""
Search FDA database for:
1. Recent adverse events for metformin
2. Most common side effects
3. Any black box warnings?
""")
```

---

## 📊 Step 4: Understanding the Output

BiOMNI returns detailed logs showing:

```
[PLANNING] Understanding your request...
[TOOL SELECTION] Using tool: database_query
[EXECUTION] Fetching data from FDA database...
[RESULTS] Found 234 adverse events...
[SUMMARY] Main findings: ...
```

### What to Look For:
1. **Tool Used**: Which BiOMNI module handled your request
2. **Data Sources**: What databases were queried
3. **Results**: The actual findings
4. **Errors**: Any issues encountered

---

## 💡 Step 5: Real-World Examples

### Example 1: Drug Discovery Pipeline
```python
agent = A1(path='./data', llm='claude-sonnet-4-20250514')

# Complete drug analysis workflow
result = agent.go("""
For ibuprofen (CC(C)CC1=CC=C(C=C1)C(C)C(=O)O):
1. Predict ADMET properties (absorption, distribution, metabolism, excretion, toxicity)
2. Identify protein targets and binding affinity
3. Find similar approved drugs
4. Suggest structural modifications for reduced GI side effects
5. Check for drug-drug interactions with common medications
""")
```

### Example 2: Gene-Disease Analysis
```python
result = agent.go("""
Investigate the relationship between APOE gene and Alzheimer's disease:
1. Get APOE gene variants and their frequencies
2. Find association with Alzheimer's risk
3. Identify expression patterns in brain tissues
4. List current drugs targeting APOE pathways
5. Find active clinical trials
""")
```

### Example 3: Biomarker Discovery
```python
result = agent.go("""
Find potential biomarkers for early detection of pancreatic cancer:
1. Query literature for known biomarkers
2. Check their specificity and sensitivity
3. Find expression levels in healthy vs cancer tissues
4. Identify FDA-approved tests using these biomarkers
""")
```

---

## 🛠️ Step 6: Advanced Usage

### Using Different LLMs
```python
# Use GPT-4 (requires OpenAI API key)
agent = A1(path='./data', llm='gpt-4')

# Use cheaper model for simple tasks
agent = A1(path='./data', llm='gpt-3.5-turbo')

# Use Gemini (requires Gemini API key)
agent = A1(path='./data', llm='gemini-pro')
```

### Configuring Timeouts
```python
from biomni.config import default_config

# Increase timeout for complex analyses
default_config.timeout_seconds = 1800  # 30 minutes
agent = A1()
```

### Working with Files
```python
# Analyze your own data files
result = agent.go("""
Analyze the gene expression data at /path/to/counts.csv:
1. Perform quality control
2. Identify differentially expressed genes
3. Run pathway enrichment analysis
""")
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "API Key Not Found"
```bash
# Check if key is set
echo $ANTHROPIC_API_KEY

# If empty, set it:
export ANTHROPIC_API_KEY='sk-ant-...'
```

### Issue 2: "Module Not Found"
```bash
# Reinstall BiOMNI
pip install biomni --upgrade
```

### Issue 3: "Data Download Failed"
```python
# Use different data path with more space
agent = A1(path='/large/disk/biomni_data')
```

### Issue 4: "Timeout Error"
```python
# Increase timeout
from biomni.config import default_config
default_config.timeout_seconds = 3600  # 1 hour
```

---

## 📚 What Can BiOMNI Do?

### ✅ BiOMNI CAN:
- Analyze drug compounds (ADMET, targets, interactions)
- Query biological databases (FDA, PubChem, UniProt)
- Predict protein structures and functions
- Analyze gene expression patterns
- Design CRISPR screens
- Perform pathway enrichment analysis
- Search clinical trials
- Analyze single-cell RNA-seq data

### ❌ BiOMNI CANNOT:
- Process raw sequencing files (FASTQ)
- Run wet lab experiments
- Replace clinical judgment
- Guarantee pharmaceutical compliance
- Access proprietary databases

---

## 🎯 Best Practices

1. **Be Specific**: Provide exact molecule names, gene symbols, or identifiers
2. **Use Standard Formats**: SMILES for molecules, UniProt for proteins
3. **Break Complex Tasks**: Split large analyses into smaller steps
4. **Verify Results**: Cross-check critical findings with primary sources
5. **Save Your Work**: Store results for reproducibility

---

## 🔍 Try It Yourself!

Run the example script:
```bash
python3 simple_test.py
```

Or start Python and try interactively:
```python
from biomni.agent import A1
agent = A1(path='./data', llm='claude-sonnet-4-20250514')
result = agent.go("What are the top 3 FDA-approved drugs for diabetes?")
print(result)
```

---

## 📖 Next Steps

1. **Explore More Tools**: Check `biomni/tool/` directory
2. **Read Tutorials**: See `tutorials/biomni_101.ipynb`
3. **Join Community**: Slack link in README
4. **Try Web UI**: https://biomni.stanford.edu

---

## 💬 Getting Help

- **Documentation**: `/docs/` directory
- **Issues**: GitHub issues page
- **Community**: Slack channel
- **Email**: Check paper for contact info

Remember: BiOMNI is a research tool. Always validate critical findings independently!