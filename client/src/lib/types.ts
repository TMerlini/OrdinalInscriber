export interface UploadedFile {
  file: File;
  id: string;
  url: string;
  size: number;
  type: string;
  selected?: boolean;
  optimize?: boolean;
  formattedSize?: string;
}

export enum StepStatus {
  DEFAULT = 'default',
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  READY = 'ready',
  PROGRESS = 'progress'
}

export interface ExecutionStep {
  description?: string;
  command?: string;
  status: StepStatus;
  output?: string;
  error?: string;
}

export interface CommandsData {
  commands: string[];
  fileId: string;
}

export interface InscriptionResult {
  success: boolean;
  inscriptionId?: string;
  txid?: string;
  transactionId?: string;
  feePaid?: string;
  message?: string;
  error?: string;
  errorMessage?: string;
  satPoint?: string;
  satName?: string;
  manualCommand?: string;
  containerFilePath?: string;
}

export interface ConfigOptions {
  containerPath: string;
  feeRate: number;
  destination?: string;
  noLimitCheck?: boolean;
  satPoint?: string;
  selectedSatoshi?: string;
  selectedSatoshis?: string[];
  useSatRarity?: boolean;
  parentId?: string;
  dryRun?: boolean;
  mimeType?: string;
  optimizeImage?: boolean;
  includeMetadata?: boolean;
  metadataStorage?: string;
  metadataJson?: string;
}

export interface BatchProcessingItem {
  fileId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: InscriptionResult;
  steps?: ExecutionStep[];
  error?: string;
  commands?: string[];
  parentId?: string;
}

export interface BatchProcessingState {
  inProgress: boolean;
  items: BatchProcessingItem[];
  currentItemIndex: number;
  completedCount: number;
  failedCount: number;
}