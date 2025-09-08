import * as vscode from 'vscode';
import { GenomicsToolsService } from './genomicsTools';
import { ResultsManager } from './resultsManager';

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'tool' | 'command' | 'script' | 'condition';
  tool?: string;
  command?: string;
  parameters?: Record<string, any>;
  inputs?: string[]; // IDs of steps whose outputs are inputs to this step
  outputs?: string[]; // IDs of output variables
  condition?: string; // JavaScript expression for conditional execution
  retryCount?: number;
  timeout?: number;
  description?: string;
}

/**
 * Workflow definition
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: 'genomics' | 'proteomics' | 'drug-discovery' | 'custom';
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  created: Date;
  modified: Date;
  author?: string;
  tags?: string[];
  icon?: string;
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  progress: number;
  results: Record<string, any>;
  errors: Array<{ step: string; error: string; timestamp: Date }>;
  startTime: Date;
  endTime?: Date;
  logs: string[];
}

/**
 * Workflow execution engine
 */
export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowContext> = new Map();
  private genomicsTools: GenomicsToolsService;
  private resultsManager: ResultsManager;
  private cancellationTokens: Map<string, vscode.CancellationTokenSource> = new Map();

  constructor(
    genomicsTools: GenomicsToolsService,
    resultsManager: ResultsManager,
    private context: vscode.ExtensionContext
  ) {
    this.genomicsTools = genomicsTools;
    this.resultsManager = resultsManager;
    this.loadWorkflows();
    this.loadTemplates();
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, initialParams?: Record<string, any>): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = this.generateExecutionId();
    const context: WorkflowContext = {
      workflowId,
      executionId,
      status: 'pending',
      progress: 0,
      results: { ...initialParams },
      errors: [],
      startTime: new Date(),
      logs: [`Workflow "${workflow.name}" started at ${new Date().toISOString()}`],
    };

    this.executions.set(executionId, context);
    const cancellationToken = new vscode.CancellationTokenSource();
    this.cancellationTokens.set(executionId, cancellationToken);

    // Execute workflow asynchronously
    this.runWorkflow(workflow, context, cancellationToken.token).catch(error => {
      context.status = 'failed';
      context.errors.push({
        step: 'workflow',
        error: error.message,
        timestamp: new Date(),
      });
      this.logExecution(context, `Workflow failed: ${error.message}`);
    });

    return executionId;
  }

  /**
   * Run workflow steps
   */
  private async runWorkflow(
    workflow: Workflow,
    context: WorkflowContext,
    cancellationToken: vscode.CancellationToken
  ): Promise<void> {
    context.status = 'running';
    const totalSteps = workflow.steps.length;

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        if (cancellationToken.isCancellationRequested) {
          context.status = 'cancelled';
          this.logExecution(context, 'Workflow cancelled by user');
          break;
        }

        const step = workflow.steps[i];
        if (!step) {
          continue;
        }
        context.currentStep = step.id;
        context.progress = Math.round((i / totalSteps) * 100);

        this.logExecution(context, `Executing step: ${step.name}`);

        try {
          // Check condition if present
          if (step.condition && !this.evaluateCondition(step.condition, context.results)) {
            this.logExecution(context, `Skipping step ${step.name} (condition not met)`);
            continue;
          }

          // Execute step
          const result = await this.executeStep(step, context);

          // Store result
          if (step.outputs && step.outputs.length > 0) {
            step.outputs.forEach(outputId => {
              context.results[outputId] = result;
            });
          }

          this.logExecution(context, `Step ${step.name} completed successfully`);
        } catch (error: any) {
          const errorMsg = error?.message || 'Unknown error';
          context.errors.push({
            step: step.id,
            error: errorMsg,
            timestamp: new Date(),
          });

          // Retry if configured
          if (step.retryCount && step.retryCount > 0) {
            this.logExecution(
              context,
              `Retrying step ${step.name} (${step.retryCount} attempts remaining)`
            );
            step.retryCount--;
            i--; // Retry this step
            continue;
          }

          throw new Error(`Step ${step.name} failed: ${errorMsg}`);
        }
      }

      if (context.status !== 'cancelled') {
        context.status = 'completed';
        context.progress = 100;
        this.logExecution(context, 'Workflow completed successfully');
      }
    } catch (error: any) {
      context.status = 'failed';
      this.logExecution(context, `Workflow failed: ${error.message}`);
      throw error;
    } finally {
      context.endTime = new Date();
      this.saveExecutionResult(context);
      this.cancellationTokens.delete(context.executionId);
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    // Prepare inputs
    const inputs = this.prepareInputs(step, context.results);

    switch (step.type) {
      case 'tool':
        return await this.executeTool(step.tool!, inputs);

      case 'command':
        return await this.executeCommand(step.command!, inputs);

      case 'script':
        return await this.executeScript(step.command!, inputs);

      case 'condition':
        return this.evaluateCondition(step.condition!, inputs);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute a Biomni tool
   */
  private async executeTool(toolName: string, params: any): Promise<any> {
    // Map tool names to genomics service methods
    switch (toolName) {
      case 'blast':
        return await this.genomicsTools.blastSearch(params);

      case 'sequence-analysis':
        return await this.genomicsTools.analyzeSequence(params.sequence);

      case 'uniprot-search':
        return await this.genomicsTools.searchUniprot(params.query);

      case 'pdb-search':
        return await this.genomicsTools.searchPDB(params.query);

      case 'alphafold-search':
        return await this.genomicsTools.searchAlphaFold(params.query);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Execute a VSCode command
   */
  private async executeCommand(command: string, params: any): Promise<any> {
    return await vscode.commands.executeCommand(command, params);
  }

  /**
   * Execute a script
   */
  private async executeScript(script: string, context: any): Promise<any> {
    // Simple JavaScript evaluation (in production, use a sandbox)
    const func = new Function('context', script);
    return func(context);
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: string, context: any): boolean {
    try {
      const func = new Function('context', `return ${condition}`);
      return !!func(context);
    } catch {
      return false;
    }
  }

  /**
   * Prepare inputs for a step
   */
  private prepareInputs(step: WorkflowStep, results: Record<string, any>): any {
    const inputs: Record<string, any> = { ...step.parameters };

    if (step.inputs) {
      step.inputs.forEach(inputId => {
        if (results[inputId] !== undefined) {
          inputs[inputId] = results[inputId];
        }
      });
    }

    return inputs;
  }

  /**
   * Cancel a running workflow
   */
  cancelWorkflow(executionId: string): boolean {
    const token = this.cancellationTokens.get(executionId);
    if (token) {
      token.cancel();
      return true;
    }
    return false;
  }

  /**
   * Get workflow execution status
   */
  getExecutionStatus(executionId: string): WorkflowContext | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all workflows
   */
  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflows by category
   */
  getWorkflowsByCategory(category: string): Workflow[] {
    return this.getWorkflows().filter(w => w.category === category);
  }

  /**
   * Save a workflow
   */
  async saveWorkflow(workflow: Workflow): Promise<void> {
    workflow.modified = new Date();
    this.workflows.set(workflow.id, workflow);
    await this.persistWorkflows();
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<boolean> {
    const deleted = this.workflows.delete(workflowId);
    if (deleted) {
      await this.persistWorkflows();
    }
    return deleted;
  }

  /**
   * Import workflow from JSON
   */
  async importWorkflow(json: string): Promise<Workflow> {
    const workflow = JSON.parse(json) as Workflow;
    workflow.id = this.generateWorkflowId();
    workflow.created = new Date();
    workflow.modified = new Date();
    await this.saveWorkflow(workflow);
    return workflow;
  }

  /**
   * Export workflow to JSON
   */
  exportWorkflow(workflowId: string): string | undefined {
    const workflow = this.workflows.get(workflowId);
    return workflow ? JSON.stringify(workflow, null, 2) : undefined;
  }

  /**
   * Load workflow templates
   */
  private loadTemplates(): void {
    // Protein Analysis Pipeline
    this.workflows.set('protein-analysis', {
      id: 'protein-analysis',
      name: 'Protein Analysis Pipeline',
      description: 'Complete protein analysis: UniProt → AlphaFold → Domains → Function',
      category: 'proteomics',
      steps: [
        {
          id: 'uniprot-search',
          name: 'Search UniProt',
          type: 'tool',
          tool: 'uniprot-search',
          outputs: ['uniprot_result'],
        },
        {
          id: 'alphafold-structure',
          name: 'Get AlphaFold Structure',
          type: 'tool',
          tool: 'alphafold-search',
          inputs: ['uniprot_result'],
          outputs: ['structure'],
        },
        {
          id: 'analyze-domains',
          name: 'Analyze Protein Domains',
          type: 'tool',
          tool: 'interpro-search',
          inputs: ['uniprot_result'],
          outputs: ['domains'],
        },
      ],
      created: new Date(),
      modified: new Date(),
      tags: ['protein', 'structure', 'domains'],
      icon: '$(beaker)',
    });

    // Sequence Analysis Pipeline
    this.workflows.set('sequence-analysis', {
      id: 'sequence-analysis',
      name: 'Sequence Analysis Pipeline',
      description: 'BLAST → Alignment → Annotation → Visualization',
      category: 'genomics',
      steps: [
        {
          id: 'blast-search',
          name: 'BLAST Search',
          type: 'tool',
          tool: 'blast',
          outputs: ['blast_results'],
        },
        {
          id: 'analyze-sequence',
          name: 'Analyze Sequence Properties',
          type: 'tool',
          tool: 'sequence-analysis',
          outputs: ['properties'],
        },
        {
          id: 'export-results',
          name: 'Export Results',
          type: 'command',
          command: 'biomni.genomics.exportResults',
          inputs: ['blast_results', 'properties'],
        },
      ],
      created: new Date(),
      modified: new Date(),
      tags: ['sequence', 'blast', 'genomics'],
      icon: '$(search)',
    });

    // Drug Discovery Pipeline
    this.workflows.set('drug-discovery', {
      id: 'drug-discovery',
      name: 'Drug Target Discovery',
      description: 'Target → Structure → Docking → Analysis',
      category: 'drug-discovery',
      steps: [
        {
          id: 'find-target',
          name: 'Identify Drug Target',
          type: 'tool',
          tool: 'uniprot-search',
          outputs: ['target'],
        },
        {
          id: 'get-structure',
          name: 'Get Protein Structure',
          type: 'tool',
          tool: 'pdb-search',
          inputs: ['target'],
          outputs: ['structure'],
        },
        {
          id: 'molecular-docking',
          name: 'Run Molecular Docking',
          type: 'command',
          command: 'biomni.pharmacology.runDiffDock',
          inputs: ['structure'],
          outputs: ['docking_results'],
        },
      ],
      created: new Date(),
      modified: new Date(),
      tags: ['drug', 'docking', 'pharmacology'],
      icon: '$(combine)',
    });
  }

  /**
   * Load saved workflows
   */
  private loadWorkflows(): void {
    const saved = this.context.globalState.get<any[]>('biomni.workflows', []);
    saved.forEach(w => {
      const workflow = {
        ...w,
        created: new Date(w.created),
        modified: new Date(w.modified),
      };
      this.workflows.set(workflow.id, workflow);
    });
  }

  /**
   * Persist workflows to storage
   */
  private async persistWorkflows(): Promise<void> {
    const workflows = Array.from(this.workflows.values());
    await this.context.globalState.update('biomni.workflows', workflows);
  }

  /**
   * Save execution result
   */
  private saveExecutionResult(context: WorkflowContext): void {
    const workflow = this.workflows.get(context.workflowId);
    if (workflow) {
      this.resultsManager.storeResult(
        'workflow',
        workflow.name,
        {
          ...context.results,
          executionDetails: {
            status: context.status,
            errors: context.errors,
            logs: context.logs,
          },
        },
        `Execution ${context.executionId}`,
        (() => {
          const metadata: { duration?: number; parameters?: any; error?: string } = {
            duration: context.endTime ? context.endTime.getTime() - context.startTime.getTime() : 0,
          };
          if (workflow.variables) {
            metadata.parameters = workflow.variables;
          }
          const lastError = context.errors[context.errors.length - 1];
          if (lastError?.error) {
            metadata.error = lastError.error;
          }
          return metadata;
        })()
      );
    }
  }

  /**
   * Log execution message
   */
  private logExecution(context: WorkflowContext, message: string): void {
    const timestamp = new Date().toISOString();
    context.logs.push(`[${timestamp}] ${message}`);
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit: number = 10): WorkflowContext[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executions.clear();
  }
}
