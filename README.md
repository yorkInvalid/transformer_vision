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
- Python 3.8+ (for model export, optional)

### Installation

```bash
cd apps/web
npm install
```

### Model Configuration

The app requires an ONNX model file. You have three options:

#### Option 1: Use CDN (Recommended for large models)

Set environment variables:

```bash
# .env.local
VITE_MODEL_URL=https://your-cdn.com/models/gpt2/model.onnx
VITE_MODEL_VERSION=1.0.0
```

#### Option 2: Local Model File

Place your model at `apps/web/public/models/gpt2/model.onnx`

#### Option 3: Export Your Own Model

See [DOCS/EXPORT_ONNX.md](./DOCS/EXPORT_ONNX.md) for instructions on exporting a GPT-2 model with activations.

```bash
cd tools/model-export
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python export.py --output ../apps/web/public/models/gpt2/model.onnx
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

This will start a local server to preview the production build. Useful for testing GitHub Pages deployment locally.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Architecture

See [DOCS/ARCHITECTURE.md](./DOCS/ARCHITECTURE.md) for detailed architecture and standards.

## Deployment

### GitHub Pages

The app is configured for automatic deployment to GitHub Pages via GitHub Actions.

1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Select "GitHub Actions"

2. **Configure Model URL** (if using CDN):
   - Go to Settings → Secrets and variables → Actions
   - Add `VITE_MODEL_URL` secret

3. **Push to main branch**:
   - The workflow will automatically build and deploy

See [DOCS/DEPLOYMENT.md](./DOCS/DEPLOYMENT.md) for detailed deployment instructions.

### Local Preview

Before deploying, test the production build locally:

```bash
cd apps/web
npm run build
npm run preview
```

Visit the displayed URL (usually `http://localhost:4173`) to verify.

## Documentation

- [ARCHITECTURE.md](./DOCS/ARCHITECTURE.md) - Project architecture and standards
- [EXPORT_ONNX.md](./DOCS/EXPORT_ONNX.md) - Model export guide
- [ACTIVATIONS_CONTRACT.md](./DOCS/ACTIVATIONS_CONTRACT.md) - Data contract for activations
- [WORKER_PROTOCOL.md](./DOCS/WORKER_PROTOCOL.md) - Worker communication protocol
- [DEPLOYMENT.md](./DOCS/DEPLOYMENT.md) - Deployment guide

## License

MIT

