import React from 'react';
import { AIAnalysisResult, ProcessingStatus } from '../types';

interface AIInsightsProps {
  onAnalyze: () => void;
  status: ProcessingStatus;
  result: AIAnalysisResult | null;
}

const AIInsights: React.FC<AIInsightsProps> = ({ onAnalyze, status, result }) => {
  return (
    <div className="bg-surface rounded-xl shadow-lg border border-gray-700 p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI Insights
            </h2>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">Gemini 2.5 Flash</span>
      </div>

      {status === ProcessingStatus.IDLE && !result && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-70">
          <p className="text-sm text-gray-400 mb-4">
            Generate SEO-optimized titles, tags, and descriptions for your processed image.
          </p>
          <button
            onClick={onAnalyze}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-full font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            Analyze Image
          </button>
        </div>
      )}

      {status === ProcessingStatus.ANALYZING && (
        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-sm text-blue-300 animate-pulse">Gemini is thinking...</p>
        </div>
      )}

      {result && (
        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1">
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
            <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Suggested Title</label>
            <p className="text-gray-200 font-medium text-sm mt-1">{result.title}</p>
          </div>

          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
             <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Filename</label>
             <div className="flex items-center gap-2 mt-1">
                <code className="text-green-400 text-xs bg-green-900/20 px-2 py-1 rounded flex-1 truncate">
                    {result.suggestedFilename}
                </code>
             </div>
          </div>

          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
            <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Alt Text</label>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">{result.description}</p>
          </div>

          <div>
            <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-2">
                {result.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-800 text-blue-300 px-2 py-1 rounded-full border border-gray-700">
                        #{tag}
                    </span>
                ))}
            </div>
          </div>
          
          <button 
            onClick={onAnalyze}
            className="w-full mt-4 text-xs text-gray-500 hover:text-gray-300 underline"
          >
            Regenerate Analysis
          </button>
        </div>
      )}
    </div>
  );
};

export default AIInsights;
