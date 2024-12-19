'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import VideoProcessor from '@/components/VideoProcessor';
import VideoExporter from '@/components/VideoExporter';

export interface VisualizerSettings {
  barSpacing: number;
  barHeight: number;
  colorScheme: 'greenRed' | 'bluePurple' | 'rainbow' | 'white' | 'purpleGold' | 'oceanBlue' | 'sunset' | 'neon';
  position: 'bottom' | 'top';
  shape: 'rectangle' | 'rounded' | 'pill' | 'triangle';
  glow: boolean;
}

const COLOR_SCHEMES = {
  greenRed: { start: '#00ff00', end: '#ff0000' },
  bluePurple: { start: '#00ffff', end: '#ff00ff' },
  rainbow: { start: '#ff0000', end: '#0000ff' },
  white: { start: '#ffffff', end: '#ffffff' },
  purpleGold: { start: '#9333ea', end: '#fbbf24' },
  oceanBlue: { start: '#0ea5e9', end: '#3b82f6' },
  sunset: { start: '#f97316', end: '#ec4899' },
  neon: { start: '#22c55e', end: '#14b8a6' }
};

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [visualizerSettings, setVisualizerSettings] = useState<VisualizerSettings>({
    barSpacing: 1,
    barHeight: 0.7,
    colorScheme: 'greenRed',
    position: 'bottom',
    shape: 'rounded',
    glow: false
  });

  const onDropAudio = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
    }
  }, []);

  const onDropImage = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
    }
  }, []);

  const audioDropzone = useDropzone({
    onDrop: onDropAudio,
    accept: {
      'audio/*': ['.mp3', '.wav']
    },
    maxFiles: 1
  });

  const imageDropzone = useDropzone({
    onDrop: onDropImage,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxFiles: 1
  });

  const handlePreview = async () => {
    if (!audioFile || !imageFile) return;
    setIsPreviewing(!isPreviewing);
  };

  useEffect(() => {
    if (isPreviewing) {
      setIsPreviewing(false);
      setTimeout(() => setIsPreviewing(true), 50);
    }
  }, [visualizerSettings]);

  const handleExport = async () => {
    if (!audioFile || !imageFile) return;
    setIsProcessing(true);
    setExportError(null);
    setExportProgress(0);
  };

  return (
    <main className="h-screen p-6 flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
          Timo Automatic Video Generator
        </h1>
        <p className="text-sm text-gray-400 mt-2">Create stunning visualizer videos from your audio and images</p>
      </div>
      
      <div className="flex-1 grid grid-cols-[1fr,1.5fr,300px] gap-6 min-h-0">
        {/* Left Column - Uploads */}
        <div className="flex flex-col gap-4 min-h-0 overflow-auto">
          <div className="space-y-3">
            <div 
              {...audioDropzone.getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                audioDropzone.isDragActive ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 hover:border-blue-400 hover:bg-gray-800/50'
              }`}
            >
              <input {...audioDropzone.getInputProps()} />
              <p className="text-sm">Drop audio file (.mp3, .wav) or click to select</p>
            </div>

            {audioFile && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-400 truncate">Audio: {audioFile.name}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div 
              {...imageDropzone.getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                imageDropzone.isDragActive ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 hover:border-blue-400 hover:bg-gray-800/50'
              }`}
            >
              <input {...imageDropzone.getInputProps()} />
              <p className="text-sm">Drop image file (.jpg, .png) or click to select</p>
            </div>

            {imageFile && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-3 truncate">Image: {imageFile.name}</p>
                <img 
                  src={URL.createObjectURL(imageFile)} 
                  alt="Preview" 
                  className="w-full h-[180px] object-contain rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-auto">
            <button
              onClick={handlePreview}
              disabled={!audioFile || !imageFile || isProcessing}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
            >
              {isPreviewing ? 'Stop Preview' : 'Preview'}
            </button>
            <button
              onClick={handleExport}
              disabled={!audioFile || !imageFile || isProcessing}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-green-500 transition-colors"
            >
              Export Video
            </button>
          </div>
        </div>

        {/* Middle Column - Preview */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
            {(!audioFile || !imageFile) && (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>Upload audio and image files to create a video</p>
              </div>
            )}
            
            {audioFile && imageFile && !isPreviewing && !isProcessing && (
              <div className="h-full flex items-center justify-center">
                <img 
                  src={URL.createObjectURL(imageFile)} 
                  alt="Preview" 
                  className="max-h-full w-auto rounded-lg shadow-xl"
                />
              </div>
            )}

            {isPreviewing && (
              <VideoProcessor
                audioFile={audioFile!}
                imageFile={imageFile!}
                isProcessing={isPreviewing}
                settings={visualizerSettings}
                onReady={() => setIsPreviewReady(true)}
              />
            )}
          </div>

          {isProcessing && (
            <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-xl border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-3">Processing Video</h3>
              <div className="w-full bg-gray-700/50 rounded-full h-2 mb-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{exportProgress}% Complete</p>
              {exportError && (
                <p className="mt-2 text-red-400 text-sm">{exportError}</p>
              )}
            </div>
          )}

          {exportedVideoUrl && !isProcessing && (
            <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-xl border border-gray-700/50">
              <a
                href={exportedVideoUrl}
                download="visualization.mp4"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
              >
                <span>Download Video</span>
              </a>
            </div>
          )}
        </div>

        {/* Right Column - Settings */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
          <h2 className="font-semibold mb-6 text-lg">Visualizer Settings</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Bar Spacing</label>
              <input
                type="range"
                min="0"
                max="10"
                value={visualizerSettings.barSpacing}
                onChange={(e) => setVisualizerSettings(prev => ({
                  ...prev,
                  barSpacing: Number(e.target.value)
                }))}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Bar Height</label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={visualizerSettings.barHeight}
                onChange={(e) => setVisualizerSettings(prev => ({
                  ...prev,
                  barHeight: Number(e.target.value)
                }))}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Bar Shape</label>
              <select
                value={visualizerSettings.shape}
                onChange={(e) => setVisualizerSettings(prev => ({
                  ...prev,
                  shape: e.target.value as VisualizerSettings['shape']
                }))}
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm"
              >
                <option value="rounded">Rounded</option>
                <option value="rectangle">Rectangle</option>
                <option value="pill">Pill</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Color Scheme</label>
              <select
                value={visualizerSettings.colorScheme}
                onChange={(e) => setVisualizerSettings(prev => ({
                  ...prev,
                  colorScheme: e.target.value as VisualizerSettings['colorScheme']
                }))}
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm"
              >
                <option value="greenRed">Green to Red</option>
                <option value="bluePurple">Blue to Purple</option>
                <option value="rainbow">Rainbow</option>
                <option value="purpleGold">Purple to Gold</option>
                <option value="oceanBlue">Ocean Blue</option>
                <option value="sunset">Sunset</option>
                <option value="neon">Neon</option>
                <option value="white">White</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Position</label>
              <select
                value={visualizerSettings.position}
                onChange={(e) => setVisualizerSettings(prev => ({
                  ...prev,
                  position: e.target.value as VisualizerSettings['position']
                }))}
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm"
              >
                <option value="bottom">Bottom</option>
                <option value="top">Top</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">Glow Effect</label>
              <button
                onClick={() => setVisualizerSettings(prev => ({ ...prev, glow: !prev.glow }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  visualizerSettings.glow ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    visualizerSettings.glow ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
