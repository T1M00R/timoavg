'use client';

import { useEffect, useState, useRef } from 'react';

interface VideoProcessorProps {
  audioFile: File;
  imageFile: File;
  isProcessing: boolean;
  onReady?: () => void;
}

export default function VideoProcessor({ audioFile, imageFile, isProcessing, onReady }: VideoProcessorProps) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const animationRef = useRef<number | null>(null);

  // Cleanup function
  const cleanup = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  useEffect(() => {
    const setupVisualizer = async () => {
      if (!isProcessing || !canvasRef.current || !audioRef.current) return;

      try {
        setProgress(0);
        setError(null);
        
        // Set up canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
        if (!ctx) throw new Error('Could not get canvas context');

        canvas.width = 1280;
        canvas.height = 720;
        setProgress(20);

        // Load image
        const img = new Image();
        const imageUrl = URL.createObjectURL(imageFile);
        img.src = imageUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
        });
        imageRef.current = img;
        setProgress(40);

        // Set up audio
        const audioUrl = URL.createObjectURL(audioFile);
        audioRef.current.src = audioUrl;
        setProgress(60);

        // Auto-play when ready
        audioRef.current.oncanplaythrough = () => {
          audioRef.current?.play();
        };

        // Initialize audio context on play
        audioRef.current.onplay = () => {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            
            const source = audioContextRef.current.createMediaElementSource(audioRef.current!);
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
            
            draw();
          }
        };

        setProgress(100);

        if (onReady) {
          onReady();
        }

        function draw() {
          if (!ctx || !analyserRef.current || !imageRef.current) return;
          
          animationRef.current = requestAnimationFrame(draw);

          // Clear and draw background
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

          // Get audio data
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);

          const barWidth = (canvas.width / bufferLength) * 2.5;
          let x = 0;

          // Draw bars
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] * 2;
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#ff0000');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
          }
        }

      } catch (error) {
        console.error('Error setting up visualizer:', error);
        setError('Failed to set up visualizer. Please try again.');
        cleanup();
      }
    };

    setupVisualizer();

    return cleanup;
  }, [isProcessing, audioFile, imageFile]);

  return (
    <div className="h-full flex flex-col">
      {isProcessing && progress < 100 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="w-full bg-gray-800 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-center mt-1 text-gray-400">Processing: {progress}%</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center">
        <canvas 
          ref={canvasRef}
          className="w-full rounded-lg bg-black object-contain mb-4"
        />
        <audio
          ref={audioRef}
          controls
          className="w-full max-w-md"
        >
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
} 