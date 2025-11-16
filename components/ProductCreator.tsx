import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { ProcessState, ProductData, ScrapedProductData, LANGUAGES } from '../types';
import { ArrowLeftIcon, SparklesIcon } from './icons';
import { Button } from './shared/Button';
import { Spinner } from './shared/Spinner';
import ProductResult from './ProductResult';

interface ProductCreatorProps {
  onBackToDashboard: () => void;
}

type CreationMode = 'url' | 'title' | 'manual';

// ====================================================================================
// SECURE SCRAPING HELPERS (via Backend Proxy)
// ====================================================================================

/**
 * Securely fetches an image via a backend proxy.
 * @param imageUrl The URL of the image to fetch.
 * @returns A blob of the image and its MIME type.
 */
const secureFetchImage = async (imageUrl: string): Promise<{ blob: Blob; mimeType: string }> => {
    // This function also assumes the backend endpoint can proxy image requests.
    const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl, binary: true }),
    });

     if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Image fetch failed with status ' + response.status }));
        throw new Error(errorData.error || `Failed to fetch image: ${imageUrl}`);
    }
    
    const blob = await response.blob();
    const mimeType = response.headers.get('Content-Type') || 'image/jpeg';
    return { blob, mimeType };
}


// ====================================================================================
// MULTI-LAYER SCRAPER (Refactored for Security)
// ====================================================================================

class AliExpressScraper {
  private setStatusMessage: (msg: string) => void;

  constructor(setStatusMessage: (msg: string) => void) {
    this.setStatusMessage = setStatusMessage;
  }

  async scrapeProduct(url: string): Promise<ScrapedProductData> {
    console.log('🔍 Multi-layer scraping for:', url);
    
    // LAYER 1: Backend API avec Premium
    try {
      this.setStatusMessage('🌐 Scraping with premium settings...');
      return await this.scrapeViaBackend(url, true);
    } catch (error) {
      console.warn('⚠️ Premium scraping failed:', error);
    }
    
    // LAYER 2: Backend API Standard
    try {
      this.setStatusMessage('🌐 Trying standard scraping...');
      return await this.scrapeViaBackend(url, false);
    } catch (error) {
      console.warn('⚠️ Standard scraping failed:', error);
    }
    
    // LAYER 3: Fallback depuis URL
    this.setStatusMessage('⚠️ Using fallback extraction (limited data)');
    return this.extractFromUrl(url);
  }

  private async scrapeViaBackend(url: string, premium: boolean): Promise<ScrapedProductData> {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, premium })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const { html } = await response.json();
    
    if (this.isErrorPage(html)) {
      throw new Error('Received error page');
    }

    return this.parseHTML(html);
  }

  private extractFromUrl(url: string): ScrapedProductData {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    let title = '';
    for (const part of pathParts) {
      if (part.includes('-') && !part.includes('.html') && part.length > 5) {
        title = part
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        break;
      }
    }

    const productId = this.extractProductId(url);
    if (!title) {
      title = `Product ${productId}`;
    }

    console.log('⚠️ Fallback extraction:', title);

    return {
      title: title.trim(),
      imageUrls: []
    };
  }

  private parseHTML(html: string): ScrapedProductData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extraction titre
    let title = '';
    const titleSelectors = [
      'h1[data-pl="product-title"]',
      'h1.product-title-text',
      'h1[class*="Title"]',
      'meta[property="og:title"]',
      'h1'
    ];

    for (const selector of titleSelectors) {
      const el = doc.querySelector(selector);
      if (el) {
        title = selector.startsWith('meta')
          ? el.getAttribute('content') || ''
          : el.textContent || '';
        title = title.trim();
        if (title.length > 5) {
          console.log(`✅ Title found with: ${selector}`);
          break;
        }
      }
    }

    if (!title || title.length < 5) {
      throw new Error('Could not extract title');
    }

    // Extraction images
    const imageUrls = new Set<string>();
    
    const imageSelectors = [
      'img[class*="magnifier"]',
      'img[class*="ImageView"]',
      'img[class*="gallery"]',
      'img[data-src*="alicdn"]',
      'img[src*="alicdn"]',
      'meta[property="og:image"]'
    ];

    imageSelectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => {
        let src = el.getAttribute('data-src') || 
                  el.getAttribute('src') || 
                  el.getAttribute('content') || '';
        
        // Upgrade vers HD
        src = src
          .replace('_50x50.jpg', '.jpg')
          .replace('_100x100.jpg', '.jpg')
          .replace('_200x200.jpg', '.jpg')
          .replace('.webp', '.jpg');
        
        if (src && src.includes('alicdn.com')) {
          const fullUrl = src.startsWith('//') ? 'https:' + src : src;
          imageUrls.add(fullUrl);
        }
      });
    });

    const finalImageUrls = Array.from(imageUrls).slice(0, 8);
    console.log(`✅ Found ${finalImageUrls.length} images`);

    return {
      title: title.trim(),
      imageUrls: finalImageUrls
    };
  }

  private extractProductId(url: string): string {
    const match = url.match(/\/(\d+)\.html/) || url.match(/item\/(\d+)/);
    return match ? match[1] : 'unknown';
  }

  private isErrorPage(html: string): boolean {
    const errorPatterns = ['Robot Check', 'Access Denied', 'captcha-verify'];
    return errorPatterns.some(p => html.toLowerCase().includes(p.toLowerCase()));
  }
}

// ====================================================================================
// MAIN PRODUCT CREATOR COMPONENT
// ====================================================================================

const ProductCreator: React.FC<ProductCreatorProps> = ({ onBackToDashboard }) => {
  const [creationMode, setCreationMode] = useState<CreationMode>('url');
  const [productUrl, setProductUrl] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const [manualInfo, setManualInfo] = useState('');

  const [language, setLanguage] = useState('fr');
  const [processState, setProcessState] = useState<ProcessState>(ProcessState.Idle);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const ai = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (!process.env.API_KEY) {
        setError("Google AI API key is missing. Please ensure the API_KEY environment variable is set.");
        setProcessState(ProcessState.Error);
        return;
    }
    ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }, []);

  const retryWithExponentialBackoff = async <T,>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (retries > 0) {
        console.warn(`Retry in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        return retryWithExponentialBackoff(fn, retries - 1, delay * 2);
      }
      throw err;
    }
  };

  const handleGenerate = async () => {
    let initialData: ScrapedProductData;
    let textGenPrompt: string;
    let skipScraping = false;
    
    switch (creationMode) {
        case 'title':
            if (!productTitle) { setError("Please enter a product title."); return; }
            initialData = { title: productTitle, imageUrls: [] };
            textGenPrompt = `Based on the product title "${productTitle}", generate the product content in the language: ${language}.`;
            skipScraping = true;
            break;
        case 'manual':
            if (!productTitle) { setError("Please enter a product title."); return; }
            initialData = { title: productTitle, imageUrls: [] };
            textGenPrompt = `Based on the product title "${productTitle}" and these additional details: "${manualInfo}", generate the product content in the language: ${language}.`;
            skipScraping = true;
            break;
        case 'url':
        default:
            if (!productUrl) { setError("Please enter a product URL."); return; }
            initialData = { title: '', imageUrls: [] };
            textGenPrompt = '';
            break;
    }

    setProcessState(ProcessState.Processing);
    setError(null);
    setProductData(null);

    try {
      let finalInitialData: ScrapedProductData;
      let finalPrompt: string;

      if (skipScraping) {
          finalInitialData = initialData;
          finalPrompt = textGenPrompt;
      } else {
          // Use the secure, refactored scraper
          const scraper = new AliExpressScraper(setStatusMessage);
          finalInitialData = await scraper.scrapeProduct(productUrl);
          finalPrompt = `Based on the product title "${finalInitialData.title}", generate the product content in the language: ${language}.`;
      }
      
      setStatusMessage("Generating AI content...");
      const [textData, imagesData] = await Promise.all([
        generateTextContent(finalPrompt),
        processImages(finalInitialData)
      ]);

      const finalProductData: ProductData = {
        title: textData.title || finalInitialData.title,
        ...textData,
        images: imagesData
      };

      setProductData(finalProductData);
      setProcessState(ProcessState.Success);
      setStatusMessage('✅ Product generated successfully!');
      
    } catch (err: any) {
      console.error("Error during product generation:", err);
      setError(err.message || "An unknown error occurred.");
      setProcessState(ProcessState.Error);
    } finally {
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const generateTextContent = async (prompt: string) => {
    if (!ai.current) throw new Error("AI client not initialized.");
    
    const systemInstruction = `You are an expert in e-commerce copywriting and Google Merchant Center compliance. Write product descriptions that sound fully human, neutral, and practical. Your tone must be simple and natural, avoiding AI patterns, overused marketing expressions, or unrealistic claims. ABSOLUTELY FORBIDDEN EXPRESSIONS: "pièce unique", "haute qualité", "qualité supérieure", "fabriqué avec soin", "élégant", "raffiné", "tendance", "parfait pour", "idéal pour", "une touche de", "sublime votre look", "style intemporel", "finition impeccable", "haut de gamme", "exceptionnel", "ultime", "matériaux premium", "fabrication soignée", "confort optimal". GENERAL RULES: No exaggeration, no subjective judgments, no fake claims, no cliché copywriting, No AI-sounding intros ("Découvrez", "Plongez", etc.). TONE TO USE: Neutral, Concise, Practical, Factual, Human and realistic.`;
    
    const apiCall = async (): Promise<GenerateContentResponse> => {
        if (!ai.current) throw new Error("AI client not initialized.");
        return ai.current.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'SEO-optimized product title, 60-70 characters' },
                  short_description: { type: Type.STRING, description: '1-2 short, factual sentences for product listing pages.' },
                  long_description: { type: Type.STRING, description: '4-7 short, factual sentences separated by newlines.' },
                  benefits: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3-5 factual benefits as bullet points.' },
                  features: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3-5 technical features as bullet points.' },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: '5-10 relevant e-commerce tags.' },
                  alt_texts: { type: Type.ARRAY, items: { type: Type.STRING }, description: '4 descriptive alt texts, one for each of the 4 product images.' },
                }
              }
            },
        });
    };

    const textResponse = await retryWithExponentialBackoff(apiCall);
    const parsedText = JSON.parse(textResponse.text);

    return {
      title: parsedText.title || '',
      short_description: parsedText.short_description || '',
      long_description: parsedText.long_description || '',
      benefits: parsedText.benefits || [],
      features: parsedText.features || [],
      tags: parsedText.tags || [],
      alt_texts: parsedText.alt_texts || [],
    };
  };

  const processImages = async (initialData: ScrapedProductData) => {
    const hasUrls = initialData.imageUrls.length > 0;
    
    if (!hasUrls) {
        setStatusMessage("No images found, generating 4 AI images...");
        console.log('🎨 Generating all images from scratch');
        
        const imagePromises = [0, 1, 2, 3].map((i) => (async () => {
            try {
                setStatusMessage(`Generating image ${i + 1}/4...`);
                const prompt = i < 2 
                    ? `Photorealistic product image of "${initialData.title}" on clean neutral background, professional e-commerce photography`
                    : `Lifestyle photo of "${initialData.title}" being used in natural context, photorealistic`;
                
                const enhancedUrl = await generateImage(prompt);
                return { originalUrl: 'generated', enhancedUrl };
            } catch (err) {
                console.error(`Failed to generate image ${i + 1}:`, err);
                return { originalUrl: 'failed', enhancedUrl: null };
            }
        })());

        return Promise.all(imagePromises);
    }

    setStatusMessage(`Processing ${initialData.imageUrls.length} scraped images...`);

    const imagePromises = initialData.imageUrls.slice(0, 4).map((url, i) => (async () => {
        try {
            setStatusMessage(`Enhancing image ${i + 1}/${initialData.imageUrls.length}...`);
            
            const base64Image = await fetchAndConvertImage(url);
            const prompt = i < 2
                ? "Subtly enhance this product photo for e-commerce. Clean the background to neutral light grey, improve lighting, remove text/watermarks. Do not alter the product."
                : "Take the product from this image and place it in a realistic lifestyle setting for e-commerce.";
            
            const enhancedUrl = await enhanceImage(base64Image.data, base64Image.mimeType, prompt);
            return { originalUrl: url, enhancedUrl };
        } catch (err) {
            console.error(`Skipping image ${i + 1}:`, err);
            return { originalUrl: url, enhancedUrl: null };
        }
    })());

    const results = await Promise.all(imagePromises);
    
    const validResults = results.filter(r => r.enhancedUrl);
    if (validResults.length < 4) {
        const needed = 4 - validResults.length;
        setStatusMessage(`Generating ${needed} additional images...`);
        
        for (let i = 0; i < needed; i++) {
            try {
                const prompt = `Photorealistic product image of "${initialData.title}" on clean neutral background`;
                const enhancedUrl = await generateImage(prompt);
                validResults.push({ originalUrl: 'generated', enhancedUrl });
            } catch (err) {
                console.error(`Failed to generate additional image:`, err);
            }
        }
    }

    return validResults;
  };

  const fetchAndConvertImage = async (url: string) => {
    const fetchFn = () => secureFetchImage(url);
    
    const { blob, mimeType } = await retryWithExponentialBackoff(fetchFn);
    const finalBlob = new Blob([blob], { type: mimeType });

    if (!finalBlob.type.startsWith('image/')) {
        throw new Error(`Unsupported MIME type: ${finalBlob.type}`);
    }

    const convertedBlob = await convertImageToSupportedFormat(finalBlob);
    
    return new Promise<{ data: string, mimeType: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ 
            data: (reader.result as string).split(',')[1], 
            mimeType: convertedBlob.type 
        });
        reader.onerror = reject;
        reader.readAsDataURL(convertedBlob);
    });
  };

  const enhanceImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const apiCall = async (): Promise<GenerateContentResponse> => {
        if (!ai.current) throw new Error("AI client not initialized.");
        return ai.current.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
    };
    const response = await retryWithExponentialBackoff(apiCall);
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'inlineData' in part && part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to extract enhanced image.");
  };

  const generateImage = async (prompt: string): Promise<string> => {
    const apiCall = async (): Promise<GenerateContentResponse> => {
        if (!ai.current) throw new Error("AI client not initialized.");
        return ai.current.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
    };
    const response = await retryWithExponentialBackoff(apiCall);
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'inlineData' in part && part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to generate image.");
  };

  const convertImageToSupportedFormat = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (supportedTypes.includes(blob.type)) {
        resolve(blob);
        return;
      }
      
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(pngBlob => {
          URL.revokeObjectURL(url);
          if (pngBlob) resolve(pngBlob);
          else reject(new Error('Canvas conversion failed.'));
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for conversion.'));
      };
      img.src = url;
    });
  };

  const renderContent = () => {
    switch (processState) {
      case ProcessState.Processing:
        return (
          <div className="text-center">
            <Spinner className="w-12 h-12 mx-auto text-primary-500" />
            <p className="mt-4 text-lg text-gray-300">{statusMessage || "Processing..."}</p>
          </div>
        );
      case ProcessState.Success:
        return productData && <ProductResult initialData={productData} />;
      case ProcessState.Error:
        return (
          <div className="text-center bg-gray-800 p-8 rounded-lg">
            <h3 className="text-xl font-semibold text-red-400">Generation Failed</h3>
            <p className="mt-2 text-gray-400">{error}</p>
            <Button onClick={() => setProcessState(ProcessState.Idle)} className="mt-6">
              Try Again
            </Button>
          </div>
        );
      case ProcessState.Idle:
      default:
        return (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center">Create a new Product Page</h2>
            <p className="text-gray-400 text-center mt-2 mb-8">Start with a competitor's URL, a simple title, or your own details.</p>
            
            <div className="bg-gray-900/50 p-1.5 rounded-lg mb-6 flex space-x-1.5">
                <button onClick={() => setCreationMode('url')} className={`w-full py-2.5 text-sm font-medium rounded-md transition-colors ${creationMode === 'url' ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>From URL</button>
                <button onClick={() => setCreationMode('title')} className={`w-full py-2.5 text-sm font-medium rounded-md transition-colors ${creationMode === 'title' ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>From Title</button>
                <button onClick={() => setCreationMode('manual')} className={`w-full py-2.5 text-sm font-medium rounded-md transition-colors ${creationMode === 'manual' ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Manual Entry</button>
            </div>

            <div className="space-y-6 bg-gray-800 p-8 rounded-lg shadow-lg">
              {creationMode === 'url' && (
                <div>
                  <label htmlFor="productUrl" className="block text-sm font-medium text-gray-300">Product URL</label>
                  <p className="text-xs text-gray-500 mb-2">Paste a link to AliExpress or any e-commerce product page.</p>
                  <input
                    type="url"
                    name="productUrl"
                    id="productUrl"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    className="mt-1 block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-white"
                    placeholder="https://aliexpress.com/item/..."
                  />
                </div>
              )}

              {creationMode === 'title' && (
                <div>
                  <label htmlFor="productTitle" className="block text-sm font-medium text-gray-300">Product Title / Idea</label>
                  <p className="text-xs text-gray-500 mb-2">Enter a name or an idea for your product.</p>
                  <input
                    type="text"
                    name="productTitle"
                    id="productTitle"
                    value={productTitle}
                    onChange={(e) => setProductTitle(e.target.value)}
                    className="mt-1 block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-white"
                    placeholder="e.g., 'ergonomic wireless vertical mouse'"
                  />
                </div>
              )}

              {creationMode === 'manual' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="manualProductTitle" className="block text-sm font-medium text-gray-300">Product Title</label>
                    <input
                      type="text"
                      name="manualProductTitle"
                      id="manualProductTitle"
                      value={productTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      className="mt-1 block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-white"
                      placeholder="e.g., 'ErgoMouse Pro'"
                    />
                  </div>
                  <div>
                    <label htmlFor="manualInfo" className="block text-sm font-medium text-gray-300">Key Features / Additional Info</label>
                     <p className="text-xs text-gray-500 mb-2">Provide key selling points or details to guide the AI.</p>
                     <textarea
                       id="manualInfo"
                       name="manualInfo"
                       rows={4}
                       value={manualInfo}
                       onChange={(e) => setManualInfo(e.target.value)}
                       className="mt-1 block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-white"
                       placeholder="e.g., - Bluetooth 5.2&#10;- 24-hour battery life&#10;- Adjustable DPI (800-2400)"
                     />
                  </div>
                </div>
              )}
                
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-300">Generation Language</label>
                <select
                  id="language"
                  name="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1 block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-white"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-5">
                <div className="flex justify-end">
                  <Button onClick={handleGenerate} fullWidth disabled={processState !== ProcessState.Idle}>
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Generate Product
                  </Button>
                </div>
              </div>
              
              {creationMode === 'url' && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p>💡 <strong>Tips for best results:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Works best with AliExpress product URLs</li>
                    <li>Scraping now happens securely through our backend</li>
                    <li>If scraping fails, images will be generated by AI</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button onClick={onBackToDashboard} className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>
      </div>
      {renderContent()}
    </div>
  );
};

export default ProductCreator;