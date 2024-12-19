'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import VideoProcessor from '@/components/VideoProcessor';
import VideoExporter from '@/components/VideoExporter';

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

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
    setIsPreviewing(true);
  };

  const handleExport = async () => {
    if (!audioFile || !imageFile) return;
    setIsProcessing(true);
    setExportError(null);
    setExportProgress(0);
  };

  return (
    <main className="h-screen p-4 flex flex-col bg-gray-900 text-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-center">Audio Visualizer Video Creator</h1>
      
      <div className="flex-1 grid grid-cols-[1fr,1.5fr] gap-4">
        {/* Left Column - Uploads */}
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <div 
              {...audioDropzone.getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                audioDropzone.isDragActive ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 hover:border-blue-400'
              }`}
            >
              <input {...audioDropzone.getInputProps()} />
              <p className="text-sm">Drop audio file (.mp3, .wav) or click to select</p>
            </div>

            {audioFile && (
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <p className="text-sm text-gray-400">Audio: {audioFile.name}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div 
              {...imageDropzone.getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                imageDropzone.isDragActive ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 hover:border-blue-400'
              }`}
            >
              <input {...imageDropzone.getInputProps()} />
              <p className="text-sm">Drop image file (.jpg, .png) or click to select</p>
            </div>

            {imageFile && (
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Image: {imageFile.name}</p>
                <img 
                  src={URL.createObjectURL(imageFile)} 
                  alt="Preview" 
                  className="w-full h-[180px] object-contain rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-auto">
            <button
              onClick={handlePreview}
              disabled={!audioFile || !imageFile || isProcessing}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
            >
              Preview
            </button>
            <button
              onClick={handleExport}
              disabled={!audioFile || !imageFile || isProcessing}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-green-500 transition-colors"
            >
              Export Video
            </button>
          </div>
        </div>

        {/* Right Column - Video Preview */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
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
                className="max-h-full w-auto rounded-lg"
              />
            </div>
          )}

          {isPreviewing && (
            <VideoProcessor
              audioFile={audioFile!}
              imageFile={imageFile!}
              isProcessing={isPreviewing}
              onReady={() => setIsPreviewReady(true)}
            />
          )}

          {isProcessing && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4">Processing Video</h3>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
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
            </div>
          )}

          {isProcessing && (
            <VideoExporter
              audioFile={audioFile!}
              imageFile={imageFile!}
              onProgress={setExportProgress}
              onComplete={(url) => {
                setExportedVideoUrl(url);
                setIsProcessing(false);
              }}
              onError={(error) => {
                setExportError(error);
                setIsProcessing(false);
              }}
            />
          )}

          {exportedVideoUrl && !isProcessing && (
            <div className="mt-4">
              <a
                href={exportedVideoUrl}
                download="visualization.mp4"
                className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
              >
                Download Video
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
