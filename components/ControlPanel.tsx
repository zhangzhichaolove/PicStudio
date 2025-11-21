import React from 'react';
import { ImageConfig, CropRect } from '../types';
import { translations } from '../utils/i18n';
import { getTransformedDimensions } from '../utils/imageUtils';

interface ControlPanelProps {
  config: ImageConfig;
  onChange: (newConfig: ImageConfig) => void;
  originalDimensions: { width: number; height: number };
  onReset: () => void;
  t: typeof translations.en;
  isCropping: boolean;
  onToggleCrop: (enabled: boolean, ratio?: number | null) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChange,
  originalDimensions,
  onReset,
  t,
  isCropping,
  onToggleCrop
}) => {
  
  const updateConfig = (key: keyof ImageConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const AspectRatios = [
    { label: t.ratios.custom, value: -1 }, // Special value for "Custom" but locked to current crop
    { label: t.ratios.square, value: 1 },
    { label: t.ratios.landscape, value: 16 / 9 },
    { label: t.ratios.portrait, value: 9 / 16 },
    { label: t.ratios.standard, value: 4 / 3 },
  ];

  return (
    <div className="flex flex-col gap-6 p-5 bg-surface rounded-xl shadow-lg border border-gray-700 h-full overflow-y-auto">
      <div className="flex justify-between items-center border-b border-gray-700 pb-4">
        <h2 className="text-xl font-bold text-white">{t.tools}</h2>
        <button 
          onClick={onReset}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          {t.reset}
        </button>
      </div>

      {/* Rotation & Flip */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t.transform}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateConfig('rotation', (config.rotation - 90 + 360) % 360)}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
            disabled={isCropping} // Disable rotation while cropping to avoid coord issues
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            {t.rotateL}
          </button>
          <button
            onClick={() => updateConfig('rotation', (config.rotation + 90) % 360)}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
            disabled={isCropping}
          >
            {t.rotateR}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
          </button>
          <button
            onClick={() => updateConfig('flipHorizontal', !config.flipHorizontal)}
            className={`py-2 px-3 rounded transition-colors text-xs sm:text-sm ${config.flipHorizontal ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
            disabled={isCropping}
          >
            {t.flipH}
          </button>
          <button
            onClick={() => updateConfig('flipVertical', !config.flipVertical)}
            className={`py-2 px-3 rounded transition-colors text-xs sm:text-sm ${config.flipVertical ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
            disabled={isCropping}
          >
            {t.flipV}
          </button>
        </div>
      </div>

      {/* Cropping */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
           <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t.crop}</label>
           {isCropping && (
               <div className="flex gap-2">
                   <button 
                     onClick={() => onToggleCrop(false)}
                     className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded"
                   >
                     {t.apply}
                   </button>
                   <button 
                     onClick={() => {
                        // Cancel: revert cropRect to null? Or just exit?
                        // For now, just exit but keep crop if it was already set? 
                        // Simpler: Exit implies keeping changes if real-time, but here we treat as Apply.
                        onToggleCrop(false);
                     }}
                     className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded"
                   >
                     {t.done}
                   </button>
               </div>
           )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Reset Crop Button */}
          <button
             onClick={() => {
                 onChange({ ...config, cropRatio: null, cropRect: null });
                 onToggleCrop(false);
             }}
             className={`py-2 px-2 text-xs rounded transition-colors border ${
                config.cropRatio === null && config.cropRect === null
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                  : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
          >
             {t.ratios.original}
          </button>

          {AspectRatios.map((ratio) => (
            <button
              key={ratio.label}
              onClick={() => {
                const r = ratio.value === -1 ? null : ratio.value;
                onToggleCrop(true, r);
              }}
              className={`py-2 px-2 text-xs rounded transition-colors border ${
                // Highlight if active ratio matches, OR if custom (-1) and ratio is null but rect exists
                (config.cropRatio === ratio.value) || (ratio.value === -1 && config.cropRatio === null && config.cropRect !== null)
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                  : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resizing */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t.resize}</label>
          <span className="text-xs text-gray-500">
             {/* Display actual output dimensions based on crop/resize */}
             {config.targetWidth || (config.cropRect ? Math.round(config.cropRect.width) : getTransformedDimensions(originalDimensions.width, originalDimensions.height, config.rotation).width)} 
             x 
             {config.targetHeight || (config.cropRect ? Math.round(config.cropRect.height) : getTransformedDimensions(originalDimensions.width, originalDimensions.height, config.rotation).height)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">{t.width}</label>
            <input
              type="number"
              value={config.targetWidth || ''}
              placeholder="Auto"
              onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateConfig('targetWidth', val);
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">{t.height}</label>
            <input
              type="number"
              value={config.targetHeight || ''}
              placeholder="Auto"
              onChange={(e) => updateConfig('targetHeight', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Compression & Format */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t.export}</label>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t.format}</label>
          <div className="flex bg-gray-900 rounded p-1 border border-gray-700">
            {['image/jpeg', 'image/png', 'image/webp'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => updateConfig('format', fmt)}
                className={`flex-1 text-xs py-1.5 rounded ${
                  config.format === fmt ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {fmt.split('/')[1].toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{t.quality}</span>
            <span>{Math.round(config.quality * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={config.quality}
            onChange={(e) => updateConfig('quality', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;