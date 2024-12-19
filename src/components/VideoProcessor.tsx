'use client';

import { useEffect, useState, useRef } from 'react';
import { VisualizerSettings } from '@/app/page';

interface VideoProcessorProps {
  audioFile: File;
  imageFile: File;
  isProcessing: boolean;
  settings: VisualizerSettings;
  onReady?: () => void;
}

export default function VideoProcessor({ 
  audioFile, 
  imageFile, 
  isProcessing, 
  settings,
  onReady 
}: VideoProcessorProps) {
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  useEffect(() => {
    let isMounted = true;

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
        if (!isMounted) return;
        setProgress(20);

        // Load image
        const img = new Image();
        const imageUrl = URL.createObjectURL(imageFile);
        img.src = imageUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
        });
        if (!isMounted) return;
        imageRef.current = img;
        setProgress(40);

        // Set up audio
        const audioUrl = URL.createObjectURL(audioFile);
        if (!isMounted || !audioRef.current) return;
        audioRef.current.src = audioUrl;
        setProgress(60);

        // Auto-play when ready
        audioRef.current.oncanplaythrough = () => {
          if (!isMounted || !audioRef.current) return;
          audioRef.current.play().catch(console.error);
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

        function getColorForScheme(height: number, maxHeight: number) {
          const position = height / maxHeight;
          
          switch (settings.colorScheme) {
            case 'greenRed':
              return `rgb(${255 * position}, ${255 * (1 - position)}, 0)`;
            case 'bluePurple':
              return `rgb(${255 * position}, ${100 + (155 * (1 - position))}, 255)`;
            case 'rainbow':
              const hue = (240 * (1 - position));
              return `hsl(${hue}, 100%, 50%)`;
            case 'purpleGold':
              return `rgb(${147 + (108 * position)}, ${51 + (191 * position)}, ${234 - (198 * position)})`;
            case 'oceanBlue':
              return `rgb(${14 + (59 * position)}, ${165 + (-35 * position)}, ${233 + (13 * position)})`;
            case 'sunset':
              return `rgb(${249 - (13 * position)}, ${115 - (43 * position)}, ${22 + (131 * position)})`;
            case 'neon':
              return `rgb(${34 + (-14 * position)}, ${197 + (-13 * position)}, ${94 + (72 * position)})`;
            case 'white':
              return `rgba(255, 255, 255, ${0.3 + (0.7 * position)})`;
          }
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

          // Calculate bar dimensions to span full width
          const totalWidth = canvas.width;
          const totalBars = bufferLength;
          const totalSpacing = (totalBars - 1) * settings.barSpacing;
          const barWidth = (totalWidth - totalSpacing) / totalBars;
          const maxBarHeight = canvas.height * 0.3; // 30% of canvas height
          let x = 0;

          // Draw bars
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] * settings.barHeight) * (maxBarHeight / 255);
            const y = settings.position === 'bottom' ? canvas.height - barHeight : 0;
            
            const color = getColorForScheme(barHeight, maxBarHeight);
            
            if (settings.glow) {
              ctx.shadowBlur = 15;
              ctx.shadowColor = color;
            } else {
              ctx.shadowBlur = 0;
            }
            
            ctx.fillStyle = color;

            switch (settings.shape) {
              case 'rectangle':
                ctx.fillRect(x, y, barWidth, barHeight);
                break;

              case 'rounded':
                ctx.beginPath();
                if (settings.position === 'bottom') {
                  ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
                } else {
                  ctx.roundRect(x, y, barWidth, barHeight, [0, 0, 4, 4]);
                }
                ctx.fill();
                break;

              case 'pill':
                ctx.beginPath();
                const radius = barWidth / 2;
                if (settings.position === 'bottom') {
                  ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
                } else {
                  ctx.roundRect(x, y, barWidth, barHeight, [0, 0, radius, radius]);
                }
                ctx.fill();
                break;

              case 'triangle':
                ctx.beginPath();
                if (settings.position === 'bottom') {
                  ctx.moveTo(x, canvas.height);
                  ctx.lineTo(x + barWidth / 2, canvas.height - barHeight);
                  ctx.lineTo(x + barWidth, canvas.height);
                } else {
                  ctx.moveTo(x, 0);
                  ctx.lineTo(x + barWidth / 2, barHeight);
                  ctx.lineTo(x + barWidth, 0);
                }
                ctx.closePath();
                ctx.fill();
                break;
            }

            x += barWidth + settings.barSpacing;
          }
        }

      } catch (error) {
        if (!isMounted) return;
        console.error('Error setting up visualizer:', error);
        setError('Failed to set up visualizer. Please try again.');
        cleanup();
      }
    };

    cleanup(); // Clean up before setting up new visualizer
    setupVisualizer();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [isProcessing, audioFile, imageFile, settings]);

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