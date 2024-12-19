'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { useEffect, useRef, useState } from 'react';
import { VisualizerSettings, ExportSettings } from '@/app/page';

interface VideoExporterProps {
  audioFile: File;
  imageFile: File;
  settings: VisualizerSettings;
  exportSettings: ExportSettings;
  onProgress: (progress: number) => void;
  onComplete: (url: string) => void;
  onError: (error: string) => void;
}

export default function VideoExporter({ 
  audioFile, 
  imageFile, 
  settings,
  exportSettings,
  onProgress, 
  onComplete,
  onError 
}: VideoExporterProps) {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameCount = useRef(0);
  const totalFrames = useRef(0);

  const setupCanvas = async () => {
    const canvas = document.createElement('canvas');
    const width = exportSettings.resolution === '1080p' ? 1920 : 1280;
    const height = exportSettings.resolution === '1080p' ? 1080 : 720;
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;
    
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    const imageUrl = URL.createObjectURL(imageFile);
    
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = imageUrl;
    });

    return { ctx, img };
  };

  const captureFrames = async (audioBuffer: AudioBuffer, ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    if (!ffmpegRef.current) return;
    const ffmpeg = ffmpegRef.current;

    const fps = 30;
    const duration = audioBuffer.duration;
    totalFrames.current = Math.ceil(duration * fps);
    const analyser = audioContextRef.current!.createAnalyser();
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const maxBarHeight = 720 * 0.3; // 30% of height

    // Calculate bar dimensions to span full width
    const totalWidth = 1280;
    const totalBars = bufferLength;
    const totalSpacing = (totalBars - 1) * settings.barSpacing;
    const barWidth = (totalWidth - totalSpacing) / totalBars;

    // Create source buffer and connect to analyzer
    const source = audioContextRef.current!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    
    // Start audio
    source.start();

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

    // Capture frames
    for (let frame = 0; frame < totalFrames.current; frame++) {
      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Clear and draw background
      ctx.clearRect(0, 0, 1280, 720);
      ctx.drawImage(img, 0, 0, 1280, 720);

      // Draw bars
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] * settings.barHeight) * (maxBarHeight / 255);
        const y = settings.position === 'bottom' ? 720 - barHeight : 0;
        
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
            ctx.fillRect(i * barWidth, y, barWidth, barHeight);
            break;

          case 'rounded':
            ctx.beginPath();
            if (settings.position === 'bottom') {
              ctx.roundRect(i * barWidth, y, barWidth, barHeight, [4, 4, 0, 0]);
            } else {
              ctx.roundRect(i * barWidth, y, barWidth, barHeight, [0, 0, 4, 4]);
            }
            ctx.fill();
            break;

          case 'pill':
            ctx.beginPath();
            const radius = barWidth / 2;
            if (settings.position === 'bottom') {
              ctx.roundRect(i * barWidth, y, barWidth, barHeight, [radius, radius, 0, 0]);
            } else {
              ctx.roundRect(i * barWidth, y, barWidth, barHeight, [0, 0, radius, radius]);
            }
            ctx.fill();
            break;

          case 'triangle':
            ctx.beginPath();
            if (settings.position === 'bottom') {
              ctx.moveTo(i * barWidth, 720);
              ctx.lineTo(i * barWidth + barWidth / 2, 720 - barHeight);
              ctx.lineTo(i * barWidth + barWidth, 720);
            } else {
              ctx.moveTo(i * barWidth, 0);
              ctx.lineTo(i * barWidth + barWidth / 2, barHeight);
              ctx.lineTo(i * barWidth + barWidth, 0);
            }
            ctx.closePath();
            ctx.fill();
            break;
        }
      }

      // Save frame
      const frameData = canvasRef.current!.toDataURL('image/jpeg', 0.95);
      const base64Data = frameData.split(',')[1];
      await ffmpeg.writeFile(`frame${frame.toString().padStart(6, '0')}.jpg`, base64Data);
      
      frameCount.current = frame;
      onProgress(Math.round((frame / totalFrames.current) * 70) + 20);

      // Wait for next frame time
      await new Promise(resolve => setTimeout(resolve, 1000 / fps));
    }

    source.stop();
  };

  const load = async () => {
    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      await exportVideo();
    } catch (error) {
      onError('Failed to load FFmpeg');
      console.error(error);
    }
  };

  const exportVideo = async () => {
    if (!ffmpegRef.current) return;
    const ffmpeg = ffmpegRef.current;

    try {
      onProgress(0);
      
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Set up canvas and load image
      const { ctx, img } = await setupCanvas();
      onProgress(10);

      // Load and decode audio
      const audioData = await audioFile.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      onProgress(20);

      // Capture frames with visualization
      await captureFrames(audioBuffer, ctx, img);
      
      // Generate video from frames
      const outputExt = exportSettings.format === 'webm' ? 'webm' : 'mp4';
      const codec = exportSettings.format === 'webm' ? 'libvpx-vp9' : 'libx264';
      const bitrate = {
        high: '8M',
        medium: '4M',
        low: '2M'
      }[exportSettings.quality];

      await ffmpeg.exec([
        '-framerate', exportSettings.fps.toString(),
        '-i', 'frame%06d.jpg',
        '-i', 'input.mp3',
        '-c:v', codec,
        '-c:a', exportSettings.format === 'webm' ? 'libvorbis' : 'aac',
        '-b:v', bitrate,
        '-pix_fmt', 'yuv420p',
        '-shortest',
        `output.${outputExt}`
      ]);
      onProgress(90);

      // Read the output file
      const data = await ffmpeg.readFile(`output.${outputExt}`);
      const mimeType = exportSettings.format === 'webm' ? 'video/webm' : 'video/mp4';
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      onProgress(100);
      onComplete(url);

      // Cleanup
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    } catch (error) {
      onError('Failed to export video');
      console.error(error);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return null;
} 