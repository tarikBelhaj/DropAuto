
export enum AppState {
  Dashboard,
  CreatingProduct,
}

export enum ProcessState {
    Idle,
    Processing,
    Success,
    Error,
}

// Data scraped directly from the supplier URL
export interface ScrapedProductData {
    title: string;
    imageUrls: string[];
}

// Final, AI-generated product data structure
export interface ProductData {
    title: string;
    short_description: string;
    long_description: string;
    benefits: string[];
    features: string[];
    tags: string[];
    alt_texts: string[];
    images: { originalUrl: string, enhancedUrl: string | null }[];
}

export const LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
];
