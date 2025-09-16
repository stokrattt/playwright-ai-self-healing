# 🚀 AI Self-Healing Library Integration Guide

## 📦 Installation

### 1. Copy library files
```bash
# Copy src/ folder to your project
cp -r src/ your-project/framework/ai-healing/

# Or create separate npm package
npm pack
npm install playwright-ai-self-healing-1.0.0.tgz
```

### 2. Install dependencies
```bash
npm install playwright levenshtein @types/node
```

## 🛠️ Framework Integration

### Option 1: Direct Import (Recommended)

#### Project structure:
```
framework/
├── ai/
│   ├── index.ts                  # Copied from src/index.ts
│   └── README.md
├── core/
│   ├── BasePage.ts              # Your base page class
│   └── BaseLocators.ts
└── ui/
    └── page-objects/
```

#### Integration in BasePage.ts:
```typescript
import { Page } from '@playwright/test';
import { PlaywrightAISelfHealing } from '../ai';

export class BasePage {
  protected page: Page;
  protected ai: PlaywrightAISelfHealing;

  constructor(page: Page) {
    this.page = page;
    this.ai = new PlaywrightAISelfHealing();
  }

  // Method for self-healing locators
  protected async findElementWithAI(selector: string, fallbackDescription?: string) {
    try {
      // First try normal selector
      const element = this.page.locator(selector);
      await element.waitFor({ timeout: 3000 });
      return element;
    } catch (error) {
      console.log(`🔧 [AI Self-Healing] Original selector failed: ${selector}`);
      
      // Use AI to find element
      const aiElement = await this.ai.findElementUniversal(this.page, selector, fallbackDescription);
      
      if (aiElement) {
        console.log(`✅ [AI Self-Healing] Element found with AI assistance`);
        return aiElement;
      }
      
      throw new Error(`Element not found even with AI assistance: ${selector}`);
    }
  }

  // Wrapper for clicks with AI
  protected async clickWithAI(selector: string, description?: string) {
    const element = await this.findElementWithAI(selector, description);
    await element.click();
  }

  // Wrapper for filling fields with AI
  protected async fillWithAI(selector: string, value: string, description?: string) {
    const element = await this.findElementWithAI(selector, description);
    await element.fill(value);
  }
}
```

### Option 2: Extending Existing Page Objects

#### Example LoginPage with AI:
```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from '../core/BasePage';

export class LoginPage extends BasePage {
  // Regular selectors (fallback)
  private readonly emailInput = '[data-testid="email-input"]';
  private readonly passwordInput = '[data-testid="password-input"]';
  private readonly loginButton = '[data-testid="login-button"]';

  constructor(page: Page) {
    super(page);
  }

  async login(email: string, password: string) {
    // Use AI self-healing for each element
    await this.fillWithAI(this.emailInput, email, 'email input field');
    await this.fillWithAI(this.passwordInput, password, 'password input field');
    await this.clickWithAI(this.loginButton, 'login submit button');
  }

  // Alternative method with explicit AI calls
  async loginWithExplicitAI(email: string, password: string) {
    // Email field
    let emailElement = await this.findElementWithAI(this.emailInput, 'email input field');
    await emailElement.fill(email);

    // Password field  
    let passwordElement = await this.findElementWithAI(this.passwordInput, 'password input field');
    await passwordElement.fill(password);

    // Login button
    let loginBtn = await this.findElementWithAI(this.loginButton, 'login submit button');
    await loginBtn.click();
  }
}
```

## 🎯 Integration in Existing Tests

### Example test with AI self-healing:
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../framework/ui/page-objects/LoginPage';

test.describe('Login Tests with AI Self-Healing', () => {
  test('should login successfully even with broken selectors', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await page.goto('/login');
    
    // AI will automatically find elements even if selectors change
    await loginPage.login('user@example.com', 'password123');
    
    // Verify successful login
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
  });

  test('should handle dynamic form elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await page.goto('/dynamic-login');
    
    // AI will find elements even with dynamic ID/classes
    await loginPage.loginWithExplicitAI('test@test.com', 'test123');
    
    await expect(page.url()).toContain('/dashboard');
  });
});
```

## ⚙️ AI Configuration

### Setting up thresholds and parameters:
```typescript
// In BasePage.ts or separate config file
export class AIConfig {
  static readonly SIMILARITY_THRESHOLD = 0.6;  // Similarity threshold
  static readonly MAX_ELEMENTS_TO_ANALYZE = 100; // Max elements to analyze
  static readonly ENABLE_VERBOSE_LOGGING = true; // Detailed logs
}

export class BasePage {
  protected async findElementWithAI(
    selector: string, 
    fallbackDescription?: string,
    threshold: number = AIConfig.SIMILARITY_THRESHOLD
  ) {
    // Your logic with custom threshold
  }
}
```

## 📊 Monitoring and Logging

### Adding detailed logging:
```typescript
export class BasePage {
  private aiUsageStats = {
    totalSelectors: 0,
    aiActivations: 0,
    successfulHealing: 0
  };

  protected async findElementWithAI(selector: string, fallbackDescription?: string) {
    this.aiUsageStats.totalSelectors++;
    
    try {
      const element = this.page.locator(selector);
      await element.waitFor({ timeout: 3000 });
      return element;
    } catch (error) {
      this.aiUsageStats.aiActivations++;
      console.log(`🔧 [AI] Selector failed: ${selector}`);
      
      const aiElement = await this.ai.findElementUniversal(this.page, selector, fallbackDescription);
      
      if (aiElement) {
        this.aiUsageStats.successfulHealing++;
        console.log(`✅ [AI] Success rate: ${(this.aiUsageStats.successfulHealing / this.aiUsageStats.aiActivations * 100).toFixed(1)}%`);
        return aiElement;
      }
      
      throw error;
    }
  }
}
```

## 🚀 Advanced Use Cases

### 1. Automatic selector updates:
```typescript
export class SmartLocatorManager {
  private locatorUpdates: Map<string, string> = new Map();

  async updateSelector(originalSelector: string, newSelector: string) {
    this.locatorUpdates.set(originalSelector, newSelector);
    // Save to file or database for future runs
    await this.persistUpdates();
  }

  async getUpdatedSelector(selector: string): Promise<string> {
    return this.locatorUpdates.get(selector) || selector;
  }
}
```

### 2. Integration with existing fixtures:
```typescript
// In main-fixture.ts
import { test as base } from '@playwright/test';
import { PlaywrightAISelfHealing } from '../framework/ai';

type AIFixtures = {
  aiHealing: PlaywrightAISelfHealing;
};

export const test = base.extend<AIFixtures>({
  aiHealing: async ({}, use) => {
    const ai = new PlaywrightAISelfHealing();
    await use(ai);
  }
});
```

### 3. Usage in API tests:
```typescript
// For verifying selectors after API calls
export class APITestHelper {
  async verifyUIAfterAPICall(page: Page, expectedElement: string) {
    const ai = new PlaywrightAISelfHealing();
    
    // API call changed DOM, verify with AI
    const element = await ai.findElementUniversal(page, expectedElement);
    expect(element).toBeTruthy();
  }
}
```

## ⚡ Optimization Tips

1. **Cache AI results** - save successful results for reuse
2. **Selective usage** - use AI only for critical elements
3. **Timeout settings** - set reasonable timeouts for AI operations
4. **Fallback strategies** - always have a plan B if AI fails

## 🎭 Complete Integration Example

```typescript
// framework/core/EnhancedBasePage.ts
import { Page } from '@playwright/test';
import { PlaywrightAISelfHealing } from '../ai';

export class EnhancedBasePage {
  protected page: Page;
  private ai: PlaywrightAISelfHealing;
  private isAIEnabled: boolean;

  constructor(page: Page, enableAI: boolean = true) {
    this.page = page;
    this.ai = new PlaywrightAISelfHealing();
    this.isAIEnabled = enableAI;
  }

  protected async smartLocator(selector: string, description?: string) {
    if (!this.isAIEnabled) {
      return this.page.locator(selector);
    }

    try {
      const element = this.page.locator(selector);
      await element.waitFor({ timeout: 2000 });
      return element;
    } catch {
      const aiElement = await this.ai.findElementUniversal(this.page, selector, description);
      if (aiElement) return aiElement;
      return this.page.locator(selector); // Fallback to original
    }
  }

  async smartClick(selector: string, description?: string) {
    const element = await this.smartLocator(selector, description);
    await element.click();
  }

  async smartFill(selector: string, value: string, description?: string) {
    const element = await this.smartLocator(selector, description);
    await element.fill(value);
  }
}
```

Now your tests will be much more resilient to DOM changes! 🎉
