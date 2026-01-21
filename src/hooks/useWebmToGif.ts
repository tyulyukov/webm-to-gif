import { useState, useCallback, useRef } from 'react';
import GIF from 'gif.js';

export interface ConversionOptions {
  fps: number;
  quality: number;
  width?: number;
  height?: number;
  transparentThreshold: number;
}

export interface ConversionProgress {
  stage: 'idle' | 'extracting' | 'encoding' | 'complete' | 'error';
  progress: number;
  framesExtracted: number;
  totalFrames: number;
  message: string;
}

interface UseWebmToGifResult {
  convert: (file: File, options: ConversionOptions) => Promise<Blob>;
  cancel: () => void;
  progress: ConversionProgress;
  isConverting: boolean;
}

const TRANSPARENT_COLOR = 0x00FF00;

export function useWebmToGif(): UseWebmToGifResult {
  const [progress, setProgress] = useState<ConversionProgress>({
    stage: 'idle',
    progress: 0,
    framesExtracted: 0,
    totalFrames: 0,
    message: '',
  });
  const [isConverting, setIsConverting] = useState(false);
  const cancelledRef = useRef(false);
  const gifRef = useRef<GIF | null>(null);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (gifRef.current) {
      gifRef.current.abort();
    }
  }, []);

  const extractFrames = useCallback(
    async (
      video: HTMLVideoElement,
      options: ConversionOptions
    ): Promise<{ frames: ImageData[]; width: number; height: number }> => {
      const { fps, width, height, transparentThreshold } = options;
      const duration = video.duration;
      const frameInterval = 1 / fps;
      const totalFrames = Math.floor(duration * fps);

      const targetWidth = width || video.videoWidth;
      const targetHeight = height || video.videoHeight;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      const frames: ImageData[] = [];

      for (let i = 0; i < totalFrames; i++) {
        if (cancelledRef.current) {
          throw new Error('Conversion cancelled');
        }

        const time = i * frameInterval;
        video.currentTime = time;

        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        const data = imageData.data;
        for (let j = 0; j < data.length; j += 4) {
          const alpha = data[j + 3];
          if (alpha < transparentThreshold) {
            data[j] = (TRANSPARENT_COLOR >> 16) & 0xFF;
            data[j + 1] = (TRANSPARENT_COLOR >> 8) & 0xFF;
            data[j + 2] = TRANSPARENT_COLOR & 0xFF;
            data[j + 3] = 255;
          }
        }

        frames.push(imageData);

        setProgress({
          stage: 'extracting',
          progress: ((i + 1) / totalFrames) * 50,
          framesExtracted: i + 1,
          totalFrames,
          message: `Extracting frame ${i + 1} of ${totalFrames}`,
        });
      }

      return { frames, width: targetWidth, height: targetHeight };
    },
    []
  );

  const convert = useCallback(
    async (file: File, options: ConversionOptions): Promise<Blob> => {
      cancelledRef.current = false;
      setIsConverting(true);
      setProgress({
        stage: 'extracting',
        progress: 0,
        framesExtracted: 0,
        totalFrames: 0,
        message: 'Loading video...',
      });

      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;

        const videoUrl = URL.createObjectURL(file);

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error('Failed to load video'));
          video.src = videoUrl;
        });

        await new Promise<void>((resolve, reject) => {
          video.oncanplaythrough = () => resolve();
          video.onerror = () => reject(new Error('Failed to load video'));
        });

        const { frames, width, height } = await extractFrames(video, options);

        URL.revokeObjectURL(videoUrl);

        if (cancelledRef.current) {
          throw new Error('Conversion cancelled');
        }

        setProgress({
          stage: 'encoding',
          progress: 50,
          framesExtracted: frames.length,
          totalFrames: frames.length,
          message: 'Encoding GIF...',
        });

        const gif = new GIF({
          workers: navigator.hardwareConcurrency || 4,
          quality: Math.max(1, Math.min(30, 31 - options.quality)),
          width,
          height,
          workerScript: '/gif.worker.js',
          transparent: TRANSPARENT_COLOR as unknown as string,
        });

        gifRef.current = gif;

        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = width;
        frameCanvas.height = height;
        const frameCtx = frameCanvas.getContext('2d');

        if (!frameCtx) {
          throw new Error('Failed to get frame canvas context');
        }

        const delay = Math.round(1000 / options.fps);

        for (const frame of frames) {
          frameCtx.putImageData(frame, 0, 0);
          gif.addFrame(frameCtx, { copy: true, delay, dispose: 2 });
        }

        return new Promise<Blob>((resolve, reject) => {
          gif.on('progress', (p: number) => {
            setProgress({
              stage: 'encoding',
              progress: 50 + p * 50,
              framesExtracted: frames.length,
              totalFrames: frames.length,
              message: `Encoding GIF... ${Math.round(p * 100)}%`,
            });
          });

          gif.on('finished', (blob: Blob) => {
            setProgress({
              stage: 'complete',
              progress: 100,
              framesExtracted: frames.length,
              totalFrames: frames.length,
              message: 'Conversion complete!',
            });
            setIsConverting(false);
            gifRef.current = null;
            resolve(blob);
          });

          gif.on('abort', () => {
            reject(new Error('Conversion cancelled'));
          });

          gif.render();
        });
      } catch (error) {
        setProgress({
          stage: 'error',
          progress: 0,
          framesExtracted: 0,
          totalFrames: 0,
          message: error instanceof Error ? error.message : 'Conversion failed',
        });
        setIsConverting(false);
        throw error;
      }
    },
    [extractFrames]
  );

  return { convert, cancel, progress, isConverting };
}
