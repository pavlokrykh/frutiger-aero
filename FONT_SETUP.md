# Aeonik Font Setup Guide

This guide explains how to use the Aeonik font in your Angular application.

## What's Been Added

1. **Font Configuration File** (`src/assets/styles/_fonts.scss`)
   - Font family variables
   - Font weight variables (300, 400, 500, 600, 700)
   - Font size variables (xs to 4xl)
   - Line height variables
   - Utility classes and mixins

2. **Updated Main Styles** (`src/styles.scss`)
   - Imports the fonts configuration
   - Applies Aeonik as the default font family

3. **Demo Component** (`src/app/font-demo/font-demo.component.ts`)
   - Showcases all font weights, sizes, and line heights
   - Provides usage examples

## Current Setup

The application currently uses **Inter** as a fallback font since Aeonik is a commercial font. If you have the commercial Aeonik font files, you can replace Inter with Aeonik.

## How to Use

### 1. Basic Font Usage

The Aeonik font is automatically applied to all text in your application. You can override it using utility classes:

```html
<!-- Font weights -->
<p class="font-light">Light text</p>
<p class="font-regular">Regular text</p>
<p class="font-medium">Medium text</p>
<p class="font-semibold">Semibold text</p>
<p class="font-bold">Bold text</p>

<!-- Font sizes -->
<p class="text-xs">Extra small</p>
<p class="text-sm">Small</p>
<p class="text-base">Base size</p>
<p class="text-lg">Large</p>
<p class="text-xl">Extra large</p>
<p class="text-2xl">2XL</p>
<p class="text-3xl">3XL</p>
<p class="text-4xl">4XL</p>

<!-- Line heights -->
<p class="leading-tight">Tight spacing</p>
<p class="leading-normal">Normal spacing</p>
<p class="leading-relaxed">Relaxed spacing</p>
```

### 2. Using SCSS Mixins

In your component styles, you can use the provided mixins:

```scss
.my-component {
  @include font-aeonik($font-weight-medium, $font-size-lg, $line-height-normal);
}

.heading {
  @include font-heading;
}

.body-text {
  @include font-body;
}

.caption {
  @include font-caption;
}
```

### 3. Using CSS Variables

You can also use CSS custom properties:

```scss
.my-text {
  font-family: var(--font-aeonik);
  font-weight: var(--font-weight-medium);
}
```

## Adding Commercial Aeonik Font

If you have the commercial Aeonik font files:

1. **Place font files** in `src/assets/fonts/` directory
2. **Update the fonts partial** (`src/assets/styles/_fonts.scss`):

```scss
// Replace the Inter import with Aeonik font-face declarations
@font-face {
  font-family: 'Aeonik';
  src: url('../fonts/Aeonik-Regular.woff2') format('woff2'),
       url('../fonts/Aeonik-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Aeonik';
  src: url('../fonts/Aeonik-Medium.woff2') format('woff2'),
       url('../fonts/Aeonik-Medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

// Add more weights as needed...

// Update the font family variable
$font-aeonik: 'Aeonik', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

## Font Weights Available

- **300 (Light)**: Subtle text, captions
- **400 (Regular)**: Default body text
- **500 (Medium)**: Emphasis, buttons
- **600 (Semibold)**: Strong emphasis, subheadings
- **700 (Bold)**: Headings, highlights

## Font Sizes Available

- **xs**: 12px - Captions, fine print
- **sm**: 14px - Secondary text
- **base**: 16px - Default body text
- **lg**: 18px - Enhanced readability
- **xl**: 20px - Subheadings
- **2xl**: 24px - Section headings
- **3xl**: 30px - Page titles
- **4xl**: 36px - Hero text

## Best Practices

1. **Use consistent font weights** throughout your application
2. **Limit font sizes** to maintain hierarchy
3. **Test readability** at different screen sizes
4. **Use appropriate line heights** for content length
5. **Maintain contrast ratios** for accessibility

## Testing the Font

To see the font in action, you can:

1. **Run the application**: `ng serve`
2. **Navigate to the demo component** (if added to routing)
3. **Inspect elements** in browser dev tools to see applied fonts

## Troubleshooting

- **Font not loading**: Check if the Google Fonts URL is accessible
- **Font not applying**: Ensure the fonts partial is imported in `styles.scss`
- **Build errors**: Verify SCSS syntax and file paths

## Next Steps

1. **Customize font sizes** and weights as needed
2. **Add more font variants** (italic, condensed, etc.)
3. **Create component-specific font styles**
4. **Implement responsive typography** using media queries