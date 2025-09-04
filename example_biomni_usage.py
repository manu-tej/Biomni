#!/usr/bin/env python3
"""
BiOMNI Usage Example - Step-by-Step Walkthrough
This script demonstrates basic BiOMNI usage for biomedical research tasks
"""

from biomni.agent import A1
import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

def main():
    """Main function demonstrating BiOMNI usage"""
    
    print("=" * 60)
    print("BiOMNI Usage Walkthrough")
    print("=" * 60)
    
    # Step 1: Initialize the BiOMNI Agent
    print("\n1. Initializing BiOMNI Agent...")
    print("   This will download the data lake (~11GB) on first run")
    
    # You can specify different LLMs:
    # - 'claude-sonnet-4-20250514' (recommended)
    # - 'gpt-4' (if you have OpenAI API key)
    # - 'gpt-3.5-turbo' (cheaper, less capable)
    
    agent = A1(
        path='./data',  # Where to store/load the data lake
        llm='claude-sonnet-4-20250514'  # Which LLM to use
    )
    print("   ✓ Agent initialized successfully!")
    
    # Step 2: Simple Drug Property Analysis
    print("\n2. Example 1: Drug Property Prediction")
    print("   Task: Predict properties of Ibuprofen")
    print("   Running analysis...")
    
    ibuprofen_smiles = "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O"
    
    result1 = agent.go(f"""
    Analyze this compound (Ibuprofen): {ibuprofen_smiles}
    1. Predict basic ADMET properties
    2. Identify the drug class
    3. List main therapeutic uses
    """)
    
    print("\n   Result Summary:")
    print("   " + "-" * 40)
    # The result is a detailed log, we'll print a snippet
    if result1:
        lines = result1.split('\n')[:10]  # First 10 lines
        for line in lines:
            if line.strip():
                print(f"   {line[:100]}")  # Truncate long lines
    
    # Step 3: Gene Expression Query
    print("\n3. Example 2: Gene Expression Analysis")
    print("   Task: Get expression data for TP53 gene")
    print("   Running analysis...")
    
    result2 = agent.go("""
    For the TP53 gene:
    1. Get tissue-specific RNA-seq expression data
    2. Identify top 5 tissues with highest expression
    3. What is the biological significance of TP53?
    """)
    
    print("\n   Result Summary:")
    print("   " + "-" * 40)
    if result2:
        lines = result2.split('\n')[:10]
        for line in lines:
            if line.strip():
                print(f"   {line[:100]}")
    
    # Step 4: Database Query Example
    print("\n4. Example 3: FDA Database Query")
    print("   Task: Find adverse events for a drug")
    print("   Running analysis...")
    
    result3 = agent.go("""
    Query FDA database:
    1. Find recent adverse events reported for aspirin
    2. What are the most common side effects?
    3. Are there any serious warnings?
    """)
    
    print("\n   Result Summary:")
    print("   " + "-" * 40)
    if result3:
        lines = result3.split('\n')[:10]
        for line in lines:
            if line.strip():
                print(f"   {line[:100]}")
    
    # Step 5: Understanding the Results
    print("\n" + "=" * 60)
    print("Understanding BiOMNI Results")
    print("=" * 60)
    print("""
    Each agent.go() call returns a detailed execution log showing:
    
    1. Tool Selection: Which BiOMNI tools were used
    2. Execution Steps: What operations were performed
    3. Data Retrieved: Information from databases/computations
    4. Final Output: The analyzed results
    
    The agent automatically:
    - Selects appropriate tools for your task
    - Handles errors and retries
    - Combines multiple data sources
    - Provides interpretable results
    """)
    
    # Step 6: Tips for Using BiOMNI
    print("\n" + "=" * 60)
    print("Tips for Using BiOMNI Effectively")
    print("=" * 60)
    print("""
    1. Be Specific: Provide clear, detailed prompts
       Good: "Predict ADMET properties for compound SMILES: CC(C)CC1=CC=C..."
       Bad: "Analyze this drug"
    
    2. Use Standard Formats:
       - SMILES for compounds
       - Gene symbols (e.g., TP53, BRCA1)
       - UniProt IDs for proteins
       - PDB IDs for structures
    
    3. Break Complex Tasks:
       Instead of one huge request, break it into steps
    
    4. Check Available Tools:
       Look in biomni/tool/ directory to see capabilities
    
    5. Monitor Execution:
       The logs show which tools are being used
    """)
    
    print("\n✓ Walkthrough complete! You can now use BiOMNI for your research.")
    print("\nNext steps:")
    print("1. Try your own queries by modifying agent.go() calls")
    print("2. Explore more complex workflows")
    print("3. Check tutorials/biomni_101.ipynb for advanced examples")

if __name__ == "__main__":
    # Check if API key is set
    if not os.getenv('ANTHROPIC_API_KEY'):
        print("WARNING: ANTHROPIC_API_KEY not found in environment!")
        print("Please set it in .env file or export it:")
        print("export ANTHROPIC_API_KEY='your-api-key-here'")
        print("\nYou can still explore the code to understand usage.")
    else:
        main()