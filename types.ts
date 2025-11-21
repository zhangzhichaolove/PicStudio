export interface ImageConfig {
  rotation: number; // in degrees (0, 90, 180, 270)
  cropRatio: number | null; // null for free/original, or 1 (square), 16/9, etc.
  cropRect: CropRect | null; // The actual crop coordinates relative to the transformed image
  quality: number; // 0.1 to 1.0
  targetWidth: number;
  targetHeight: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  format: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
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