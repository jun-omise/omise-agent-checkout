# Design System Documentation

Complete guide to the Omise Agent Checkout Design System - a comprehensive, adaptable design system built for flexibility and consistency.

## Overview

The design system provides:
- **Design Tokens**: Colors, typography, spacing, shadows
- **Component Library**: Pre-built UI components
- **Theme System**: Multiple themes with easy customization
- **Utility Classes**: Rapid development with utility-first CSS
- **JavaScript Utilities**: Helper functions for common tasks

## Quick Start

### Include in Your HTML

```html
<link rel="stylesheet" href="/design-system.css">
<link rel="stylesheet" href="/components.css">
<script src="/design-system.js"></script>
```

### Initialize

```javascript
const designSystem = new DesignSystem();
```

## Design Tokens

Design tokens are the foundation of the system. They define consistent values for colors, typography, spacing, and more.

### Color System

#### Primary Colors

```css
--color-primary-50   to   --color-primary-900
```

Light to dark shades of the primary color (blue by default).

#### Secondary Colors

```css
--color-secondary-50   to   --color-secondary-900
```

Light to dark shades of the secondary color (teal by default).

#### Neutral Colors

```css
--color-neutral-0    /* Pure white */
--color-neutral-50   /* Lightest gray */
/* ... */
--color-neutral-900  /* Almost black */
```

#### Semantic Colors

```css
--color-success: #4caf50;  /* Green for success states */
--color-warning: #ff9800;  /* Orange for warnings */
--color-error: #f44336;    /* Red for errors */
--color-info: #2196f3;     /* Blue for information */
```

### Typography

#### Font Families

```css
--font-family-base: System font stack
--font-family-heading: Same as base
--font-family-mono: Monospace stack
```

#### Font Sizes

```css
--font-size-xs: 0.75rem;   /* 12px */
--font-size-sm: 0.875rem;  /* 14px */
--font-size-base: 1rem;    /* 16px */
--font-size-lg: 1.125rem;  /* 18px */
--font-size-xl: 1.25rem;   /* 20px */
--font-size-2xl: 1.5rem;   /* 24px */
--font-size-3xl: 1.875rem; /* 30px */
--font-size-4xl: 2.25rem;  /* 36px */
--font-size-5xl: 3rem;     /* 48px */
```

#### Font Weights

```css
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Spacing Scale

Consistent spacing based on 4px grid:

```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-20: 5rem;    /* 80px */
--space-24: 6rem;    /* 96px */
```

### Border Radius

```css
--radius-sm: 0.25rem;   /* 4px - Small elements */
--radius-base: 0.5rem;  /* 8px - Default */
--radius-md: 0.75rem;   /* 12px - Medium */
--radius-lg: 1rem;      /* 16px - Large cards */
--radius-xl: 1.5rem;    /* 24px - Extra large */
--radius-full: 9999px;  /* Fully rounded */
```

### Shadows

```css
--shadow-xs: Subtle shadow
--shadow-sm: Small shadow
--shadow-base: Default shadow
--shadow-md: Medium shadow
--shadow-lg: Large shadow
--shadow-xl: Extra large shadow
```

## Theming

### Available Themes

1. **Default** - Clean, professional blue theme
2. **Dark** - Dark mode with high contrast
3. **Omise** - Omise brand colors
4. **Purple** - Purple gradient theme

### Using Themes

```javascript
const ds = new DesignSystem();

// Set theme
ds.setTheme('dark');
ds.setTheme('omise');
ds.setTheme('purple');

// Get current theme
const current = ds.getTheme();

// Toggle between light and dark
ds.toggleTheme();
```

### Creating Custom Themes

Add to `design-system.css`:

```css
[data-theme="my-brand"] {
  --theme-background: #f5f7fa;
  --theme-surface: #ffffff;
  --theme-primary: #your-brand-color;
  --theme-primary-hover: #darker-shade;
  --theme-secondary: #your-secondary;
  --theme-text-primary: #333333;
  --theme-text-secondary: #666666;
  --theme-text-disabled: #999999;
  --theme-border: #e0e0e0;
  --theme-divider: #f0f0f0;
}
```

Then use it:

```javascript
ds.setTheme('my-brand');
```

## Components

### Buttons

```html
<!-- Variants -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-ghost">Ghost</button>

<!-- Sizes -->
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary">Default</button>
<button class="btn btn-primary btn-lg">Large</button>

<!-- States -->
<button class="btn btn-primary" disabled>Disabled</button>

<!-- Full width -->
<button class="btn btn-primary btn-full">Full Width</button>
```

### Cards

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <p class="card-description">Optional description</p>
  </div>
  <div class="card-body">
    <p>Card content goes here</p>
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">Action</button>
  </div>
</div>
```

### Form Elements

```html
<div class="form-group">
  <label class="form-label">Email Address</label>
  <input type="email" class="input" placeholder="you@example.com">
  <span class="form-hint">We'll never share your email</span>
</div>

<!-- With error -->
<div class="form-group">
  <label class="form-label">Field Label</label>
  <input type="text" class="input input-error" value="invalid">
  <span class="form-error">This field is required</span>
</div>
```

### Badges

```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-error">Error</span>
```

### Alerts

```html
<div class="alert alert-success">
  <strong>Success!</strong> Your action was completed.
</div>

<div class="alert alert-info">
  <strong>Info:</strong> Here's some information.
</div>

<div class="alert alert-warning">
  <strong>Warning:</strong> Please be careful.
</div>

<div class="alert alert-error">
  <strong>Error:</strong> Something went wrong.
</div>
```

### Loading States

```html
<!-- Spinner -->
<div class="spinner"></div>
<div class="spinner spinner-lg"></div>

<!-- Progress Bar -->
<div class="progress">
  <div class="progress-bar" style="width: 65%"></div>
</div>

<!-- Striped Progress -->
<div class="progress">
  <div class="progress-bar progress-bar-striped" style="width: 45%"></div>
</div>

<!-- Skeleton -->
<div class="skeleton skeleton-title"></div>
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-avatar"></div>
```

## JavaScript Utilities

### Notifications

```javascript
// Show notification
DesignSystem.showNotification(message, type, duration);

// Examples
DesignSystem.showNotification('Success!', 'success');
DesignSystem.showNotification('Error occurred', 'error');
DesignSystem.showNotification('Warning!', 'warning', 5000);
DesignSystem.showNotification('Info message', 'info');
```

### Modals

```javascript
// Create modal
DesignSystem.createModal(title, content, options);

// Example
DesignSystem.createModal(
  'Confirm Payment',
  '<p>Are you sure you want to process this payment?</p>',
  {
    footer: `
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="processPayment()">Confirm</button>
    `
  }
);
```

### Formatting

```javascript
// Format currency
DesignSystem.formatCurrency(100000, 'THB');
// Returns: "฿1,000.00"

DesignSystem.formatCurrency(5000, 'USD');
// Returns: "$50.00"
```

### Validation

```javascript
// Email validation
DesignSystem.validateEmail('user@example.com');
// Returns: true

// Card number validation (Luhn algorithm)
DesignSystem.validateCardNumber('4242424242424242');
// Returns: true

// Format card number
DesignSystem.formatCardNumber('4242424242424242');
// Returns: "4242 4242 4242 4242"

// Get card type
DesignSystem.getCardType('4242424242424242');
// Returns: "visa"
```

### Clipboard

```javascript
// Copy to clipboard
await DesignSystem.copyToClipboard('Text to copy');
// Shows success notification
```

### Debounce

```javascript
// Debounce function calls
const debouncedSearch = DesignSystem.debounce((query) => {
  console.log('Searching for:', query);
}, 300);

input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

## Utility Classes

### Typography

```html
<!-- Font sizes -->
<p class="text-xs">Extra small text</p>
<p class="text-sm">Small text</p>
<p class="text-base">Base text</p>
<p class="text-lg">Large text</p>
<p class="text-xl">Extra large text</p>
<p class="text-2xl">2X large text</p>

<!-- Font weights -->
<p class="font-light">Light weight</p>
<p class="font-normal">Normal weight</p>
<p class="font-medium">Medium weight</p>
<p class="font-semibold">Semibold</p>
<p class="font-bold">Bold</p>

<!-- Text alignment -->
<p class="text-left">Left aligned</p>
<p class="text-center">Center aligned</p>
<p class="text-right">Right aligned</p>

<!-- Text colors -->
<p class="text-primary">Primary text color</p>
<p class="text-secondary">Secondary text color</p>
<p class="text-disabled">Disabled text color</p>
```

### Spacing

```html
<!-- Margin top -->
<div class="mt-1">Margin top 4px</div>
<div class="mt-2">Margin top 8px</div>
<div class="mt-4">Margin top 16px</div>

<!-- Margin bottom -->
<div class="mb-2">Margin bottom 8px</div>
<div class="mb-4">Margin bottom 16px</div>

<!-- Padding -->
<div class="p-2">Padding 8px</div>
<div class="p-4">Padding 16px</div>
<div class="p-6">Padding 24px</div>
```

### Layout

```html
<!-- Flexbox -->
<div class="flex">Flex container</div>
<div class="flex flex-col">Flex column</div>
<div class="flex items-center">Center items</div>
<div class="flex justify-between">Space between</div>
<div class="flex gap-4">Gap 16px</div>

<!-- Grid -->
<div class="grid grid-cols-2">2 columns</div>
<div class="grid md:grid-cols-3">3 columns on medium+</div>
```

### Border Radius

```html
<div class="rounded">Default radius</div>
<div class="rounded-lg">Large radius</div>
<div class="rounded-full">Fully rounded</div>
```

### Shadows

```html
<div class="shadow-sm">Small shadow</div>
<div class="shadow">Default shadow</div>
<div class="shadow-md">Medium shadow</div>
<div class="shadow-lg">Large shadow</div>
```

## Responsive Design

### Breakpoints

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### Responsive Utilities

```html
<!-- Hidden on mobile -->
<div class="md:hidden">Hidden on medium and up</div>

<!-- Show on mobile, hide on desktop -->
<div class="block md:hidden">Mobile only</div>

<!-- Hide on mobile, show on desktop -->
<div class="hidden md:block">Desktop only</div>

<!-- Responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <!-- 1 column mobile, 2 tablet, 3 desktop -->
</div>
```

## Accessibility

### Focus States

All interactive elements have accessible focus states:

```css
.btn:focus-visible {
  outline: 2px solid var(--theme-primary);
  outline-offset: 2px;
}
```

### ARIA Labels

Always include ARIA labels for buttons without text:

```html
<button class="theme-switcher-button" aria-label="Switch theme">
  🎨
</button>
```

### Color Contrast

All color combinations meet WCAG AA standards for contrast.

## Best Practices

### 1. Use Design Tokens

Instead of hardcoded values:

```css
/* ❌ Don't do this */
.my-element {
  color: #1976d2;
  padding: 16px;
}

/* ✅ Do this */
.my-element {
  color: var(--theme-primary);
  padding: var(--space-4);
}
```

### 2. Use Components

Instead of recreating styles:

```html
<!-- ❌ Don't do this -->
<div style="background: white; padding: 20px; border-radius: 8px;">
  Content
</div>

<!-- ✅ Do this -->
<div class="card">
  <div class="card-body">
    Content
  </div>
</div>
```

### 3. Theme Consistency

When creating custom themes, maintain consistency:

```css
[data-theme="custom"] {
  /* Define all theme variables */
  --theme-background: /* ... */;
  --theme-surface: /* ... */;
  --theme-primary: /* ... */;
  /* Don't skip any! */
}
```

### 4. Responsive First

Design for mobile first, then enhance:

```html
<!-- ✅ Mobile first approach -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  <!-- Starts with 1 column, expands on larger screens -->
</div>
```

## Examples

### Payment Method Card

```html
<div class="card">
  <div class="card-body">
    <div class="flex items-center gap-4">
      <span style="font-size: var(--font-size-3xl);">💳</span>
      <div class="flex-1">
        <h3 class="font-semibold">Credit Card</h3>
        <p class="text-sm text-secondary">Visa, Mastercard, Amex</p>
      </div>
      <button class="btn btn-primary btn-sm">Select</button>
    </div>
  </div>
</div>
```

### Order Summary

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Order Summary</h3>
  </div>
  <div class="card-body">
    <div class="flex justify-between mb-2">
      <span>Subtotal</span>
      <span>$100.00</span>
    </div>
    <div class="flex justify-between mb-2">
      <span>Tax</span>
      <span>$10.00</span>
    </div>
  </div>
  <div class="card-footer">
    <div class="flex justify-between font-bold text-lg">
      <span>Total</span>
      <span class="text-primary">$110.00</span>
    </div>
  </div>
</div>
```

## Design Showcase

View all components in action at `/design-showcase.html`

---

For more examples and tutorials, see:
- [Tutorial](TUTORIAL.md)
- [Examples](EXAMPLES.md)
- [Quick Start](QUICKSTART.md)
