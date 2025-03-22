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
  parentId?: string;
  dryRun?: boolean;
  mimeType?: string;
  optimizeImage?: boolean;
  includeMetadata?: boolean;
  metadataStorage?: 'on-chain';
  metadataJson?: string;
}

export interface CommandsData {
  commands: string[];
  fileName: string;
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
