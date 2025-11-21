import { ImageConfig } from '../types';

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const getTransformedDimensions = (
  width: number, 
  height: number, 
  rotation: number
) => {
  const isVertical = rotation === 90 || rotation === 270;
  return {
    width: isVertical ? height : width,
    height: isVertical ? width : height
  };
};

export const processImage = async (
  imageSrc: string,
  config: ImageConfig
): Promise<string> => {
  const img = await loadImage(imageSrc);
  
  // --- Pass 1: Create the Intermediate Image (Rotated & Flipped) ---
  // We draw the full rotated/flipped image onto a canvas first. 
  // This simplifies the coordinate system for the subsequent crop/resize step.
  
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;
  
  // Calculate dimensions of the rotated bounding box
  const { width: intermediateWidth, height: intermediateHeight } = getTransformedDimensions(
    originalWidth, 
    originalHeight, 
    config.rotation
  );

  const intermediateCanvas = document.createElement('canvas');
  intermediateCanvas.width = intermediateWidth;
  intermediateCanvas.height = intermediateHeight;
  const ictx = intermediateCanvas.getContext('2d');
  
  if (!ictx) throw new Error('Could not get intermediate canvas context');

  ictx.save();
  ictx.translate(intermediateWidth / 2, intermediateHeight / 2);
  ictx.rotate((config.rotation * Math.PI) / 180);
  ictx.scale(
    config.flipHorizontal ? -1 : 1,
    config.flipVertical ? -1 : 1
  );
  // Draw centered
  ictx.drawImage(img, -originalWidth / 2, -originalHeight / 2);
  ictx.restore();

  // If we only need the intermediate image (e.g. for previewing crop), 
  // and no crop/resize is defined (or specific flag?), we could stop here.
  // However, usually this function is called to get the FINAL output.
  
  // --- Pass 2: Crop & Resize ---
  
  // Determine Source Rect (Crop) in the Intermediate Coordinate System
  let sx = 0, sy = 0, sWidth = intermediateWidth, sHeight = intermediateHeight;

  if (config.cropRect) {
    sx = config.cropRect.x;
    sy = config.cropRect.y;
    sWidth = config.cropRect.width;
    sHeight = config.cropRect.height;
  } else if (config.cropRatio) {
    // Fallback: Center Crop if ratio provided but no specific rect (legacy support)
    const currentRatio = intermediateWidth / intermediateHeight;
    if (currentRatio > config.cropRatio) {
      sWidth = intermediateHeight * config.cropRatio;
      sx = (intermediateWidth - sWidth) / 2;
    } else {
      sHeight = intermediateWidth / config.cropRatio;
      sy = (intermediateHeight - sHeight) / 2;
    }
  }

  // Determine Destination Size (Resize)
  // If target dimensions are provided, use them.
  // Otherwise, use the cropped dimensions.
  let finalWidth = config.targetWidth > 0 ? config.targetWidth : sWidth;
  let finalHeight = config.targetHeight > 0 ? config.targetHeight : sHeight;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = finalWidth;
  finalCanvas.height = finalHeight;
  const fctx = finalCanvas.getContext('2d');
  if (!fctx) throw new Error('Could not get final canvas context');

  // Draw from Intermediate -> Final
  fctx.drawImage(
    intermediateCanvas,
    sx, sy, sWidth, sHeight, // Source (Cropped)
    0, 0, finalWidth, finalHeight // Dest (Resized)
  );

  return finalCanvas.toDataURL(config.format, config.quality);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};