import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageConfig, ProcessingStatus, AIAnalysisResult } from './types';
import { readFileAsDataURL, processImage, formatFileSize } from './utils/imageUtils';
import { analyzeImageWithGemini } from './services/geminiService';
import ControlPanel from './components/ControlPanel';
import AIInsights from './components/AIInsights';

const INITIAL_CONFIG: ImageConfig = {
  rotation: 0,
  cropRatio: null,
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
  const [processedSize, setProcessedSize] = useState<number>(0);
  const [config, setConfig] = useState<ImageConfig>(INITIAL_CONFIG);
  const [origDimensions, setOrigDimensions] = useState({ width: 0, height: 0 });
  
  // Gemini State
  const [aiStatus, setAiStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  // Processing Debounce
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Initial Image Metadata
  useEffect(() => {
    if (originalImage) {
      const img = new Image();
      img.src = originalImage;
      img.onload = () => {
        setOrigDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        // Trigger initial process
        handleProcess(originalImage, config);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImage]);

  // Handle Configuration Changes with Debounce
  useEffect(() => {
    if (!originalImage) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setIsProcessing(true);
    timeoutRef.current = setTimeout(() => {
      handleProcess(originalImage, config);
    }, 300); // 300ms debounce for smooth sliding

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

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
    }
  };

  const handleAIAnalysis = async () => {
    if (!processedImage) return;
    setAiStatus(ProcessingStatus.ANALYZING);
    try {
      // Use the processed image for analysis so the AI sees what the user cropped/rotated
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
          <h1 className="text-xl font-bold tracking-tight text-white">OptiPic <span className="text-blue-400 font-light">Studio</span></h1>
        </div>
        
        <div className="flex gap-4">
           <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors border border-gray-600 text-sm font-medium">
             Upload Image
             <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
           </label>
           {processedImage && (
             <button 
               onClick={downloadImage}
               className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors shadow-lg shadow-blue-900/50 text-sm font-bold flex items-center gap-2"
             >
               Download <span className="opacity-70 font-normal text-xs">({formatFileSize(processedSize)})</span>
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
             <p className="text-lg font-medium">Drag & drop an image here</p>
             <p className="text-sm opacity-60">or click Upload in the top right</p>
          </div>
        ) : (
          <>
            {/* Left Sidebar: Controls */}
            <div className="w-full md:w-80 lg:w-96 bg-surface/50 border-r border-gray-700 flex flex-col overflow-hidden shrink-0">
               {/* Tabs for Control vs AI - Mobile only concept, but for now stacked or toggled */}
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  <ControlPanel 
                    config={config} 
                    onChange={setConfig} 
                    originalDimensions={origDimensions}
                    onReset={() => setConfig(INITIAL_CONFIG)}
                  />
                  
                  <AIInsights 
                    onAnalyze={handleAIAnalysis}
                    status={aiStatus}
                    result={aiResult}
                  />
               </div>
            </div>

            {/* Center: Preview Stage */}
            <div className="flex-1 bg-black/40 relative overflow-hidden flex items-center justify-center p-8">
              
              {/* Canvas Pattern Background */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" 
                   style={{
                     backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', 
                     backgroundSize: '20px 20px'
                   }}>
              </div>

              {isProcessing && (
                 <div className="absolute z-50 bg-black/60 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 backdrop-blur-md border border-white/10">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    Processing...
                 </div>
              )}

              {processedImage && (
                <img 
                  src={processedImage} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain shadow-2xl border border-gray-800/50 rounded-sm transition-opacity duration-200"
                  style={{ opacity: isProcessing ? 0.7 : 1 }}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}