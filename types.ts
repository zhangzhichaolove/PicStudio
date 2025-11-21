export interface ImageConfig {
  rotation: number; // in degrees (0, 90, 180, 270)
  cropRatio: number | null; // null for original, or 1 (square), 16/9, etc.
  quality: number; // 0.1 to 1.0
  targetWidth: number;
  targetHeight: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  format: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface AIAnalysisResult {
  title: string;
  description: string;
  tags: string[];
  suggestedFilename: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
