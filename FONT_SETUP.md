# Inter Font Setup Guide

This guide explains how to use the Inter font in your Angular application.

## About Inter Font

**Inter** is a variable font family carefully crafted for computer screens. It features:
- 9 font weights (100-900)
- Optimized for screen readability
- Tall x-height for better legibility
- OpenType features for professional typography
- **Free and open source** (unlike Aeonik which is commercial)

## Why Inter Instead of Aeonik?

Aeonik is a commercial font family that requires licensing. Inter provides a similar modern, clean aesthetic and is:
- ✅ Free to use
- ✅ Optimized for screens
- ✅ Professional quality
- ✅ Legally safe for commercial projects

## What's Been Added

1. **Font Configuration File** (`src/assets/styles/_fonts.scss`)
   - Font family variables
   - Font weight variables (100-900)
   - Font size variables (xs to 6xl)
   - Line height variables
   - Utility classes and mixins

2. **Updated Main Styles** (`src/styles.scss`)
   - Imports the fonts configuration
   - Applies Inter as the default font family

3. **Demo Component** (`src/app/font-demo/font-demo.component.ts`)
   - Showcases all font weights, sizes, and line heights
   - Provides usage examples

## Current Setup

The application now uses **Inter** as the primary font, loaded from Google Fonts. This provides:
- Excellent readability on all devices
- Professional appearance
- Consistent typography system
- No licensing concerns

## Usage Examples

### Font Weights
```scss
.font-thin { font-weight: 100; }      // Ultra light
.font-extralight { font-weight: 200; } // Very light
.font-light { font-weight: 300; }      // Light
.font-regular { font-weight: 400; }    // Regular
.font-medium { font-weight: 500; }     // Medium
.font-semibold { font-weight: 600; }   // Semibold
.font-bold { font-weight: 700; }       // Bold
.font-extrabold { font-weight: 800; }  // Extra bold
.font-black { font-weight: 900; }      // Black
```

### Font Sizes
```scss
.text-xs { font-size: 0.75rem; }    // 12px
.text-sm { font-size: 0.875rem; }   // 14px
.text-base { font-size: 1rem; }     // 16px
.text-lg { font-size: 1.125rem; }   // 18px
.text-xl { font-size: 1.25rem; }    // 20px
.text-2xl { font-size: 1.5rem; }    // 24px
.text-3xl { font-size: 1.875rem; }  // 30px
.text-4xl { font-size: 2.25rem; }   // 36px
.text-5xl { font-size: 3rem; }      // 48px
.text-6xl { font-size: 3.75rem; }   // 60px
```

### Line Heights
```scss
.leading-tight { line-height: 1.25; }     // Compact
.leading-snug { line-height: 1.375; }     // Balanced
.leading-normal { line-height: 1.5; }     // Standard
.leading-relaxed { line-height: 1.625; }  // Comfortable
.leading-loose { line-height: 2; }        // Spacious
```

### Typography Mixins
```scss
@include heading-1;      // Main page titles
@include heading-2;      // Section titles
@include heading-3;      // Subsection titles
@include body-text;      // Standard body text
@include body-text-large; // Enhanced body text
@include caption;         // Caption text
```

## Viewing the Demo

Navigate to `/font-demo` in your application to see all font weights, sizes, and examples in action.

## If You Want to Use Aeonik Later

If you obtain a commercial license for Aeonik font:

1. Download the font files (.woff2, .woff, .ttf)
2. Place them in `src/assets/fonts/`
3. Update `_fonts.scss` to use `@font-face` declarations
4. Replace `$font-primary` with your Aeonik font family

## Browser Support

Inter font supports:
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Variable font support for advanced features
- ✅ Fallback to system fonts for older browsers

## Performance

- Font files are loaded from Google Fonts CDN
- Optimized for fast loading
- Includes only the weights you need
- Automatic font-display: swap for better performance