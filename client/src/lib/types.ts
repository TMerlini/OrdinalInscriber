export interface UploadedFile {
  file: File;
  preview: string;
  dimensions: {
    width: number;
    height: number;
  } | null;
  fileType: 'image' | 'model';
  sizeWarning?: {
    type: 'warning' | 'danger';
    message: string;
  };
  optimizationAvailable?: boolean;
  id?: string; // Unique ID for tracking in batch processing
  selected?: boolean; // Whether the file is selected for batch processing
}

export interface ConfigOptions {
  containerName: string;
  feeRate: number;
  containerPath?: string;
  port?: number;
  advancedMode: boolean;
  noLimitCheck?: boolean;
  destination?: string;
  satPoint?: string;
  selectedSatoshi?: string;
  useSatRarity?: boolean;
  parentId?: string;
  dryRun?: boolean;
  mimeType?: string;
  optimizeImage?: boolean;
  includeMetadata?: boolean;
  metadataStorage?: 'on-chain';
  metadataJson?: string;
  batchMode?: boolean; // Whether this is a batch processing operation
}

export interface CommandsData {
  commands: string[];
  fileName: string;
  fileId?: string; // ID of the file for batch processing
}

export enum StepStatus {
  DEFAULT = "default",
  PROGRESS = "progress",
  SUCCESS = "success",
  ERROR = "error",
  READY = "ready"
}

export interface ExecutionStep {
  status: StepStatus;
  output: string;
}

export interface InscriptionResult {
  success: boolean;
  inscriptionId?: string;
  transactionId?: string;
  feePaid?: string;
  errorMessage?: string;
}

export interface BatchProcessingItem {
  fileId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  commands?: string[];
  result?: InscriptionResult;
  steps: ExecutionStep[];
}

export interface BatchProcessingState {
  inProgress: boolean;
  items: BatchProcessingItem[];
  currentItemIndex: number;
  completedCount: number;
  failedCount: number;
}
