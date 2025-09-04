#!/usr/bin/env python3
"""
Simple BiOMNI Test - Let's try a basic task
"""

from biomni.agent import A1
import os

# Check for API key
if not os.getenv('ANTHROPIC_API_KEY'):
    print("ERROR: ANTHROPIC_API_KEY not set!")
    print("\nTo set it, run:")
    print("export ANTHROPIC_API_KEY='your-api-key-here'")
    exit(1)

print("Initializing BiOMNI agent...")
agent = A1(path='./data', llm='claude-sonnet-4-20250514')

print("\nRunning a simple test: Analyzing caffeine")
print("-" * 50)

# Caffeine SMILES
caffeine = "CN1C=NC2=C1C(=O)N(C(=O)N2C)C"

result = agent.go(f"""
Analyze caffeine (SMILES: {caffeine}):
1. What type of molecule is this?
2. Predict its solubility
3. What are its main biological effects?
""")

print("\nResults:")
print("=" * 50)
print(result)
print("=" * 50)
print("\n✓ Test complete!")