# EcoLens - Food Sustainability Browser Extension

EcoLens is a browser extension that analyzes the environmental impact and sustainability of food products. The extension operates in two modes: manual search through the popup interface and automatic detection while browsing online grocery stores and food retailers.

## What EcoLens Does

### Product Detection and Analysis

-   **Automatic Detection**: When browsing food shopping websites, EcoLens scans page content to identify food products using multiple extraction methods including JSON-LD structured data, meta tags, and DOM element analysis
-   **Manual Search**: Search for any food product through the extension popup to generate sustainability reports
-   **Smart Product Cleaning**: Automatically removes marketing terms, quantities, brand modifiers, and other noise from product names to improve analysis accuracy

### Sustainability Reporting

-   Generates environmental impact reports for detected or searched food products
-   Opens detailed reports in new tabs for comprehensive sustainability analysis
-   Provides confidence scoring for product detection accuracy

### User Experience Features

-   **Interactive Tutorial**: First-time user onboarding with guided tour of features
-   **Auto-popup Control**: Toggle automatic product detection notifications
-   **Fuzzy Matching**: Intelligent food page detection to activate only on relevant websites
-   **Real-time Processing**: Live product detection as you browse with minimal performance impact

## Setup Instructions

### Prerequisites

-   Node.js 18 or higher
-   npm or yarn package manager
-   Chrome or Chromium-based browser for testing

### Development Setup

1. **Clone and Navigate**

    ```bash
    git clone <repository-url>
    cd frontend/EcoLens
    ```

2. **Install Dependencies**

    ```bash
    npm install
    ```

3. **Environment Variables Setup**

    Create a `.env` file in the root directory (`frontend/EcoLens/.env`) and configure the required environment variables:

    ```bash
    # API Configuration
    VITE_API_BASE_URL= api_link
    ```

    **Environment Variables:**

    - `VITE_API_BASE_URL`: Base URL for the EcoLens API backend (required for product sustainability analysis)

    **Example .env file:**

    ```env
    VITE_API_BASE_URL=http://localhost:8000
    ```

    > **Note**: The `.env` file is gitignored for security. Make sure to set up your own `.env` file with the appropriate API endpoint for your development or production environment.

4. **Development Build**

    ```bash
    npm run dev
    ```

    This starts the Vite development server, but note that for extension testing you'll need the production build.

5. **Production Build**
    ```bash
    npm run build
    ```
    This creates the `dist/` directory with the compiled extension files.

### Browser Extension Installation

1. **Build the Extension**

    ```bash
    npm run build
    ```

2. **Load in Chrome**

    - Open Chrome and navigate to `chrome://extensions/`
    - Enable "Developer mode" (toggle in top right)
    - Click "Load unpacked"
    - Select the `dist/` folder from your project directory

3. **Test the Extension**
    - Click the EcoLens icon in your browser toolbar to open the popup
    - Visit food shopping websites to test automatic detection
    - Try manual searches through the popup interface

### Project Structure

```
src/
├── App.tsx                 # Main popup interface component
├── contentScript.ts        # Injected script for product detection
├── background.ts           # Service worker for extension coordination
├── components/             # Reusable UI components
├── utils/                  # Utility functions and helpers
├── types/                  # TypeScript type definitions
└── data/                   # Static data and configurations

public/
├── manifest.json           # Extension manifest configuration
└── vite.svg               # Extension icon
```

### Development Commands

```bash
# Start development server (for UI development)
npm run dev

# Build for production/extension testing
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

### Configuration Files

-   `manifest.json`: Defines extension permissions, content scripts, and metadata
-   `vite.config.ts`: Build configuration with Chrome extension optimizations
-   `tailwind.config.js`: UI styling configuration
-   `tsconfig.json`: TypeScript compiler settings

### Key Technologies

-   **React 19** with TypeScript for popup interface
-   **Tailwind CSS** for styling with Radix UI components
-   **Vite** for fast development and optimized builds
-   **Chrome Extensions Manifest V3** for modern extension architecture
-   **Content Scripts** for webpage integration and product detection
-   **Natural Language Processing** libraries for product name cleaning

### Browser Compatibility

EcoLens is built for Chromium-based browsers using Manifest V3:

-   Chrome 88+
-   Edge 88+
-   Brave
-   Other Chromium-based browsers

For Firefox compatibility, additional manifest configuration would be required.
