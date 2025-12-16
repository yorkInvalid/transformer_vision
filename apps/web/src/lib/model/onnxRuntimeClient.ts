// Minimal import test for onnxruntime-web, following official docs
// This module ensures the package is wired correctly; it does not run any model.
import * as ort from 'onnxruntime-web';

export function getOrtVersion(): string | undefined {
    // Accessing env.version is enough to ensure the library is present and typed
    return (ort as any).version || undefined;
}

export { ort };


