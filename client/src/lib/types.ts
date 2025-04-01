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
  message?: string;
  error?: string;
  satPoint?: string;
  satName?: string;
}

export interface ConfigOptions {
  containerPath: string;
  feeRate: string;
  metadataJson?: string;
  parentInscriptionId?: string;
  destinationAddress?: string;
  useSatRarity?: boolean;
  selectedSat?: string;
}

export interface BatchProcessingItem {
  fileId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress?: number;
  result?: InscriptionResult;
  steps?: ExecutionStep[];
  error?: string;
}

export interface BatchProcessingState {
  isProcessing: boolean;
  currentItem: BatchProcessingItem | null;
  progress: number;
  total: number;
  startTime: Date | null;
  errors: string[];
  items?: BatchProcessingItem[];
}