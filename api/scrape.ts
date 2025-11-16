// This file acts as a serverless function / API route.
// It should be placed in an `/api` directory at the root of the project.
// The execution environment (like Vercel, Netlify, or a compatible hosting service)
// is expected to pick up this file and serve it at the `/api/scrape` endpoint.

export const config = {
  runtime: 'edge', // A hint for the deployment platform to use a lightweight runtime
};

/**
 * Handles incoming POST requests to scrape a given URL.
 * @param req The incoming request object.
 * @returns A response with either scraped HTML, binary image data, or an error.
 */
async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url, premium = false, binary = false } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing URL parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      new URL(url);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.SCRAPER_API_KEY;

    if (!apiKey) {
      console.error('SCRAPER_API_KEY not found in environment variables');
      return new Response(JSON.stringify({ error: 'ScraperAPI key is not configured on the server.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const scraperUrl = new URL('https://api.scraperapi.com/');
    scraperUrl.searchParams.set('api_key', apiKey);
    scraperUrl.searchParams.set('url', url);
    
    // Configure ScraperAPI based on content type (HTML vs. binary image)
    if (!binary) {
      scraperUrl.searchParams.set('render', 'true');
      scraperUrl.searchParams.set('country_code', 'us');
      scraperUrl.searchParams.set('device_type', 'desktop');
      if (premium) {
        scraperUrl.searchParams.set('premium', 'true');
        scraperUrl.searchParams.set('wait', '3000');
      }
    }

    const controller = new AbortController();
    const timeout = binary ? 30000 : 90000; // 30s for images, 90s for pages
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const scraperResponse = await fetch(scraperUrl.toString(), {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!scraperResponse.ok) {
      let errorBody = `ScraperAPI returned status ${scraperResponse.status}`;
      try {
        // Try to parse a more specific error message from ScraperAPI
        const errorData = await scraperResponse.json();
        errorBody = errorData.error || JSON.stringify(errorData);
      } catch (e) { /* ignore if body is not json */ }
      
      return new Response(JSON.stringify({ error: errorBody }), {
        status: scraperResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (binary) {
      // Return raw image blob for image requests
      const blob = await scraperResponse.blob();
      return new Response(blob, {
        status: 200,
        headers: { 'Content-Type': scraperResponse.headers.get('Content-Type') || 'application/octet-stream' },
      });
    } else {
      // Return HTML content as JSON for page scraping
      const html = await scraperResponse.text();
      return new Response(JSON.stringify({ success: true, html }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    let errorMessage = 'Scraping failed';
    if (error.name === 'AbortError') {
        errorMessage = 'Scraping request timed out.';
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    console.error('Scraping error:', error);
    return new Response(JSON.stringify({ error: 'Scraping process failed', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Some platforms (like Vercel or Netlify) use a default export for API routes,
// while others (like Next.js App Router) use named exports for HTTP methods.
// We provide both for broad compatibility.
export default handler;
export const POST = handler;
