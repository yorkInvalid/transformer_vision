# Transformer Vision

A modern web application for visualizing and understanding transformer models, built with Svelte 5, Vite, TypeScript, and TailwindCSS.

## Features

- 🎨 **Modern UI**: Clean, card-based design with TailwindCSS
- 📊 **Interactive Visualizations**: d3.js for data visualization
- 🤖 **ONNX Runtime Web**: Run transformer models directly in the browser
- 🎯 **Single Page Application**: Long-scroll layout with multiple sections
- ⚡ **Fast Development**: Vite for lightning-fast HMR

## Tech Stack

- **Framework**: Svelte 5
- **Build Tool**: Vite 6
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Visualization**: d3.js
- **ML Runtime**: onnxruntime-web

## Project Structure

```
apps/web/          # Frontend application root
├── src/
│   ├── lib/
│   │   ├── components/    # Svelte components
│   │   ├── state/         # Svelte stores
│   │   ├── model/         # ONNX Runtime client
│   │   └── viz/           # d3 visualizations
│   ├── App.svelte         # Main app component
│   └── main.ts            # Application entry point
└── ...
```

## Getting Started

### Prerequisites

- Node.js 18.18.0 or higher
- npm 9.5.0 or higher

### Installation

```bash
cd apps/web
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Architecture

See [DOCS/ARCHITECTURE.md](./DOCS/ARCHITECTURE.md) for detailed architecture and standards.

## License

MIT

