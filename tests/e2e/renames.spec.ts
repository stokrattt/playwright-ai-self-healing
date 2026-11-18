import { test, expect } from './fixtures';

// Each page holds the renamed target plus an unrelated neighbour, so healing has to choose.
test.describe('heal= follows a renamed element', () => {
  test('suffix added to the id', async ({ page }) => {
    await page.setContent('<button id="submit-order-v2">Submit</button><a id="help-link" href="/help">Help</a>');
    await expect(page.locator('heal=#submit-order')).toHaveText('Submit');
  });

  test('prefix added to the id', async ({ page }) => {
    await page.setContent('<button id="main-submit-order">Submit</button><a id="help-link" href="/help">Help</a>');
    await expect(page.locator('heal=#submit-order')).toHaveText('Submit');
  });

  test('camelCase id rewritten in kebab-case', async ({ page }) => {
    await page.setContent('<button id="save-button">Save</button><button id="delete-item">Delete</button>');
    await expect(page.locator('heal=#saveButton')).toHaveText('Save');
  });

  test('btn spelled out as button', async ({ page }) => {
    await page.setContent('<button id="save-button">Save</button><button id="delete-item">Delete</button>');
    await expect(page.locator('heal=#save-btn')).toHaveText('Save');
  });

  test('readable id replaced by generated ids with the same text', async ({ page }) => {
    await page.setContent('<button id=":r1:">Cancel</button><button id=":r2:">Pay now</button>');
    await expect(page.locator('heal=#pay-now')).toHaveText('Pay now');
  });

  test('data-testid moved to the id', async ({ page }) => {
    await page.setContent('<button id="login-submit">Log in</button><button id="signup-open">Sign up</button>');
    await expect(page.locator('heal=[data-testid="login-submit"]')).toHaveText('Log in');
  });

  test('class renamed to BEM', async ({ page }) => {
    await page.setContent('<span class="product__price">9.99</span><span class="product__title">Mug</span>');
    await expect(page.locator('heal=.product-price')).toHaveText('9.99');
  });

  test('name changed slightly', async ({ page }) => {
    await page.setContent('<input name="user_email" value="a@b.c"><input name="password" type="password">');
    await expect(page.locator('heal=input[name="email"]')).toHaveValue('a@b.c');
  });

  test('input id renamed while its label text matches the old id', async ({ page }) => {
    await page.setContent('<label for="birth-date-v2">Birth date</label><input type="date" id="birth-date-v2">');
    await expect(page.locator('heal=#birth-date')).toHaveId('birth-date-v2');
  });

  test('placeholder changed slightly', async ({ page }) => {
    await page.setContent('<input placeholder="Search for products" value="mug"><input placeholder="Your city">');
    await expect(page.locator('heal=input[placeholder="Search products"]')).toHaveValue('mug');
  });

  test('a type word in the old class does not pull in a sibling control (TodoMVC toggle vs toggle-all)', async ({ page }) => {
    await page.setContent(
      '<input id="toggle-all" class="toggle-all" type="checkbox"><label for="toggle-all">All</label>' +
      '<ul><li><input aria-label="Toggle Todo" class="toggle" type="checkbox"><label>Buy milk</label></li></ul>'
    );
    await expect(page.locator('heal=.toggle-checkbox')).toHaveClass('toggle');
  });
});
