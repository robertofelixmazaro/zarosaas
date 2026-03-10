/**
 * Image optimization utility for the entire SaaS.
 * Handles resize, compress, format validation, and multi-version generation.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImagePreset {
  name: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  label: string;
}

// Preset configurations for different image types
export const IMAGE_PRESETS = {
  logo: {
    recommended: { width: 400, height: 400 },
    maxFileSize: 5,
    formats: ["image/jpeg", "image/png", "image/webp"],
    hint: "Tamanho recomendado: 400 × 400 px | Formato: JPG, PNG ou WEBP | Máx: 5MB",
    versions: [
      { name: "desktop", maxWidth: 400, maxHeight: 400, quality: 0.9, label: "Desktop" },
      { name: "mobile", maxWidth: 200, maxHeight: 200, quality: 0.85, label: "Mobile" },
    ] as ImagePreset[],
  },
  cover_desktop: {
    recommended: { width: 1920, height: 800 },
    maxFileSize: 5,
    formats: ["image/jpeg", "image/png", "image/webp"],
    hint: "Tamanho recomendado: 1920 × 800 px | Formato: JPG, PNG ou WEBP | Máx: 5MB",
    versions: [
      { name: "desktop", maxWidth: 1920, maxHeight: 800, quality: 0.85, label: "Desktop" },
      { name: "tablet", maxWidth: 1024, maxHeight: 427, quality: 0.8, label: "Tablet" },
    ] as ImagePreset[],
  },
  cover_mobile: {
    recommended: { width: 1080, height: 1350 },
    maxFileSize: 5,
    formats: ["image/jpeg", "image/png", "image/webp"],
    hint: "Tamanho recomendado: 1080 × 1350 px | Formato: JPG, PNG ou WEBP | Máx: 5MB",
    versions: [
      { name: "mobile", maxWidth: 1080, maxHeight: 1350, quality: 0.85, label: "Mobile" },
    ] as ImagePreset[],
  },
  service: {
    recommended: { width: 800, height: 600 },
    maxFileSize: 5,
    formats: ["image/jpeg", "image/png", "image/webp"],
    hint: "Tamanho recomendado: 800 × 600 px | Formato: JPG, PNG ou WEBP | Máx: 5MB",
    versions: [
      { name: "desktop", maxWidth: 800, maxHeight: 600, quality: 0.85, label: "Desktop" },
      { name: "mobile", maxWidth: 400, maxHeight: 300, quality: 0.8, label: "Mobile" },
    ] as ImagePreset[],
  },
  product: {
    recommended: { width: 800, height: 800 },
    maxFileSize: 5,
    formats: ["image/jpeg", "image/png", "image/webp"],
    hint: "Tamanho recomendado: 800 × 800 px | Formato: JPG, PNG ou WEBP | Máx: 5MB",
    versions: [
      { name: "desktop", maxWidth: 800, maxHeight: 800, quality: 0.85, label: "Desktop" },
      { name: "mobile", maxWidth: 400, maxHeight: 400, quality: 0.8, label: "Mobile" },
    ] as ImagePreset[],
  },
  gallery: {
    recommended: { width: 1200, height: 900 },
    maxFileSize: 5,
    formats: ["image/jpeg", "image/png", "image/webp"],
    hint: "Tamanho recomendado: 1200 × 900 px | Formato: JPG, PNG ou WEBP | Máx: 5MB",
    versions: [
      { name: "desktop", maxWidth: 1200, maxHeight: 900, quality: 0.85, label: "Desktop" },
      { name: "tablet", maxWidth: 800, maxHeight: 600, quality: 0.8, label: "Tablet" },
      { name: "mobile", maxWidth: 480, maxHeight: 360, quality: 0.75, label: "Mobile" },
    ] as ImagePreset[],
  },
} as const;

export type ImagePresetType = keyof typeof IMAGE_PRESETS;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validates file format and size.
 */
export function validateImage(
  file: File,
  presetType: ImagePresetType
): { valid: boolean; error?: string } {
  const preset = IMAGE_PRESETS[presetType];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Formato não permitido. Use JPG, PNG ou WEBP." };
  }
  const maxBytes = preset.maxFileSize * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `Arquivo muito grande. Máximo: ${preset.maxFileSize}MB.` };
  }
  return { valid: true };
}

/**
 * Loads a File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resizes and compresses an image using Canvas.
 * If image is smaller than target, it keeps original dimensions (no upscaling).
 */
function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  outputType: string = "image/jpeg"
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let { naturalWidth: w, naturalHeight: h } = img;

    // Only downscale, never upscale
    if (w > maxWidth || h > maxHeight) {
      const ratio = Math.min(maxWidth / w, maxHeight / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas not supported"));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      outputType,
      quality
    );
  });
}

export interface OptimizedImage {
  blob: Blob;
  versionName: string;
  width: number;
  height: number;
}

/**
 * Optimizes a single image file into the primary (first) version of a preset.
 * Returns a single optimized Blob ready for upload.
 */
export async function optimizeImage(
  file: File,
  presetType: ImagePresetType
): Promise<Blob> {
  const preset = IMAGE_PRESETS[presetType];
  const mainVersion = preset.versions[0];
  const img = await loadImage(file);

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await resizeImage(
    img,
    mainVersion.maxWidth,
    mainVersion.maxHeight,
    mainVersion.quality,
    outputType
  );

  URL.revokeObjectURL(img.src);
  return blob;
}

/**
 * Generates multiple optimized versions of an image.
 */
export async function generateImageVersions(
  file: File,
  presetType: ImagePresetType
): Promise<OptimizedImage[]> {
  const preset = IMAGE_PRESETS[presetType];
  const img = await loadImage(file);
  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";

  const results: OptimizedImage[] = [];

  for (const version of preset.versions) {
    let { naturalWidth: w, naturalHeight: h } = img;
    if (w > version.maxWidth || h > version.maxHeight) {
      const ratio = Math.min(version.maxWidth / w, version.maxHeight / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const blob = await resizeImage(img, version.maxWidth, version.maxHeight, version.quality, outputType);
    results.push({ blob, versionName: version.name, width: w, height: h });
  }

  URL.revokeObjectURL(img.src);
  return results;
}
