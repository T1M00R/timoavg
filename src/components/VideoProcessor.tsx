'use client';

import { useEffect, useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface VideoProcessorProps {
  audioFile: File;
  imageFile: File;
  isProcessing: boolean;
}

export default function VideoProcessor({ audioFile, imageFile, isProcessing }: VideoProcessorProps) {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const load = async () => {
      const ffmpeg = new FFmpeg();
      
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      await ffmpeg.load({
        coreURL: await toBlobURL('/_next/static/ffmpeg/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('/_next/static/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
      });

      setFfmpeg(ffmpeg);
    };

    load();
  }, []);

  useEffect(() => {
    const processVideo = async () => {
      if (!ffmpeg || !isProcessing) return;

      try {
        // Write input files
        await ffmpeg.writeFile('audio.mp3', await fetchFile(audioFile));
        await ffmpeg.writeFile('image.jpg', await fetchFile(imageFile));

        // Optimize video generation with better compression and faster processing
        await ffmpeg.exec([
          '-i', 'image.jpg',
          '-i', 'audio.mp3',
          '-filter_complex', 
          '[0:v]scale=1280:720,loop=loop=-1:size=1[v];[1:a]showwaves=s=1280x720:mode=line:rate=25:colors=white|blue@0.5,colorkey=black:0.01:0.1[waves];[v][waves]overlay=format=auto,format=yuv420p[out]',
          '-map', '[out]',
          '-map', '1:a',
          '-c:v', 'libx264',
          '-preset', 'veryfast',  // Faster encoding
          '-crf', '23',          // Good quality but smaller file
          '-c:a', 'aac',
          '-b:a', '128k',        // Reduced audio bitrate
          '-shortest',
          'output.mp4'
        ]);

        // Read the output file
        const data = await ffmpeg.readFile('output.mp4');
        const blob = new Blob([data], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);

        // Clean up memory
        await ffmpeg.deleteFile('audio.mp3');
        await ffmpeg.deleteFile('image.jpg');
        await ffmpeg.deleteFile('output.mp4');

      } catch (error) {
        console.error('Error processing video:', error);
      }
    };

    processVideo();
  }, [ffmpeg, audioFile, imageFile, isProcessing]);

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  if (!isProcessing && !videoUrl) return null;

  return (
    <div className="mt-2">
      {isProcessing && (
        <div className="mb-2">
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-center mt-1 text-gray-400">Processing: {progress}%</p>
        </div>
      )}

      {videoUrl && (
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 mt-2">
          <p className="text-sm text-gray-400 mb-2">Generated Video:</p>
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="w-full h-[180px] object-contain rounded-lg bg-black"
            src={videoUrl}
          >
            Your browser does not support the video tag.
          </video>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => videoRef.current?.play()}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-500 transition-colors"
            >
              Play
            </button>
            <a
              href={videoUrl}
              download="visualizer.mp4"
              className="flex-1 text-center bg-green-600 text-white rounded-lg py-2 text-sm hover:bg-green-500 transition-colors"
            >
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
} 