import { Component } from '@angular/core';

@Component({
  selector: 'app-font-demo',
  standalone: true,
  imports: [],
  template: `
    <div class="font-demo">
      <h1 class="display-text">Inter Font Demo</h1>
      
      <section class="font-weights">
        <h2>Font Weights</h2>
        <p class="font-thin">Thin weight (100) - Ultra light text</p>
        <p class="font-extralight">Extra Light weight (200) - Very light text</p>
        <p class="font-light">Light weight (300) - Light text</p>
        <p class="font-regular">Regular weight (400) - Default body text</p>
        <p class="font-medium">Medium weight (500) - Emphasis text</p>
        <p class="font-semibold">Semibold weight (600) - Strong emphasis</p>
        <p class="font-bold">Bold weight (700) - Headings and highlights</p>
        <p class="font-extrabold">Extra Bold weight (800) - Heavy headings</p>
        <p class="font-black">Black weight (900) - Maximum emphasis</p>
      </section>

      <section class="font-sizes">
        <h2>Font Sizes</h2>
        <p class="text-xs">Extra Small (12px) - Captions and fine print</p>
        <p class="text-sm">Small (14px) - Secondary text</p>
        <p class="text-base">Base (16px) - Default body text</p>
        <p class="text-lg">Large (18px) - Enhanced readability</p>
        <p class="text-xl">Extra Large (20px) - Subheadings</p>
        <p class="text-2xl">2XL (24px) - Section headings</p>
        <p class="text-3xl">3XL (30px) - Page headings</p>
        <p class="text-4xl">4XL (36px) - Main titles</p>
        <p class="text-5xl">5XL (48px) - Hero text</p>
        <p class="text-6xl">6XL (60px) - Display text</p>
      </section>

      <section class="line-heights">
        <h2>Line Heights</h2>
        <p class="leading-tight">Tight line height (1.25) - Compact text</p>
        <p class="leading-snug">Snug line height (1.375) - Balanced text</p>
        <p class="leading-normal">Normal line height (1.5) - Standard text</p>
        <p class="leading-relaxed">Relaxed line height (1.625) - Comfortable reading</p>
        <p class="leading-loose">Loose line height (2) - Spacious text</p>
      </section>

      <section class="typography-examples">
        <h2>Typography Examples</h2>
        <h1 class="heading-1">Heading 1 - Main Page Title</h1>
        <h2 class="heading-2">Heading 2 - Section Title</h2>
        <h3 class="heading-3">Heading 3 - Subsection Title</h3>
        <p class="body-text-large">This is large body text for enhanced readability and better user experience.</p>
        <p class="body-text">This is standard body text that provides the main content of your application.</p>
        <p class="caption">This is caption text for smaller details and metadata.</p>
      </section>

      <section class="font-features">
        <h2>Font Features</h2>
        <p><strong>Inter</strong> is a variable font family carefully crafted for computer screens.</p>
        <p>Features include:</p>
        <ul>
          <li>Variable font with 9 weights (100-900)</li>
          <li>Optimized for screen readability</li>
          <li>Tall x-height for better legibility</li>
          <li>OpenType features for professional typography</li>
          <li>Free and open source</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .font-demo {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: 'Inter', sans-serif;
    }

    .display-text {
      font-size: 3rem;
      font-weight: 900;
      text-align: center;
      margin-bottom: 3rem;
      color: #1a1a1a;
    }

    section {
      margin-bottom: 3rem;
      padding: 2rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      color: #2c3e50;
    }

    p {
      margin: 0.5rem 0;
      color: #34495e;
    }

    .font-weights p {
      font-size: 1.1rem;
    }

    .font-sizes p {
      font-weight: 500;
    }

    .line-heights p {
      font-size: 1rem;
      font-weight: 400;
    }

    .typography-examples h1 {
      font-size: 2.5rem;
      font-weight: 900;
      margin: 1rem 0;
      color: #1a1a1a;
    }

    .typography-examples h2 {
      font-size: 2rem;
      font-weight: 700;
      margin: 1rem 0;
      color: #2c3e50;
    }

    .typography-examples h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 1rem 0;
      color: #34495e;
    }

    .body-text-large {
      font-size: 1.125rem;
      line-height: 1.625;
      margin: 1rem 0;
    }

    .body-text {
      font-size: 1rem;
      line-height: 1.5;
      margin: 1rem 0;
    }

    .caption {
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 1rem 0;
      color: #7f8c8d;
    }

    .font-features ul {
      margin: 1rem 0;
      padding-left: 1.5rem;
    }

    .font-features li {
      margin: 0.5rem 0;
      line-height: 1.6;
    }

    strong {
      font-weight: 700;
    }
  `]
})
export class FontDemoComponent {}