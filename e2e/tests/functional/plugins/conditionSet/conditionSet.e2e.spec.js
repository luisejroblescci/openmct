/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2023, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

/*
This test suite is dedicated to tests which verify the basic operations surrounding conditionSets. Note: this
suite is sharing state between tests which is considered an anti-pattern. Implimenting in this way to
demonstrate some playwright for test developers. This pattern should not be re-used in other CRUD suites.
*/

const { test, expect } = require('../../../../pluginFixtures.js');
const { createDomainObjectWithDefaults } = require('../../../../appActions');

let conditionSetUrl;

test.describe('Condition Set CRUD Operations on @localStorage', () => {
  test.beforeEach(async ({ page }) => {
    // Create a fresh condition set for each test to avoid state sharing
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Create")');
    await page.locator('li[role="menuitem"]:has-text("Condition Set")').click();
    await Promise.all([page.waitForNavigation(), page.click('button:has-text("OK")')]);

    // Wait for the condition set to be fully created and loaded
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.l-browse-bar__object-name')).toContainText('Unnamed Condition Set');

    conditionSetUrl = page.url();
  });

  test('Condition set object properties persist in main view and inspector @localStorage', async ({
    page
  }) => {
    // The condition set is already created and loaded from beforeEach

    // Wait for Vue components to be fully rendered and stable
    await page.waitForLoadState('networkidle');

    // Wait for inspector to be visible and stable
    await page.waitForSelector('.c-inspector', { state: 'visible' });
    await page.waitForFunction(() => {
      const inspector = document.querySelector('.c-inspector');
      return inspector && inspector.children.length > 0;
    });

    //Assertions on loaded Condition Set in main view
    await expect(page.locator('.l-browse-bar__object-name')).toContainText(
      'Unnamed Condition Set',
      { timeout: 10000 }
    );

    //Assertions on loaded Condition Set in Inspector with better selector
    const inspectorNameElement = page
      .locator('.c-inspector .c-object-label__name')
      .filter({ hasText: 'Unnamed Condition Set' });
    await expect(inspectorNameElement).toBeVisible({ timeout: 10000 });

    //Reload Page and wait for complete reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');

    // Wait for Vue components to re-render after reload
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.c-inspector', { state: 'visible' });
    await page.waitForFunction(() => {
      const inspector = document.querySelector('.c-inspector');
      return inspector && inspector.children.length > 0;
    });

    //Re-verify after reload with increased timeout
    await expect(page.locator('.l-browse-bar__object-name')).toContainText(
      'Unnamed Condition Set',
      { timeout: 10000 }
    );

    //Assertions on loaded Condition Set in Inspector after reload
    const inspectorNameElementAfterReload = page
      .locator('.c-inspector .c-object-label__name')
      .filter({ hasText: 'Unnamed Condition Set' });
    await expect(inspectorNameElementAfterReload).toBeVisible({ timeout: 10000 });
  });
  test('condition set object can be modified on @localStorage', async ({ page, openmctConfig }) => {
    const { myItemsFolderName } = openmctConfig;

    // The condition set is already loaded from beforeEach
    await page.waitForLoadState('networkidle');

    //Assertions on loaded Condition Set in main view. This is a stateful transition step after page.goto()
    await expect
      .soft(page.locator('.l-browse-bar__object-name'))
      .toContainText('Unnamed Condition Set');

    //Update the Condition Set properties
    // Click Edit Button - wait for it to be available
    await page.waitForSelector('[title="Edit"]', { state: 'visible' });
    await page.locator('[title="Edit"]').click();

    // Wait for edit mode to be fully activated
    await page.waitForSelector('.c-button--menu.c-button--major', { state: 'visible' });

    //Edit Condition Set Name from main view
    await page
      .locator('.l-browse-bar__object-name')
      .filter({ hasText: 'Unnamed Condition Set' })
      .first()
      .fill('Renamed Condition Set');
    await page
      .locator('.l-browse-bar__object-name')
      .filter({ hasText: 'Renamed Condition Set' })
      .first()
      .press('Enter');
    // Click Save Button - wait for it to be available
    await page.waitForSelector('button[title="Save"]', { state: 'visible' });
    await page.locator('button[title="Save"]').click();

    // Wait for save menu to appear and click Save and Finish Editing
    await page.waitForSelector('text=Save and Finish Editing', { state: 'visible' });
    await page.locator('text=Save and Finish Editing').click();

    // Wait for save operation to complete and edit mode to exit
    await page.waitForSelector('[title="Edit"]', { state: 'visible' });
    await page.waitForLoadState('networkidle'); // Allow UI to stabilize after save

    //Verify Main section reflects updated Name Property
    await expect(page.locator('.l-browse-bar__object-name')).toContainText(
      'Renamed Condition Set',
      { timeout: 10000 }
    );

    // Verify Inspector properties with proper waiting
    await page.waitForSelector('.c-inspector', { state: 'visible' });
    await page.waitForFunction(
      () => {
        const inspectorElements = document.querySelectorAll(
          '.c-inspector [class*="name"]:not(.c-search__input)'
        );
        return Array.from(inspectorElements).some((el) =>
          el.textContent.includes('Renamed Condition Set')
        );
      },
      { timeout: 10000 }
    );

    // Verify Inspector has updated Name property
    const inspectorNameUpdated = page
      .locator('.c-inspector')
      .locator('text=Renamed Condition Set')
      .first();
    await expect(inspectorNameUpdated).toBeVisible({ timeout: 10000 });

    // Verify Tree reflects updated Name proprety
    // Expand Tree
    await page.locator(`text=Open MCT ${myItemsFolderName} >> span >> nth=3`).click();
    // Verify Condition Set Object is renamed in Tree
    expect(page.locator('a:has-text("Renamed Condition Set")')).toBeTruthy();
    // Verify Search Tree reflects renamed Name property
    await page.locator('[aria-label="OpenMCT Search"] input[type="search"]').fill('Renamed');
    expect(page.locator('a:has-text("Renamed Condition Set")')).toBeTruthy();

    //Reload Page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');

    // Wait for Vue components to re-render
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.c-inspector', { state: 'visible' });

    //Verify Main section reflects updated Name Property after reload
    await expect(page.locator('.l-browse-bar__object-name')).toContainText(
      'Renamed Condition Set',
      { timeout: 10000 }
    );

    // Verify Inspector properties after reload with proper waiting
    await page.waitForFunction(
      () => {
        const inspectorElements = document.querySelectorAll(
          '.c-inspector [class*="name"]:not(.c-search__input)'
        );
        return Array.from(inspectorElements).some((el) =>
          el.textContent.includes('Renamed Condition Set')
        );
      },
      { timeout: 10000 }
    );

    const inspectorNameAfterReload = page
      .locator('.c-inspector')
      .locator('text=Renamed Condition Set')
      .first();
    await expect(inspectorNameAfterReload).toBeVisible({ timeout: 10000 });

    // Verify Tree reflects updated Name proprety
    // Expand Tree
    await page.locator(`text=Open MCT ${myItemsFolderName} >> span >> nth=3`).click();
    // Verify Condition Set Object is renamed in Tree
    expect(page.locator('a:has-text("Renamed Condition Set")')).toBeTruthy();
    // Verify Search Tree reflects renamed Name property
    await page.locator('[aria-label="OpenMCT Search"] input[type="search"]').fill('Renamed');
    expect(page.locator('a:has-text("Renamed Condition Set")')).toBeTruthy();
  });
  test('condition set object can be deleted by Search Tree Actions menu on @localStorage', async ({
    page
  }) => {
    // Navigate to home to test deletion from search
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Wait for the condition set to appear in the tree - it was created in beforeEach
    await page.waitForLoadState('networkidle');

    // Search for our condition set first to make sure it exists
    await page
      .locator('[aria-label="OpenMCT Search"] input[type="search"]')
      .fill('Unnamed Condition Set');
    await page.waitForLoadState('networkidle'); // Wait for search results

    // Verify condition set exists before trying to count
    await expect(page.locator('text=Unnamed Condition Set').first()).toBeVisible({
      timeout: 10000
    });

    const numberOfConditionSetsToStart = await page
      .locator('a:has-text("Unnamed Condition Set Condition Set")')
      .count();

    // Search for Unnamed Condition Set
    await page
      .locator('[aria-label="OpenMCT Search"] input[type="search"]')
      .fill('Unnamed Condition Set');
    // Click Search Result
    await page
      .locator('[aria-label="OpenMCT Search"] >> text=Unnamed Condition Set')
      .first()
      .click();
    // Click hamburger button
    await page.locator('[title="More options"]').click();

    // Click 'Remove' and press OK
    await page.locator('li[role="menuitem"]:has-text("Remove")').click();
    await page.locator('button:has-text("OK")').click();

    //Expect Unnamed Condition Set to be removed in Main View
    const numberOfConditionSetsAtEnd = await page
      .locator('a:has-text("Unnamed Condition Set Condition Set")')
      .count();

    expect(numberOfConditionSetsAtEnd).toEqual(numberOfConditionSetsToStart - 1);

    //Feature?
    //Domain Object is still available by direct URL after delete
    await page.goto(conditionSetUrl, { waitUntil: 'networkidle' });
    await expect(page.locator('.l-browse-bar__object-name')).toContainText('Unnamed Condition Set');
  });
});

test.describe('Basic Condition Set Use', () => {
  test.beforeEach(async ({ page }) => {
    // Open a browser, navigate to the main page, and wait until all network events to resolve
    await page.goto('./', { waitUntil: 'domcontentloaded' });
  });
  test('Can add a condition', async ({ page }) => {
    // Create a new condition set
    await createDomainObjectWithDefaults(page, {
      type: 'Condition Set',
      name: 'Test Condition Set'
    });
    // Change the object to edit mode
    await page.locator('[title="Edit"]').click();

    // Click Add Condition button
    await page.locator('#addCondition').click();
    // Check that the new Unnamed Condition section appears
    const numOfUnnamedConditions = await page.locator('text=Unnamed Condition').count();
    expect(numOfUnnamedConditions).toEqual(1);
  });
  test('ConditionSet should display appropriate view options', async ({ page }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'https://github.com/nasa/openmct/issues/5924'
    });

    await createDomainObjectWithDefaults(page, {
      type: 'Sine Wave Generator',
      name: 'Alpha Sine Wave Generator'
    });
    await createDomainObjectWithDefaults(page, {
      type: 'Sine Wave Generator',
      name: 'Beta Sine Wave Generator'
    });
    const conditionSet1 = await createDomainObjectWithDefaults(page, {
      type: 'Condition Set',
      name: 'Test Condition Set'
    });

    // Change the object to edit mode
    await page.locator('[title="Edit"]').click();

    // Expand the 'My Items' folder in the left tree
    await page.goto(conditionSet1.url);
    page.click('button[title="Show selected item in tree"]');
    // Add the Alpha & Beta Sine Wave Generator to the Condition Set and save changes
    const treePane = page.getByRole('tree', {
      name: 'Main Tree'
    });
    const alphaGeneratorTreeItem = treePane.getByRole('treeitem', {
      name: 'Alpha Sine Wave Generator'
    });
    const betaGeneratorTreeItem = treePane.getByRole('treeitem', {
      name: 'Beta Sine Wave Generator'
    });
    const conditionCollection = page.locator('#conditionCollection');

    await alphaGeneratorTreeItem.dragTo(conditionCollection);
    await betaGeneratorTreeItem.dragTo(conditionCollection);

    const saveButtonLocator = page.locator('button[title="Save"]');
    await saveButtonLocator.click();
    await page.getByRole('listitem', { name: 'Save and Finish Editing' }).click();
    await page.click('button[title="Change the current view"]');

    await expect(page.getByRole('menuitem', { name: /Lad Table/ })).toBeHidden();
    await expect(page.getByRole('menuitem', { name: /Conditions View/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Plot/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Telemetry Table/ })).toBeVisible();
  });
  test('ConditionSet should output blank instead of the default value', async ({ page }) => {
    //Navigate to baseURL
    await page.goto('./', { waitUntil: 'domcontentloaded' });

    //Click the Create button
    await page.click('button:has-text("Create")');

    // Click the object specified by 'type'
    await page.click(`li[role='menuitem']:text("Sine Wave Generator")`);
    await page.getByRole('spinbutton', { name: 'Loading Delay (ms)' }).fill('8000');
    const nameInput = page.locator('form[name="mctForm"] .first input[type="text"]');
    await nameInput.fill('Delayed Sine Wave Generator');

    // Click OK button and wait for Navigate event
    await Promise.all([
      page.waitForLoadState(),
      page.click('[aria-label="Save"]'),
      // Wait for Save Banner to appear
      page.waitForSelector('.c-message-banner__message')
    ]);

    // Create a new condition set
    await createDomainObjectWithDefaults(page, {
      type: 'Condition Set',
      name: 'Test Blank Output of Condition Set'
    });
    // Change the object to edit mode
    await page.locator('[title="Edit"]').click();

    // Click Add Condition button twice
    await page.locator('#addCondition').click();
    await page.locator('#addCondition').click();
    await page.locator('#conditionCollection').getByRole('textbox').nth(0).fill('First Condition');
    await page.locator('#conditionCollection').getByRole('textbox').nth(1).fill('Second Condition');

    // Expand the 'My Items' folder in the left tree
    await page.locator('.c-tree__item__view-control.c-disclosure-triangle').first().click();
    // Add the Sine Wave Generator to the Condition Set and save changes
    const treePane = page.getByRole('tree', {
      name: 'Main Tree'
    });
    const sineWaveGeneratorTreeItem = treePane.getByRole('treeitem', {
      name: 'Delayed Sine Wave Generator'
    });
    const conditionCollection = await page.locator('#conditionCollection');

    await sineWaveGeneratorTreeItem.dragTo(conditionCollection);

    const firstCriterionTelemetry = await page.locator(
      '[aria-label="Criterion Telemetry Selection"] >> nth=0'
    );
    firstCriterionTelemetry.selectOption({ label: 'Delayed Sine Wave Generator' });

    const secondCriterionTelemetry = await page.locator(
      '[aria-label="Criterion Telemetry Selection"] >> nth=1'
    );
    secondCriterionTelemetry.selectOption({ label: 'Delayed Sine Wave Generator' });

    const firstCriterionMetadata = await page.locator(
      '[aria-label="Criterion Metadata Selection"] >> nth=0'
    );
    firstCriterionMetadata.selectOption({ label: 'Sine' });

    const secondCriterionMetadata = await page.locator(
      '[aria-label="Criterion Metadata Selection"] >> nth=1'
    );
    secondCriterionMetadata.selectOption({ label: 'Sine' });

    const firstCriterionComparison = await page.locator(
      '[aria-label="Criterion Comparison Selection"] >> nth=0'
    );
    firstCriterionComparison.selectOption({ label: 'is greater than or equal to' });

    const secondCriterionComparison = await page.locator(
      '[aria-label="Criterion Comparison Selection"] >> nth=1'
    );
    secondCriterionComparison.selectOption({ label: 'is less than' });

    const firstCriterionInput = await page.locator('[aria-label="Criterion Input"] >> nth=0');
    await firstCriterionInput.fill('0');

    const secondCriterionInput = await page.locator('[aria-label="Criterion Input"] >> nth=1');
    await secondCriterionInput.fill('0');

    const saveButtonLocator = page.locator('button[title="Save"]');
    await saveButtonLocator.click();
    await page.getByRole('listitem', { name: 'Save and Finish Editing' }).click();

    const outputValue = await page.locator('[aria-label="Current Output Value"]');
    await expect(outputValue).toHaveText('---');
  });
});
