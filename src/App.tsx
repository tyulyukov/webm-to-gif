import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Download, X, Play, Settings2, FileVideo, Loader2, ChevronDown, Github } from 'lucide-react';
import { useWebmToGif } from '@/hooks/useWebmToGif';
import type { ConversionOptions } from '@/hooks/useWebmToGif';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [options, setOptions] = useState<ConversionOptions>({
    fps: 15,
    quality: 10,
    transparentThreshold: 128,
  });
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { convert, cancel, progress, isConverting } = useWebmToGif();

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, [videoUrl, gifUrl]);

  const handleFile = useCallback((newFile: File) => {
    if (!newFile.type.includes('webm')) {
      alert('Please select a WebM file');
      return;
    }

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (gifUrl) URL.revokeObjectURL(gifUrl);

    setFile(newFile);
    setVideoUrl(URL.createObjectURL(newFile));
    setGifUrl(null);
    setGifBlob(null);
  }, [videoUrl, gifUrl]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile]
  );

  const handleVideoLoad = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setVideoSize({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    try {
      const blob = await convert(file, options);
      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      setGifBlob(blob);
    } catch {
      if (progress.stage !== 'error') {
        console.error('Conversion failed');
      }
    }
  }, [file, options, convert, progress.stage]);

  const handleDownload = useCallback(() => {
    if (!gifUrl || !gifBlob) return;
    const link = document.createElement('a');
    link.href = gifUrl;
    link.download = file?.name.replace('.webm', '.gif') || 'converted.gif';
    link.click();
  }, [gifUrl, gifBlob, file]);

  const handleReset = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    setFile(null);
    setVideoUrl(null);
    setGifUrl(null);
    setGifBlob(null);
    setVideoDuration(0);
    setVideoSize({ width: 0, height: 0 });
  }, [videoUrl, gifUrl]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const estimatedFrames = Math.floor(videoDuration * options.fps);

  return (
    <div className="dark min-h-screen w-full bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-3xl space-y-6">
          <header className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <img src="/logo.svg" alt="Logo" className="size-12 sm:size-14" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                WebM to GIF
              </h1>
            </div>
            <p className="text-sm text-zinc-400">
              Convert WebM videos to GIF with transparency support
            </p>
          </header>

          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative flex flex-col items-center justify-center gap-4 p-8 sm:p-16 cursor-pointer transition-all duration-200 border-2 border-dashed rounded-lg',
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-zinc-600 hover:border-primary/50 hover:bg-zinc-800/50'
              )}
            >
              <div className={cn(
                'p-4 rounded-full transition-colors duration-200',
                isDragging ? 'bg-primary/20' : 'bg-zinc-800'
              )}>
                <Upload className={cn(
                  'size-8 transition-colors duration-200',
                  isDragging ? 'text-primary' : 'text-zinc-400'
                )} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-medium text-white">
                  {isDragging ? 'Drop your file here' : 'Drop your WebM file here'}
                </p>
                <p className="text-sm text-zinc-400">
                  or click to browse
                </p>
              </div>
              <p className="text-xs text-zinc-500">
                Supports WebM with alpha channel for transparent GIFs
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/webm"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between gap-4 p-4 border-b border-zinc-700">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-zinc-800 rounded-md shrink-0">
                      <FileVideo className="size-4 text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{file.name}</p>
                      <p className="text-xs text-zinc-400">
                        {formatFileSize(file.size)} · {videoSize.width}×{videoSize.height} · {videoDuration.toFixed(1)}s
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    disabled={isConverting}
                    className="shrink-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                        Source Video
                      </Label>
                      <div className="relative aspect-square sm:aspect-video rounded-md overflow-hidden checkered-bg">
                        <video
                          ref={videoRef}
                          src={videoUrl || undefined}
                          onLoadedMetadata={handleVideoLoad}
                          controls
                          loop
                          muted
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                        Result GIF
                      </Label>
                      <div className="relative aspect-square sm:aspect-video rounded-md overflow-hidden checkered-bg">
                        {gifUrl ? (
                          <img
                            src={gifUrl}
                            alt="Converted GIF"
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {isConverting ? (
                              <div className="text-center space-y-3 p-4">
                                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                                <p className="text-xs text-zinc-400">
                                  {progress.message}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-500">
                                Preview will appear here
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-white">
                    <Settings2 className="size-4" />
                    Settings
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">
                      {estimatedFrames} frames
                    </span>
                    <ChevronDown className={cn(
                      'size-4 text-zinc-400 transition-transform duration-200',
                      showSettings && 'rotate-180'
                    )} />
                  </span>
                </button>
                {showSettings && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-700">
                    <div className="space-y-2">
                      <Label htmlFor="fps" className="text-xs text-zinc-300">Frame Rate (FPS)</Label>
                      <Input
                        id="fps"
                        type="number"
                        min={1}
                        max={30}
                        value={options.fps}
                        onChange={(e) =>
                          setOptions((o) => ({ ...o, fps: Number(e.target.value) || 15 }))
                        }
                        disabled={isConverting}
                        className="bg-zinc-800 border-zinc-600 text-white"
                      />
                      <p className="text-xs text-zinc-500">
                        Higher = smoother, larger file
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quality" className="text-xs text-zinc-300">Quality (1-30)</Label>
                      <Input
                        id="quality"
                        type="number"
                        min={1}
                        max={30}
                        value={options.quality}
                        onChange={(e) =>
                          setOptions((o) => ({
                            ...o,
                            quality: Number(e.target.value) || 10,
                          }))
                        }
                        disabled={isConverting}
                        className="bg-zinc-800 border-zinc-600 text-white"
                      />
                      <p className="text-xs text-zinc-500">
                        Higher = better quality
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="threshold" className="text-xs text-zinc-300">Transparency Threshold</Label>
                      <Input
                        id="threshold"
                        type="number"
                        min={1}
                        max={255}
                        value={options.transparentThreshold}
                        onChange={(e) =>
                          setOptions((o) => ({
                            ...o,
                            transparentThreshold: Number(e.target.value) || 128,
                          }))
                        }
                        disabled={isConverting}
                        className="bg-zinc-800 border-zinc-600 text-white"
                      />
                      <p className="text-xs text-zinc-500">
                        Alpha below = transparent
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {isConverting && (
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">{progress.message}</span>
                      <span className="font-medium text-white tabular-nums">{Math.round(progress.progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {isConverting ? (
                  <Button
                    variant="destructive"
                    onClick={cancel}
                    className="flex-1 h-11"
                  >
                    <X className="size-4" />
                    Cancel Conversion
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleConvert}
                      disabled={!file}
                      className="flex-1 h-11"
                    >
                      <Play className="size-4" />
                      Convert to GIF
                    </Button>
                    {gifUrl && (
                      <Button
                        variant="outline"
                        onClick={handleDownload}
                        className="flex-1 sm:flex-none h-11 border-zinc-600 text-white hover:bg-zinc-800"
                      >
                        <Download className="size-4" />
                        Download
                        {gifBlob && (
                          <span className="text-zinc-400 ml-1">
                            ({formatFileSize(gifBlob.size)})
                          </span>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="p-4 flex items-center justify-center gap-3">
        <p className="text-xs text-zinc-500">
          All processing happens locally in your browser.
        </p>
        <span className="text-zinc-600">·</span>
        <a
          href="https://github.com/tyulyukov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
        >
          <Github className="size-3" />
          tyulyukov
        </a>
      </footer>
    </div>
  );
}

export default App;
