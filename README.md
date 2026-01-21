# WebM to GIF Converter

A free online tool to convert WebM videos to GIF format while preserving alpha channel transparency. All processing happens locally in your browser - no files are uploaded to any server.

## Features

- **Transparency Support** - Preserves alpha channel from WebM videos, creating GIFs with transparent backgrounds
- **Privacy First** - Everything runs client-side using Web Workers, your files never leave your device
- **Adjustable Settings**
  - Frame rate (1-30 FPS)
  - Quality (1-30)
  - Transparency threshold (controls which alpha values become transparent)
- **Drag & Drop** - Simply drop your WebM file or click to browse
- **Live Preview** - See both source video and resulting GIF side by side
- **Responsive Design** - Works on desktop and mobile devices

## Usage

1. Open the app in your browser
2. Drag and drop a WebM file (or click to browse)
3. Adjust settings if needed (click "Settings" to expand)
4. Click "Convert to GIF"
5. Download your transparent GIF

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- gif.js (GIF encoding with Web Workers)
- Lucide React (icons)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## How It Works

1. The WebM video is loaded into a `<video>` element
2. Frames are extracted by seeking through the video and drawing each frame to a canvas
3. For each frame, pixels with alpha values below the threshold are replaced with a transparent color marker
4. gif.js encodes the frames using Web Workers for performance
5. The transparent color is registered with the GIF encoder to create actual transparency

## License

MIT

## Author

[tyulyukov](https://github.com/tyulyukov)
