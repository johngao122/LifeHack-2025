# EcoLens Frontend Architecture

## Overview

EcoLens is a browser extension built with React 19, TypeScript, and Tailwind CSS that analyzes the environmental impact of food products. The extension operates in two modes: automatic detection while browsing food websites and manual search through the popup interface.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup UI      │    │  Content Script │    │ Background SW        │
│   (React App)   │◄──►│  (Detection)    │◄──►│ (Coordination)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Chrome Storage  │    │   Web Pages     │    │   Report Tab    │
│   (Settings)    │    │ (Product Data)  │    │ (Analysis UI)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │   EcoLens API   │
                    │  (Sustainability│
                    │    Analysis)    │
                    └─────────────────┘
```

## Core Components

### 1. Popup Interface (`src/App.tsx`)

-   **Purpose**: Primary user interaction point
-   **Responsibilities**:
    -   Manual product search
    -   Settings management
    -   User onboarding (tutorial)
    -   Search result display
-   **Key Features**:
    -   React Joyride tutorial system
    -   Auto-popup preference management
    -   Real-time content script communication

### 2. Content Script (`src/contentScript.ts`)

-   **Purpose**: Product detection and user interaction on web pages
-   **Responsibilities**:
    -   Multi-strategy product extraction
    -   Food page detection via fuzzy matching
    -   Dynamic UI injection (popups, notifications)
    -   Product validation and editing interfaces
-   **Detection Strategies**:
    -   JSON-LD structured data (highest confidence)
    -   Meta tag extraction (fallback)
    -   DOM selector matching (lowest confidence)

### 3. Background Service Worker (`src/background.ts`)

-   **Purpose**: Extension coordination and tab management
-   **Responsibilities**:
    -   Report tab creation
    -   Message routing between components
    -   Extension lifecycle management

### 4. Sustainability Report (`src/components/ProductSustainabilityReport.tsx`)

-   **Purpose**: Comprehensive product analysis visualization
-   **Responsibilities**:
    -   Environmental score display
    -   Carbon footprint visualization
    -   Packaging material analysis
    -   Eco-friendly recommendations

## Data Flow

### Manual Search Flow

1. User enters product name in popup
2. Product name cleaned via `productCleaner.ts`
3. API call to backend for sustainability data
4. Results stored in Chrome storage
5. Report tab opened with detailed analysis

### Automatic Detection Flow

1. Content script scans page for products
2. Food page detection via `fuzzyMatcher.ts`
3. Multi-strategy product extraction
4. User validation popup if products found
5. API analysis and report generation on user confirmation

## Utility Modules

### Product Processing (`src/utils/`)

#### `api.ts`

-   API communication with EcoLens backend
-   Data transformation and formatting
-   Recycling code parsing
-   Carbon footprint calculations

#### `productCleaner.ts`

-   Product name normalization
-   Marketing term removal
-   Brand extraction
-   Category classification

#### `fuzzyMatcher.ts`

-   Food page detection algorithms
-   USDA food database matching
-   Semantic product matching

## UI Component System

### Base Components (`src/components/ui/`)

Built on Radix UI primitives with Tailwind CSS styling:

-   `card.tsx`: Container components with consistent styling
-   `button.tsx`: Interactive elements with variants
-   `badge.tsx`: Status and grade indicators
-   `progress.tsx`: Score visualization
-   `accordion.tsx`: Expandable content sections
-   `dialog.tsx`: Modal interactions
-   `switch.tsx`: Settings toggles

### Styling Architecture

-   **Tailwind CSS**: Utility-first styling
-   **Radix UI**: Accessible component primitives
-   **Framer Motion**: Smooth animations
-   **Custom Design System**: Consistent color and spacing scales

## Extension Configuration

### Manifest V3 Structure

```json
{
    "manifest_version": 3,
    "content_scripts": [
        {
            "matches": ["<all_urls>"],
            "js": ["contentScript.js"]
        }
    ],
    "background": {
        "service_worker": "background.js"
    },
    "action": {
        "default_popup": "index.html"
    }
}
```

### Permissions

-   `storage`: User preferences and data persistence
-   `tabs`: Report tab creation and management
-   `activeTab`: Current page product detection

## Build System

### Vite Configuration

-   TypeScript compilation
-   React JSX transformation
-   Extension-specific optimizations
-   Development server for UI testing
-   Production builds for extension packaging

### Key Build Features

-   Code splitting for optimal loading
-   Asset optimization and compression
-   Chrome extension compatibility
-   Source map generation for debugging

## Data Storage Strategy

### Chrome Storage Usage

-   **sync**: User preferences (auto-popup settings, tutorial completion)
-   **local**: Temporary data (product analysis, recommendations)
-   **session**: UI state (current detection status)

## Performance Optimizations

### Content Script

-   Debounced page scanning
-   Lazy loading of heavy analysis functions
-   Efficient DOM querying with early termination
-   Smart retry logic for dynamic content

### Popup Interface

-   Lazy API imports
-   Memoized calculations
-   Efficient state updates
-   Component cleanup

### Report Interface

-   Progressive data loading
-   Optimized re-renders
-   Image lazy loading
-   Memory-efficient visualizations

## Error Handling Strategy

### Graceful Degradation

-   Fallback detection methods
-   Default values for missing data
-   User feedback for failures
-   Comprehensive error logging

### User Experience

-   Loading states for all async operations
-   Clear error messages
-   Manual correction interfaces
-   Retry mechanisms

## Security Considerations

### Content Security Policy

-   Strict CSP for popup and report pages
-   Sanitized dynamic content injection
-   Secure API communication

### Data Privacy

-   Local data processing where possible
-   Minimal data transmission
-   User consent for analysis
-   Clear data usage policies

## Development Workflow

### Local Development

1. `npm install` - Install dependencies
2. `npm run dev` - Start development server
3. `npm run build` - Create extension build
4. Load unpacked extension in Chrome
5. Test on various food websites

### Code Quality

-   TypeScript for type safety
-   ESLint for code standards
-   Prettier for consistent formatting
-   Git hooks for pre-commit validation

## Extension Distribution

### Build Process

-   Production optimization
-   Asset bundling
-   Manifest validation
-   Extension packaging

### Testing Strategy

-   Unit tests for utility functions
-   Integration tests for API communication
-   Manual testing across websites
-   Performance monitoring
