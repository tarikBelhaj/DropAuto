import React, { useState, useRef, useEffect } from 'react';
import { ProductData, LANGUAGES } from '../types';
import { Button } from './shared/Button';
import { ShopifyIcon, SparklesIcon } from './icons';
import { GoogleGenAI, Type } from "@google/genai";

interface ProductResultProps {
  initialData: ProductData;
}

const ProductResult: React.FC<ProductResultProps> = ({ initialData }) => {
  const [product, setProduct] = useState<ProductData>(initialData);
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ state: 'idle' | 'success' | 'error'; message: string }>({ state: 'idle', message: '' });
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const translateRef = useRef<HTMLDivElement>(null);
  const ai = useRef<GoogleGenAI | null>(null);

  if (!ai.current && process.env.API_KEY) {
      ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (translateRef.current && !translateRef.current.contains(event.target as Node)) {
        setIsTranslateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [translateRef]);

  const handlePushToShopify = async () => {
    setIsPushing(true);
    setPushStatus({ state: 'idle', message: '' });

    const shopUrl = localStorage.getItem('shopifyShopUrl');
    const apiToken = localStorage.getItem('shopifyApiToken');

    if (!shopUrl || !apiToken) {
        setPushStatus({ state: 'error', message: "Shopify settings are not configured. Please go to Settings." });
        setIsPushing(false);
        return;
    }

    const formattedShopUrl = shopUrl.replace(/^https?:\/\//, '').split('/')[0];

    const shopifyProduct = {
      product: {
        title: product.title,
        body_html: `<p>${product.short_description}</p><br/><strong>Description:</strong><p>${product.long_description.replace(/\n/g, '<br/>')}</p><br/><strong>Benefits:</strong><ul>${product.benefits.map(b => `<li>${b}</li>`).join('')}</ul><br/><strong>Features:</strong><ul>${product.features.map(f => `<li>${f}</li>`).join('')}</ul>`,
        tags: product.tags.join(','),
        status: 'draft',
        images: product.images
            .filter(img => img.enhancedUrl)
            .map(img => ({ src: img.enhancedUrl })),
      },
    };

    try {
      // NOTE: Direct API calls from the browser to the Shopify Admin API are blocked by CORS.
      // This requires a backend proxy to forward the request with the correct headers.
      const response = await fetch(`https://${formattedShopUrl}/admin/api/2024-04/products.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': apiToken,
        },
        body: JSON.stringify(shopifyProduct),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Shopify API Error: ${JSON.stringify(errorData.errors)}`);
      }

      await response.json();
      setPushStatus({ state: 'success', message: 'Product pushed to Shopify as a draft!' });
    } catch (error: any) {
        console.error('Failed to push to Shopify:', error);
        setPushStatus({ state: 'error', message: `Failed to push product. Check console and Shopify settings. Error: ${error.message}. Note: A backend proxy is often required for this.` });
    } finally {
        setIsPushing(false);
    }
  };
  
  const handleTranslate = async (languageName: string) => {
    if (!ai.current) {
        console.error("AI client not initialized.");
        return;
    }
    setIsTranslating(true);
    setIsTranslateOpen(false);
    try {
        const textToTranslate = {
            title: product.title,
            short_description: product.short_description,
            long_description: product.long_description,
            benefits: product.benefits,
            features: product.features,
        };

        const prompt = `Translate the following JSON object fields into ${languageName}. Keep the JSON structure and keys the same. Only translate the string values.\n\n${JSON.stringify(textToTranslate, null, 2)}`;
        
        const response = await ai.current.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        short_description: { type: Type.STRING },
                        long_description: { type: Type.STRING },
                        benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
                        features: { type: Type.ARRAY, items: { type: Type.STRING } },
                    }
                }
            }
        });

        const translatedContent = JSON.parse(response.text);

        setProduct(prev => ({
            ...prev,
            ...translatedContent,
        }));

    } catch (error) {
        console.error("Translation failed:", error);
    } finally {
        setIsTranslating(false);
    }
  };

  const handleFieldChange = (field: keyof ProductData, value: any, index?: number) => {
    setProduct(prev => {
        if (Array.isArray(prev[field]) && index !== undefined) {
            const newArray = [...(prev[field] as any[])];
            newArray[index] = value;
            return { ...prev, [field]: newArray };
        }
        return { ...prev, [field]: value };
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold text-white">Generated Product Page</h2>
            <div className="flex items-center gap-2">
                <Button onClick={handlePushToShopify} loading={isPushing} variant="success">
                    <ShopifyIcon className="w-5 h-5 mr-2" />
                    Push to Shopify
                </Button>
                 <div className="relative" ref={translateRef}>
                    <Button 
                        onClick={() => setIsTranslateOpen(prev => !prev)} 
                        loading={isTranslating}
                        aria-haspopup="true"
                        aria-expanded={isTranslateOpen}
                    >
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        Translate
                        <svg className={`w-4 h-4 ml-2 transition-transform ${isTranslateOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </Button>
                    {isTranslateOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
                            <ul className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="translate-button">
                                {LANGUAGES.map(lang => (
                                    <li key={lang.code}>
                                        <button 
                                            onClick={() => handleTranslate(lang.name)} 
                                            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 disabled:opacity-50"
                                            disabled={isTranslating}
                                            role="menuitem"
                                        >
                                            {lang.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {pushStatus.message && (
            <div className={`p-4 mb-6 rounded-md text-sm ${
                pushStatus.state === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
            }`}>
                {pushStatus.message}
            </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Images */}
        <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold border-b border-gray-700 pb-2 mb-2">Product Images</h3>
            {product.images.map((img, i) => (
                <div key={i} className="bg-gray-900 rounded-lg p-2">
                    {img.enhancedUrl ? (
                        <img src={img.enhancedUrl} alt={product.alt_texts[i] || product.title} className="rounded w-full h-auto object-cover"/>
                    ) : (
                         <div className="h-48 w-full bg-gray-700 rounded flex items-center justify-center text-gray-400">
                             Image failed to generate
                         </div>
                    )}
                    <input 
                        type="text"
                        value={product.alt_texts[i] || ''}
                        onChange={(e) => handleFieldChange('alt_texts', e.target.value, i)}
                        placeholder="Image Alt Text"
                        className="mt-2 w-full bg-gray-700 border-gray-600 rounded-md text-xs p-1.5 focus:ring-primary-500 focus:border-primary-500 text-white"
                        aria-label={`Alt text for image ${i + 1}`}
                    />
                </div>
            ))}
        </div>

        {/* Right Column: Text Content */}
        <div className="lg:col-span-2 space-y-6">
            <EditableField label="Product Title" value={product.title} onChange={(val) => handleFieldChange('title', val)} />
            <EditableField label="Short Description" value={product.short_description} onChange={(val) => handleFieldChange('short_description', val)} type="textarea" />
            <EditableField label="Long Description" value={product.long_description} onChange={(val) => handleFieldChange('long_description', val)} type="textarea" rows={6} />
            <EditableList label="Benefits" items={product.benefits} onChange={(val, i) => handleFieldChange('benefits', val, i)} />
            <EditableList label="Features" items={product.features} onChange={(val, i) => handleFieldChange('features', val, i)} />
            
            <div>
                 <label className="block text-sm font-semibold text-gray-300 mb-2">Tags</label>
                 <p className="flex flex-wrap gap-2">
                     {product.tags.map((tag, i) => (
                        <span key={i} className="bg-primary-900/50 text-primary-300 text-xs font-medium px-2.5 py-1 rounded-full">{tag}</span>
                     ))}
                 </p>
            </div>
        </div>
      </div>
    </div>
  );
};

// Helper components for editable fields
const EditableField = ({ label, value, onChange, type = 'text', rows = 3 }: { label: string; value: string; onChange: (value: string) => void; type?: 'text' | 'textarea'; rows?: number }) => (
    <div>
        <label htmlFor={label.replace(/\s+/g, '-')} className="block text-sm font-semibold text-gray-300 mb-1">{label}</label>
        {type === 'textarea' ? (
            <textarea id={label.replace(/\s+/g, '-')} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full bg-gray-900/50 border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-white" />
        ) : (
            <input type="text" id={label.replace(/\s+/g, '-')} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-gray-900/50 border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-white" />
        )}
    </div>
);

const EditableList = ({ label, items, onChange }: { label: string; items: string[]; onChange: (value: string, index: number) => void }) => (
    <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">{label}</label>
        <ul className="space-y-2 list-disc list-inside text-gray-300">
            {items.map((item, i) => (
                <li key={i}>
                    <input type="text" value={item} onChange={(e) => onChange(e.target.value, i)} className="w-[95%] ml-2 inline-block bg-transparent focus:bg-gray-900/50 rounded p-1 focus:ring-1 focus:ring-primary-500 outline-none" aria-label={`${label} item ${i + 1}`} />
                </li>
            ))}
        </ul>
    </div>
);

export default ProductResult;
