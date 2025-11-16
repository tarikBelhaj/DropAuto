# Dropauto

**AI-Powered E-commerce Product Page Generator**

Dropauto is an online tool that automatically generates professional e-commerce product pages. Whether you're a dropshipper, a brand owner, or an SEO specialist, Dropauto helps you create high-quality, SEO-optimized content and images in minutes. Start from a competitor's URL, a simple product idea, or your own detailed brief.

![Dashboard](https://i.imgur.com/gQjW4mP.png)

## Key Features

-   **Flexible Content Creation:** Generate product pages from a URL, a product title, or manual input with key features.
-   **Automated Web Scraping:** Extracts product information and images from any e-commerce site to use as a baseline.
-   **AI-Powered Content Generation:** Uses Google Gemini to generate SEO-optimized titles, compelling descriptions, benefits, features, and tags.
-   **AI Image Enhancement & Generation:** Automatically enhances existing product images or generates new lifestyle and studio shots from scratch.
-   **Multi-language Support:** Generate and translate product content into multiple languages with a single click.
-   **One-Click Shopify Push:** Directly push the generated product page to your Shopify store as a draft.
-   **Sleek & Modern UI:** A simple and intuitive interface built with React and Tailwind CSS for a seamless user experience.

## Tech Stack

-   **Frontend:** React, TypeScript, Tailwind CSS
-   **APIs:**
    -   **@google/genai:** For all AI-powered text and image generation.
    -   **ScraperAPI:** For robust and reliable web scraping (via a secure backend proxy).
    -   **Shopify Admin API:** For pushing products directly to your store.

## Prerequisites

Before you begin, ensure you have the following:

-   Node.js and npm (or yarn)
-   **Google AI API Key:** Get one from [Google AI Studio](https://aistudio.google.com/app/apikey).
-   **ScraperAPI Key:** A free plan is available at [ScraperAPI](https://www.scraperapi.com/). This key should be set up as a backend environment variable, not in the frontend.
-   **Shopify Store:** You will need your store URL and an Admin API Access Token from a custom app.

## Getting Started

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/dropauto.git
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd dropauto
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Set up environment variables:**
    The application is configured to use the `API_KEY` environment variable for the Google Gemini API. How you set this will depend on your deployment environment. For local development, you should create a `.env.local` file and add the following:
    ```
    # For Google Gemini API (used by the frontend)
    API_KEY=your_google_ai_api_key_here

    # For ScraperAPI (used by your backend proxy)
    SCRAPER_API_KEY=b864bcc7eaa9f036f6b99b84cdfc4257
    ```
5.  **Start the development server:**
    This project is set up to run in an environment like AI Studio. To run it locally, you would need to set up a development server (e.g., using Vite or Create React App) to serve `index.html` and compile the TypeScript/React code, along with a backend proxy for scraping.

### Configuration

Once the application is running, you need to configure it to connect to your Shopify store.

1.  Click the **Settings** icon in the header.
2.  Enter your **Shopify Store URL** (e.g., `your-store.myshopify.com`).
3.  Enter your **Shopify Admin API Access Token**.
    -   *To get this token, you need to [create a custom app](https://help.shopify.com/en/manual/apps/custom-apps) in your Shopify admin panel and grant it the `write_products` scope.*
4.  Click **Save Settings**. Your credentials will be stored in your browser's local storage.

## Usage

1.  From the **Dashboard**, click **Create New Product**.
2.  **Choose your creation method:**
    -   **From URL:** Paste a URL to a product page to scrape its data.
    -   **From Title:** Enter a product name or idea to generate content from scratch.
    -   **Manual Entry:** Provide a title and key features for a more guided generation.
3.  Select the language for the initial content generation.
4.  Click **Generate Product**.
5.  Watch as the AI writes compelling copy and creates stunning product images.
6.  Once generated, review and edit the complete product page directly in the interface.
7.  Use the **Translate** button to generate content in other languages if needed.
8.  When you're satisfied, click **Push to Shopify** to send the new product directly to your store as a draft.

## Contributing

Contributions are welcome! If you have ideas for new features or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.