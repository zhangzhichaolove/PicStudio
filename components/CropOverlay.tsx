
import React, { useState, useEffect, useRef } from 'react';
import { CropRect } from '../types';

interface CropOverlayProps {
  rect: CropRect;
  onChange: (rect: CropRect) => void;
  imageDimensions: { width: number; height: number }; // Dimensions of the underlying image (unscaled)
  viewTransform: { x: number; y: number; scale: number }; // Visual transform of the container
  aspectRatio: number | null;
}

const HANDLE_SIZE = 12; // Size of resize handles in pixels

const CropOverlay: React.FC<CropOverlayProps> = ({
  rect,
  onChange,
  imageDimensions,
  viewTransform,
  aspectRatio
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; rect: CropRect } | null>(null);

  // Convert Screen Mouse Delta -> Image Coordinate Delta
  const toImageDelta = (val: number) => val / viewTransform.scale;

  // Handle Style: Apply inverse scale so handles stay same size visually regardless of zoom
  const handleStyle = (top: boolean, left: boolean): React.CSSProperties => {
    const inverseScale = 1 / viewTransform.scale;
    const offset = -(HANDLE_SIZE * inverseScale) / 2; // Center the handle
    
    return {
      position: 'absolute',
      width: HANDLE_SIZE * inverseScale,
      height: HANDLE_SIZE * inverseScale,
      left: left ? offset : undefined,
      right: !left ? offset : undefined,
      top: top ? offset : undefined,
      bottom: !top ? offset : undefined,
      backgroundColor: 'white',
      border: `${1 * inverseScale}px solid #3b82f6`,
      cursor: top ? (left ? 'nw-resize' : 'ne-resize') : (left ? 'sw-resize' : 'se-resize'),
      zIndex: 20,
      pointerEvents: 'auto',
      boxShadow: `0 0 ${4 * inverseScale}px rgba(0,0,0,0.3)`
    };
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDragType(type);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rect: { ...rect }
    };
  };

  useEffect(() => {
    const handleWindowMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      // Calculate delta in Image Coordinates
      const deltaX = toImageDelta(e.clientX - dragStartRef.current.x);
      const deltaY = toImageDelta(e.clientY - dragStartRef.current.y);
      const startRect = dragStartRef.current.rect;
      
      let newRect = { ...startRect };

      if (dragType === 'move') {
        newRect.x = Math.max(0, Math.min(startRect.x + deltaX, imageDimensions.width - startRect.width));
        newRect.y = Math.max(0, Math.min(startRect.y + deltaY, imageDimensions.height - startRect.height));
      } else {
        // Resizing logic
        let newLeft = startRect.x;
        let newTop = startRect.y;
        let newRight = startRect.x + startRect.width;
        let newBottom = startRect.y + startRect.height;

        // Apply raw deltas
        if (dragType?.includes('w')) newLeft = Math.min(startRect.x + deltaX, newRight - 10);
        if (dragType?.includes('e')) newRight = Math.max(startRect.x + startRect.width + deltaX, newLeft + 10);
        if (dragType?.includes('n')) newTop = Math.min(startRect.y + deltaY, newBottom - 10);
        if (dragType?.includes('s')) newBottom = Math.max(startRect.y + startRect.height + deltaY, newTop + 10);

        // Bounds Checking (Contain in image)
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newRight > imageDimensions.width) newRight = imageDimensions.width;
        if (newBottom > imageDimensions.height) newBottom = imageDimensions.height;

        // Enforce Aspect Ratio (if set)
        if (aspectRatio) {
           let w = newRight - newLeft;
           let h = newBottom - newTop;
           
           // Adjust height based on width for simplicity, or vice versa depending on handle
           // Here we drive by the dominant direction or just Width for simplicity
           if (dragType === 'se' || dragType === 'ne' || dragType === 'sw' || dragType === 'nw') {
             // Use width to determine height
             h = w / aspectRatio;
             
             // If height pushes out of bounds, recalculate based on height limit
             if (dragType.includes('s') && newTop + h > imageDimensions.height) {
                h = imageDimensions.height - newTop;
                w = h * aspectRatio;
             } else if (dragType.includes('n') && newBottom - h < 0) {
                h = newBottom;
                w = h * aspectRatio;
             }
           }
           
           // Apply calculated dimensions back to coordinates
           if (dragType === 'se') { newBottom = newTop + h; newRight = newLeft + w; }
           if (dragType === 'ne') { newTop = newBottom - h; newRight = newLeft + w; }
           if (dragType === 'sw') { newBottom = newTop + h; newLeft = newRight - w; }
           if (dragType === 'nw') { newTop = newBottom - h; newLeft = newRight - w; }
        }
        
        newRect.x = newLeft;
        newRect.y = newTop;
        newRect.width = newRight - newLeft;
        newRect.height = newBottom - newTop;
      }

      onChange(newRect);
    };

    const handleWindowUp = () => {
      setIsDragging(false);
      setDragType(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMove);
      window.addEventListener('mouseup', handleWindowUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
    };
  }, [isDragging, dragType, imageDimensions, viewTransform, aspectRatio, onChange]);

  // Position the Overlay div using Image Coordinates
  // Since this component is rendered INSIDE the transformed container in App.tsx,
  // we just use the rect coordinates directly.
  const boxStyle: React.CSSProperties = {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    // Huge shadow acts as the dimming overlay. 
    // Using vmin guarantees it covers the screen even if zoomed out, though 9999px usually works too.
    boxShadow: '0 0 0 50000px rgba(0, 0, 0, 0.6)', 
    border: `${1 / viewTransform.scale}px solid rgba(255, 255, 255, 0.8)`,
    zIndex: 10,
    cursor: 'move',
    // Ensure standard box model
    boxSizing: 'border-box' 
  };

  // Grid lines styles (inverse scaled to keep thin lines)
  const gridLineStyle = (isVertical: boolean, pos: string): React.CSSProperties => ({
      position: 'absolute',
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      ...(isVertical 
          ? { top: 0, bottom: 0, width: `${1/viewTransform.scale}px`, left: pos } 
          : { left: 0, right: 0, height: `${1/viewTransform.scale}px`, top: pos }
      ),
      pointerEvents: 'none'
  });

  return (
    <div style={boxStyle} onMouseDown={(e) => handleMouseDown(e, 'move')}>
       {/* Grid of Thirds */}
       <div style={gridLineStyle(true, '33.33%')} />
       <div style={gridLineStyle(true, '66.66%')} />
       <div style={gridLineStyle(false, '33.33%')} />
       <div style={gridLineStyle(false, '66.66%')} />

       {/* Handles */}
       <div style={handleStyle(true, true)} onMouseDown={(e) => handleMouseDown(e, 'nw')} />
       <div style={handleStyle(true, false)} onMouseDown={(e) => handleMouseDown(e, 'ne')} />
       <div style={handleStyle(false, true)} onMouseDown={(e) => handleMouseDown(e, 'sw')} />
       <div style={handleStyle(false, false)} onMouseDown={(e) => handleMouseDown(e, 'se')} />
    </div>
  );
};

export default CropOverlay;
