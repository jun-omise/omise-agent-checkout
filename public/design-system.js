// Design System Utilities
// JavaScript utilities for theme switching and component interactions

class DesignSystem {
  constructor() {
    this.currentTheme = this.getStoredTheme() || 'default';
    this.applyTheme(this.currentTheme);
  }

  /**
   * Get theme from localStorage
   */
  getStoredTheme() {
    return localStorage.getItem('omise-checkout-theme');
  }

  /**
   * Store theme in localStorage
   */
  storeTheme(theme) {
    localStorage.setItem('omise-checkout-theme', theme);
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    this.storeTheme(theme);
    this.dispatchThemeChange(theme);
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'default' : 'dark';
    this.applyTheme(newTheme);
  }

  /**
   * Set specific theme
   */
  setTheme(theme) {
    const validThemes = ['default', 'dark', 'omise', 'purple'];
    if (validThemes.includes(theme)) {
      this.applyTheme(theme);
    } else {
      console.warn(`Invalid theme: ${theme}. Valid themes are: ${validThemes.join(', ')}`);
    }
  }

  /**
   * Get current theme
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Dispatch theme change event
   */
  dispatchThemeChange(theme) {
    const event = new CustomEvent('themechange', { detail: { theme } });
    document.dispatchEvent(event);
  }

  /**
   * Create a notification/toast
   */
  static showNotification(message, type = 'info', duration = 3000) {
    const container = this.getNotificationContainer();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${this.getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
      </div>
      <button class="notification-close" aria-label="Close">×</button>
    `;

    // Add to container
    container.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('notification-show');
    });

    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }

    return notification;
  }

  /**
   * Get or create notification container
   */
  static getNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Remove notification with animation
   */
  static removeNotification(notification) {
    notification.classList.remove('notification-show');
    notification.classList.add('notification-hide');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }

  /**
   * Get icon for notification type
   */
  static getNotificationIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * Create modal
   */
  static createModal(title, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Show modal
    requestAnimationFrame(() => {
      modal.classList.add('modal-show');
    });

    // Close handlers
    const closeBtn = modal.querySelector('.modal-close');
    const closeModal = () => {
      modal.classList.remove('modal-show');
      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
      }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    return modal;
  }

  /**
   * Format amount with currency
   */
  static formatCurrency(amount, currency = 'THB') {
    const formatted = (amount / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const symbols = {
      THB: '฿',
      USD: '$',
      SGD: 'S$',
      JPY: '¥',
      EUR: '€'
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${formatted}`;
  }

  /**
   * Debounce function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Copied to clipboard!', 'success', 2000);
      return true;
    } catch (err) {
      this.showNotification('Failed to copy to clipboard', 'error', 2000);
      return false;
    }
  }

  /**
   * Validate email
   */
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Validate card number (Luhn algorithm)
   */
  static validateCardNumber(number) {
    const cleaned = number.replace(/\s/g, '');
    if (!/^\d+$/.test(cleaned)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Format card number with spaces
   */
  static formatCardNumber(number) {
    const cleaned = number.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ');
  }

  /**
   * Get card type from number
   */
  static getCardType(number) {
    const cleaned = number.replace(/\s/g, '');

    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      jcb: /^35/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleaned)) return type;
    }

    return 'unknown';
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DesignSystem;
}
