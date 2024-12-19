# Audio Visualizer Video Creator

A web application that creates videos with audio visualization from audio files and images. Built with Next.js, FFmpeg.wasm, and Web Audio API.

## Features

- Upload audio files (MP3, WAV) and images
- Real-time audio visualization preview
- Generate videos with audio visualization overlay
- Download generated videos
- Modern, responsive UI with Tailwind CSS

## Prerequisites

- Node.js 18+ installed
- Modern web browser with WebAssembly support

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Drag and drop or click to upload an audio file (MP3 or WAV) and an image
2. Preview the audio visualization
3. Click "Create Video" to generate the video
4. Once processing is complete, preview the video and download it

## Technical Stack

- Next.js 14+
- React
- TypeScript
- Tailwind CSS
- FFmpeg.wasm
- Web Audio API
- Canvas API

## Notes

- The application processes files entirely in the browser
- Video processing may take some time depending on the file sizes and your device's capabilities
- Supported audio formats: MP3, WAV
- Supported image formats: JPG, PNG
