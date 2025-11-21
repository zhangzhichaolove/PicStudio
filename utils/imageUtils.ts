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

export const processImage = async (
  imageSrc: string,
  config: ImageConfig
): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Calculate Dimensions considering Rotation
  const isVertical = config.rotation === 90 || config.rotation === 270;
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  // Initial logical dimensions before resizing
  let logicalWidth = originalWidth;
  let logicalHeight = originalHeight;

  // 2. Apply Crop (Logic: Center Crop)
  let sx = 0;
  let sy = 0;
  let sWidth = originalWidth;
  let sHeight = originalHeight;

  if (config.cropRatio) {
    const currentRatio = originalWidth / originalHeight;
    if (currentRatio > config.cropRatio) {
      // Image is wider than target: crop width
      sWidth = originalHeight * config.cropRatio;
      sx = (originalWidth - sWidth) / 2;
    } else {
      // Image is taller than target: crop height
      sHeight = originalWidth / config.cropRatio;
      sy = (originalHeight - sHeight) / 2;
    }
    // Update logical dimensions after crop
    logicalWidth = sWidth;
    logicalHeight = sHeight;
  }

  // 3. Determine Final Canvas Size (Resize + Rotate)
  // If user specified a target size, we scale the logical dimensions to that
  // Otherwise, use the logical (cropped) dimensions
  const scaleX = config.targetWidth > 0 ? config.targetWidth / logicalWidth : 1;
  const scaleY = config.targetHeight > 0 ? config.targetHeight / logicalHeight : 1;
  
  // Maintain aspect ratio if only one dimension is provided, or use the smallest scale if both provided but aspect ratio locked (simplified here: we trust the config values)
  // For this implementation, we assume targetWidth/Height matches the cropped aspect ratio or user intent.
  
  let finalWidth = config.targetWidth || logicalWidth;
  let finalHeight = config.targetHeight || logicalHeight;

  // If rotated 90/270, swap final canvas dimensions
  if (isVertical) {
    canvas.width = finalHeight;
    canvas.height = finalWidth;
  } else {
    canvas.width = finalWidth;
    canvas.height = finalHeight;
  }

  // 4. Draw
  ctx.save();

  // Move to center of canvas for rotation
  ctx.translate(canvas.width / 2, canvas.height / 2);

  // Rotate
  ctx.rotate((config.rotation * Math.PI) / 180);

  // Flip
  ctx.scale(
    config.flipHorizontal ? -1 : 1,
    config.flipVertical ? -1 : 1
  );

  // Draw Image
  // We draw the cropped portion (sx, sy, sWidth, sHeight)
  // into the rect (-finalWidth/2, -finalHeight/2, finalWidth, finalHeight)
  // Note: If rotated, we still draw into the 'unrotated' local coordinate system
  ctx.drawImage(
    img,
    sx, sy, sWidth, sHeight,
    -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight
  );

  ctx.restore();

  return canvas.toDataURL(config.format, config.quality);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
