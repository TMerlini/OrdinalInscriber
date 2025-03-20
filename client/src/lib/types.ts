export interface UploadedFile {
  file: File;
  preview: string;
  dimensions: {
    width: number;
    height: number;
  } | null;
}

export interface ConfigOptions {
  containerName: string;
  feeRate: number;
  containerPath?: string;
  port?: number;
  advancedMode: boolean;
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
