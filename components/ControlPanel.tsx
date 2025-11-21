import React from 'react';
import { ImageConfig } from '../types';

interface ControlPanelProps {
  config: ImageConfig;
  onChange: (newConfig: ImageConfig) => void;
  originalDimensions: { width: number; height: number };
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChange,
  originalDimensions,
  onReset
}) => {
  
  const updateConfig = (key: keyof ImageConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const AspectRatios = [
    { label: 'Free / Original', value: null },
    { label: 'Square (1:1)', value: 1 },
    { label: 'Landscape (16:9)', value: 16 / 9 },
    { label: 'Portrait (9:16)', value: 9 / 16 },
    { label: 'Standard (4:3)', value: 4 / 3 },
  ];

  return (
    <div className="flex flex-col gap-6 p-5 bg-surface rounded-xl shadow-lg border border-gray-700 h-full overflow-y-auto">
      <div className="flex justify-between items-center border-b border-gray-700 pb-4">
        <h2 className="text-xl font-bold text-white">Tools</h2>
        <button 
          onClick={onReset}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Rotation & Flip */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Transform</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateConfig('rotation', (config.rotation - 90 + 360) % 360)}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            Rotate L
          </button>
          <button
            onClick={() => updateConfig('rotation', (config.rotation + 90) % 360)}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
          >
            Rotate R
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
          </button>
          <button
            onClick={() => updateConfig('flipHorizontal', !config.flipHorizontal)}
            className={`py-2 px-3 rounded transition-colors text-sm ${config.flipHorizontal ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            Flip H
          </button>
          <button
            onClick={() => updateConfig('flipVertical', !config.flipVertical)}
            className={`py-2 px-3 rounded transition-colors text-sm ${config.flipVertical ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            Flip V
          </button>
        </div>
      </div>

      {/* Cropping */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Crop</label>
        <div className="grid grid-cols-2 gap-2">
          {AspectRatios.map((ratio) => (
            <button
              key={ratio.label}
              onClick={() => {
                updateConfig('cropRatio', ratio.value);
                // Reset explicit resize if cropping changes to avoid confusion
                updateConfig('targetWidth', 0);
                updateConfig('targetHeight', 0);
              }}
              className={`py-2 px-2 text-xs rounded transition-colors border ${
                config.cropRatio === ratio.value
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
          <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Resize</label>
          <span className="text-xs text-gray-500">Orig: {originalDimensions.width} x {originalDimensions.height}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Width (px)</label>
            <input
              type="number"
              value={config.targetWidth || ''}
              placeholder={config.cropRatio ? "Auto" : originalDimensions.width.toString()}
              onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateConfig('targetWidth', val);
                  // Simple aspect ratio lock logic could go here
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Height (px)</label>
            <input
              type="number"
              value={config.targetHeight || ''}
              placeholder={config.cropRatio ? "Auto" : originalDimensions.height.toString()}
              onChange={(e) => updateConfig('targetHeight', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Compression & Format */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Export Settings</label>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">Format</label>
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
            <span>Quality</span>
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
