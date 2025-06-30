export interface AgentConfig {
  name: string;
  legalName: string;
  brandName: string;
  brandVision: string;
  industry: string;
  products: string;
  valueProps: string;
  targetCustomers: string;
  tone: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'user' | 'agent' | 'system' | 'error';
}

export interface WebsiteResearchState {
  url: string;
  isProcessing: boolean;
  processingStep: string;
  generatedConfig: AgentConfig | null;
}