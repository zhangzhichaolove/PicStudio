
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageConfig, ProcessingStatus, AIAnalysisResult, CropRect } from './types';
import { readFileAsDataURL, processImage, formatFileSize, getTransformedDimensions } from './utils/imageUtils';
import { analyzeImageWithGemini } from './services/geminiService';
import ControlPanel from './components/ControlPanel';
import AIInsights from './components/AIInsights';
import CropOverlay from './components/CropOverlay';
import { translations, Language } from './utils/i18n';

const INITIAL_CONFIG: ImageConfig = {
  rotation: 0,
  cropRatio: null,
  cropRect: null,
  quality: 0.9,
  targetWidth: 0,
  targetHeight: 0,
  flipHorizontal: false,
  flipVertical: false,
  format: 'image/jpeg',
};

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  // Intermediate Image: Rotated/Flipped but NOT cropped. Used for the Crop Editor view.
  const [intermediateImage, setIntermediateImage] = useState<string | null>(null); 
  
  const [processedSize, setProcessedSize] = useState<number>(0);
  const [config, setConfig] = useState<ImageConfig>(INITIAL_CONFIG);
  const [origDimensions, setOrigDimensions] = useState({ width: 0, height: 0 });
  
  // Crop State
  const [isCropping, setIsCropping] = useState(false);

  // Language State
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Gemini State
  const [aiStatus, setAiStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  // Processing Debounce
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // View Transform State (Pan & Zoom)
  const [viewTransform, setViewTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const viewStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(false);

  // Load Initial Image Metadata
  useEffect(() => {
    if (originalImage) {
      const img = new Image();
      img.src = originalImage;
      img.onload = () => {
        setOrigDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        // Generate initial intermediate image
        updateIntermediateImage(originalImage, config);
        // Trigger initial process
        handleProcess(originalImage, config);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImage]);

  // Update Intermediate Image when Rotation/Flip changes
  const updateIntermediateImage = async (src: string, cfg: ImageConfig) => {
    try {
        // Generate an image that is rotated/flipped but NOT cropped/resized
        const intermediateUrl = await processImage(src, {
            ...cfg,
            cropRect: null,
            cropRatio: null,
            targetWidth: 0,
            targetHeight: 0
        });
        setIntermediateImage(intermediateUrl);
    } catch (e) {
        console.error("Failed to update intermediate image", e);
    }
  };

  // Effect: When rotation/flip changes, update intermediate and clear crop
  useEffect(() => {
      if (!originalImage) return;
      // Check if transform changed (shallow comparison or just always update if rotation changed)
      // For simplicity, we update intermediate on specific keys
      updateIntermediateImage(originalImage, config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.rotation, config.flipHorizontal, config.flipVertical, originalImage]);

  // Handle Configuration Changes with Debounce
  useEffect(() => {
    if (!originalImage) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Don't fully re-process if we are just dragging the crop box (performance)
    // But we DO want to see the result? 
    // Strategy: If isCropping, we show the Intermediate Image + Overlay. We don't need to re-process 'processedImage' constantly.
    // We only re-process processedImage when NOT isCropping (or when user clicks Apply).
    
    if (!isCropping) {
        setIsProcessing(true);
        timeoutRef.current = setTimeout(() => {
          handleProcess(originalImage, config);
        }, 300);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, isCropping]); // Re-run when isCropping toggles to false

  // Auto Fit on First Load
  useEffect(() => {
    if (intermediateImage && isFirstLoadRef.current && containerRef.current) {
      const img = new Image();
      img.onload = () => {
          if (!containerRef.current) return;
          const { clientWidth, clientHeight } = containerRef.current;
          const { naturalWidth, naturalHeight } = img;
          
          const padding = 40;
          const availableWidth = Math.max(100, clientWidth - padding);
          const availableHeight = Math.max(100, clientHeight - padding);
          
          const scaleX = availableWidth / naturalWidth;
          const scaleY = availableHeight / naturalHeight;
          
          // Fit to screen
          const scale = Math.min(scaleX, scaleY, 1); 
          
          setViewTransform({
              scale: scale,
              x: (clientWidth - naturalWidth * scale) / 2, // Center it
              y: (clientHeight - naturalHeight * scale) / 2
          });
          isFirstLoadRef.current = false;
      };
      img.src = intermediateImage; // Base fit on the rotated full image
    }
  }, [intermediateImage]);

  const handleProcess = async (src: string, cfg: ImageConfig) => {
    try {
      const resultDataUrl = await processImage(src, cfg);
      setProcessedImage(resultDataUrl);
      
      // Calculate size roughly
      const base64Length = resultDataUrl.length - (resultDataUrl.indexOf(',') + 1);
      const padding = (resultDataUrl.charAt(resultDataUrl.length - 2) === '=') ? 2 : ((resultDataUrl.charAt(resultDataUrl.length - 1) === '=') ? 1 : 0);
      const sizeInBytes = (base64Length * 0.75) - padding;
      setProcessedSize(sizeInBytes);
    } catch (e) {
      console.error("Processing failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await readFileAsDataURL(file);
      setOriginalImage(url);
      setConfig(INITIAL_CONFIG);
      setAiResult(null);
      setAiStatus(ProcessingStatus.IDLE);
      setIsCropping(false);
      isFirstLoadRef.current = true;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (!file.type.startsWith('image/')) return;
        const url = await readFileAsDataURL(file);
        setOriginalImage(url);
        setConfig(INITIAL_CONFIG);
        setAiResult(null);
        setAiStatus(ProcessingStatus.IDLE);
        setIsCropping(false);
        isFirstLoadRef.current = true;
    }
  };

  const handleAIAnalysis = async () => {
    if (!processedImage) return;
    setAiStatus(ProcessingStatus.ANALYZING);
    try {
      // Use the processed image for analysis
      const result = await analyzeImageWithGemini(processedImage, config.format);
      setAiResult(result);
      setAiStatus(ProcessingStatus.SUCCESS);
    } catch (error) {
      setAiStatus(ProcessingStatus.ERROR);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    const ext = config.format.split('/')[1];
    const name = aiResult?.suggestedFilename 
      ? `${aiResult.suggestedFilename}.${ext}` 
      : `optipic-edited.${ext}`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Crop Logic ---

  const handleToggleCrop = (enable: boolean, ratio?: number | null) => {
    if (enable) {
        // Entering Crop Mode
        setIsCropping(true);
        
        // If ratio is provided (or we already have one), calculate a new default cropRect if none exists
        const targetRatio = ratio !== undefined ? ratio : config.cropRatio;
        
        // Calculate dimensions of the intermediate image (Rotated/Flipped)
        const { width, height } = getTransformedDimensions(
            origDimensions.width, 
            origDimensions.height, 
            config.rotation
        );
        
        // If we don't have a rect, or if the user switched ratio, re-calculate center crop
        if (!config.cropRect || ratio !== undefined) {
             let newRect: CropRect;
             
             if (targetRatio) {
                 // Center Crop based on ratio
                 let w = width;
                 let h = height;
                 if (width / height > targetRatio) {
                     w = height * targetRatio;
                 } else {
                     h = width / targetRatio;
                 }
                 newRect = {
                     x: (width - w) / 2,
                     y: (height - h) / 2,
                     width: w,
                     height: h
                 };
             } else {
                 // Free crop: Start with 90% size centered
                 newRect = {
                     x: width * 0.05,
                     y: height * 0.05,
                     width: width * 0.9,
                     height: height * 0.9
                 };
             }
             setConfig(prev => ({ ...prev, cropRatio: targetRatio || null, cropRect: newRect }));
        } else {
            // Just enable mode with existing rect
             setConfig(prev => ({ ...prev, cropRatio: targetRatio || null }));
        }

    } else {
        // Exiting Crop Mode (Apply)
        setIsCropping(false);
    }
  };

  // --- Pan & Zoom Handlers ---

  const resetView = () => {
      if (intermediateImage && containerRef.current) {
           const { width, height } = getTransformedDimensions(origDimensions.width, origDimensions.height, config.rotation);
           const cw = containerRef.current.clientWidth;
           const ch = containerRef.current.clientHeight;
           const padding = 40;
           
           const scale = Math.min((cw - padding) / width, (ch - padding) / height);
           setViewTransform({
               scale: scale,
               x: (cw - width * scale) / 2,
               y: (ch - height * scale) / 2
           });
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    
    const scaleSensitivity = -0.001; // Inverted for standard scroll-to-zoom
    const delta = e.deltaY * scaleSensitivity;
    const currentScale = viewTransform.scale;
    const newScale = Math.min(Math.max(0.05, currentScale + delta), 10);

    // Calculate mouse position relative to the container
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate the point on the image (content coordinate system) that is currently under the mouse
    // Formula: mouse = translation + point * scale
    // Therefore: point = (mouse - translation) / scale
    const contentX = (mouseX - viewTransform.x) / currentScale;
    const contentY = (mouseY - viewTransform.y) / currentScale;

    // Calculate new translation such that the content point remains under the mouse at the new scale
    // newTranslation = mouse - point * newScale
    const newX = mouseX - (contentX * newScale);
    const newY = mouseY - (contentY * newScale);

    setViewTransform({
      scale: newScale,
      x: newX,
      y: newY
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!processedImage && !intermediateImage) return;
    // If interacting with Crop Overlay handles, don't pan (handled by stopPropagation in overlay)
    
    e.preventDefault(); 
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    viewStartRef.current = { x: viewTransform.x, y: viewTransform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    setViewTransform(prev => ({
      ...prev,
      x: viewStartRef.current.x + dx,
      y: viewStartRef.current.y + dy
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => {
      if (!containerRef.current) return;
      // Zoom into center
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const currentScale = viewTransform.scale;
      const newScale = Math.min(currentScale + 0.2, 10);
      
      const contentX = (centerX - viewTransform.x) / currentScale;
      const contentY = (centerY - viewTransform.y) / currentScale;
      
      const newX = centerX - (contentX * newScale);
      const newY = centerY - (contentY * newScale);
      
      setViewTransform({ scale: newScale, x: newX, y: newY });
  };

  const zoomOut = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const currentScale = viewTransform.scale;
      const newScale = Math.max(currentScale - 0.2, 0.05);
      
      const contentX = (centerX - viewTransform.x) / currentScale;
      const contentY = (centerY - viewTransform.y) / currentScale;
      
      const newX = centerX - (contentX * newScale);
      const newY = centerY - (contentY * newScale);
      
      setViewTransform({ scale: newScale, x: newX, y: newY });
  };

  // Calculate dimensions for CropOverlay
  const transformedDims = getTransformedDimensions(origDimensions.width, origDimensions.height, config.rotation);

  return (
    <div 
        className="min-h-screen bg-dark text-gray-200 flex flex-col h-screen"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
    >
      {/* Header */}
      <header className="bg-surface border-b border-gray-700 px-6 py-4 flex justify-between items-center shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">{t.appTitle}</h1>
        </div>
        
        <div className="flex gap-4 items-center">
           <div className="bg-gray-800 rounded flex overflow-hidden border border-gray-600 mr-2">
             <button 
               onClick={() => setLang('en')} 
               className={`px-2 py-1 text-xs font-bold ${lang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
               EN
             </button>
             <button 
               onClick={() => setLang('zh')} 
               className={`px-2 py-1 text-xs font-bold ${lang === 'zh' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
               中
             </button>
           </div>

           <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors border border-gray-600 text-sm font-medium">
             {t.upload}
             <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
           </label>
           {processedImage && (
             <button 
               onClick={downloadImage}
               className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors shadow-lg shadow-blue-900/50 text-sm font-bold flex items-center gap-2"
             >
               {t.download} <span className="opacity-70 font-normal text-xs">({formatFileSize(processedSize)})</span>
             </button>
           )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
        {!originalImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-4 bg-dark/50 backdrop-blur-sm">
             <div className="w-24 h-24 border-4 border-dashed border-gray-700 rounded-2xl flex items-center justify-center mb-2">
                <svg className="w-10 h-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
             </div>
             <p className="text-lg font-medium">{t.dragDrop}</p>
             <p className="text-sm opacity-60">{t.dragDropSub}</p>
          </div>
        ) : (
          <>
            {/* Left Sidebar: Controls */}
            <div className="w-full md:w-80 lg:w-96 bg-surface/50 border-r border-gray-700 flex flex-col overflow-hidden shrink-0 z-20">
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  <ControlPanel 
                    config={config} 
                    onChange={setConfig} 
                    originalDimensions={origDimensions}
                    onReset={() => {
                        setConfig(INITIAL_CONFIG);
                        setIsCropping(false);
                        resetView();
                    }}
                    t={t}
                    isCropping={isCropping}
                    onToggleCrop={handleToggleCrop}
                  />
                  
                  {!isCropping && (
                      <AIInsights 
                        onAnalyze={handleAIAnalysis}
                        status={aiStatus}
                        result={aiResult}
                        t={t}
                      />
                  )}
               </div>
            </div>

            {/* Center: Preview Stage */}
            <div 
                ref={containerRef}
                className="flex-1 bg-black/40 relative overflow-hidden flex items-center justify-center p-0"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              
              {/* Canvas Pattern Background */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" 
                   style={{
                     backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', 
                     backgroundSize: '20px 20px',
                     backgroundPosition: `${viewTransform.x}px ${viewTransform.y}px` 
                   }}>
              </div>

              {isProcessing && !isCropping && (
                 <div className="absolute z-50 bg-black/60 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 backdrop-blur-md border border-white/10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    Processing...
                 </div>
              )}

              <div 
                  style={{
                    transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                  className="will-change-transform"
              >
                  {/* 
                      DISPLAY LOGIC:
                      If isCropping: Show Intermediate Image (Rotated/Flipped) + Crop Overlay
                      Else: Show Final Processed Image 
                  */}
                  
                  {isCropping && intermediateImage ? (
                      <div className="relative">
                          <img 
                            src={intermediateImage} 
                            alt="Crop Preview" 
                            className="max-w-none shadow-2xl border border-gray-800/50 rounded-sm pointer-events-none select-none"
                            draggable={false}
                          />
                          {config.cropRect && (
                             <CropOverlay 
                                rect={config.cropRect}
                                onChange={(newRect) => setConfig(prev => ({ ...prev, cropRect: newRect }))}
                                imageDimensions={transformedDims}
                                viewTransform={viewTransform}
                                aspectRatio={config.cropRatio}
                             />
                          )}
                      </div>
                  ) : (
                      processedImage && (
                        <img 
                            src={processedImage} 
                            alt="Preview" 
                            className="max-w-none shadow-2xl border border-gray-800/50 rounded-sm pointer-events-none select-none"
                            style={{ opacity: isProcessing ? 0.7 : 1 }}
                            draggable={false}
                        />
                      )
                  )}
              </div>
              
              {/* Overlay instructions for crop mode */}
              {isCropping && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-4 py-2 rounded-full shadow-lg pointer-events-none z-40 animate-pulse">
                      {t.crop} Mode Active - Adjust Box
                  </div>
              )}

              {/* Floating Zoom Controls */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-gray-800/90 backdrop-blur border border-gray-700 p-1.5 rounded-full shadow-xl z-30">
                  <button onClick={zoomOut} className="p-2 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </button>
                  <span className="text-xs font-medium text-gray-300 w-12 text-center select-none">
                      {Math.round(viewTransform.scale * 100)}%
                  </span>
                  <button onClick={zoomIn} className="p-2 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <div className="w-px h-4 bg-gray-600 mx-1"></div>
                  <button onClick={resetView} className="px-3 py-1 text-xs font-medium hover:bg-gray-700 rounded-full text-gray-300 hover:text-white transition-colors">
                      {t.reset}
                  </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
