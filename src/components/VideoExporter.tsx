'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { useEffect, useRef, useState } from 'react';

interface VideoExporterProps {
  audioFile: File;
  imageFile: File;
  onProgress: (progress: number) => void;
  onComplete: (url: string) => void;
  onError: (error: string) => void;
}

export default function VideoExporter({ 
  audioFile, 
  imageFile, 
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
    canvas.width = 1280;
    canvas.height = 720;
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
    const barWidth = (1280 / bufferLength) * 2.5;

    // Create source buffer and connect to analyzer
    const source = audioContextRef.current!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    
    // Start audio
    source.start();

    // Capture frames
    for (let frame = 0; frame < totalFrames.current; frame++) {
      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Clear and draw background
      ctx.clearRect(0, 0, 1280, 720);
      ctx.drawImage(img, 0, 0, 1280, 720);

      // Draw bars
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] * 2;
        
        const gradient = ctx.createLinearGradient(0, 720, 0, 720 - barHeight);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(1, '#ff0000');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, 720 - barHeight, barWidth, barHeight);

        x += barWidth + 1;
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
      await ffmpeg.exec([
        '-framerate', '30',
        '-i', 'frame%06d.jpg',
        '-i', 'input.mp3',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        'output.mp4'
      ]);
      onProgress(90);

      // Read the output file
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });
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