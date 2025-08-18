import { Component } from '@angular/core';

@Component({
  selector: 'app-font-demo',
  standalone: true,
  imports: [],
  template: `
    <div class="font-demo">
      <h1 class="display-text">Aeonik Font Demo</h1>
      
      <section class="font-weights">
        <h2>Font Weights</h2>
        <p class="font-light">Light weight (300) - Perfect for subtle text</p>
        <p class="font-regular">Regular weight (400) - Default body text</p>
        <p class="font-medium">Medium weight (500) - Emphasis text</p>
        <p class="font-semibold">Semibold weight (600) - Strong emphasis</p>
        <p class="font-bold">Bold weight (700) - Headings and highlights</p>
      </section>

      <section class="font-sizes">
        <h2>Font Sizes</h2>
        <p class="text-xs">Extra Small (12px) - Captions and fine print</p>
        <p class="text-sm">Small (14px) - Secondary text</p>
        <p class="text-base">Base (16px) - Default body text</p>
        <p class="text-lg">Large (18px) - Enhanced readability</p>
        <p class="text-xl">Extra Large (20px) - Subheadings</p>
        <p class="text-2xl">2XL (24px) - Section headings</p>
        <p class="text-3xl">3XL (30px) - Page titles</p>
        <p class="text-4xl">4XL (36px) - Hero text</p>
      </section>

      <section class="line-heights">
        <h2>Line Heights</h2>
        <p class="leading-tight">Tight line height (1.25) - Good for headings and short text</p>
        <p class="leading-normal">Normal line height (1.5) - Standard for body text</p>
        <p class="leading-relaxed">Relaxed line height (1.75) - Better for long-form content</p>
      </section>

      <section class="usage-examples">
        <h2>Usage Examples</h2>
        <div class="card">
          <h3 class="card-title">Card Title</h3>
          <p class="card-body">This is a sample card with Aeonik font. The text should be clean and readable.</p>
          <button class="card-button">Action Button</button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .font-demo {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: var(--font-aeonik, 'Inter', sans-serif);
    }

    .display-text {
      font-size: 2.5rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 3rem;
      color: #333;
    }

    section {
      margin-bottom: 3rem;
      padding: 1.5rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #444;
    }

    p {
      margin: 0.5rem 0;
      color: #666;
    }

    .card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #333;
    }

    .card-body {
      margin-bottom: 1rem;
      color: #555;
    }

    .card-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .card-button:hover {
      background: #0056b3;
    }
  `]
})
export class FontDemoComponent {}