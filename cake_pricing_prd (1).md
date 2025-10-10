# Cake Pricing Calculator - Product Requirements Document

## Overview
A web application that helps cake makers calculate the optimal selling price for their products based on ingredient costs, production quantity, and desired profit margin.

## Core Features

### 1. Ingredient Management
**Purpose:** Allow users to input and manage all ingredients used in cake production.

**Requirements:**
- Users can add multiple ingredients with the following fields:
  - Ingredient name (text input, required)
  - Cost/price of ingredient (number input, required, minimum 0)
  - Unit of measurement (text input, e.g., "kg", "grams", "pieces")
- Display a list of all added ingredients with their costs
- Allow users to edit existing ingredients
- Allow users to delete ingredients
- Calculate and display the total ingredient cost automatically

**UI Elements:**
- Form with input fields for ingredient name, cost, and unit
- "Add Ingredient" button
- Ingredient list/table showing all added ingredients
- Edit and Delete buttons for each ingredient
- Total cost display (bold/highlighted)

### 2. Additional Costs Management
**Purpose:** Track all non-ingredient costs associated with cake production.

**Requirements:**
- Users can add multiple additional cost items with the following fields:
  - Cost category/name (dropdown or text input with predefined options)
    - Suggested categories: Equipment, Packaging, Water, Electricity, Gas, Delivery, Labor, Rent/Overhead, Other
  - Cost description (text input, optional)
  - Amount (number input, required, minimum 0)
  - Cost allocation method (dropdown):
    - "Per Batch" - cost applies to entire production batch
    - "Per Cake" - cost applies to each individual cake
- Display a list of all added additional costs
- Allow users to edit existing cost items
- Allow users to delete cost items
- Calculate and display total additional costs automatically
- Separate totals for "Per Batch" and "Per Cake" costs

**UI Elements:**
- Form with dropdown for category, text field for description, number input for amount, and dropdown for allocation method
- "Add Cost" button
- Additional costs list/table showing all added items with category, description, amount, and allocation type
- Edit and Delete buttons for each cost item
- Display "Total Per-Batch Costs" 
- Display "Total Per-Cake Costs"

### 3. Production Quantity Input
**Purpose:** Determine how many cakes can be produced from the ingredients entered.

**Requirements:**
- Number input field for "Number of cakes produced"
- Input must accept positive integers only (minimum 1)
- Calculate cost per cake automatically incorporating all costs:
  - Base ingredient cost per cake = Total Ingredient Cost ÷ Number of Cakes
  - Allocated batch costs per cake = Total Per-Batch Additional Costs ÷ Number of Cakes
  - Per-cake additional costs = Total Per-Cake Additional Costs
  - **Total Cost per Cake = Base Ingredient Cost + Allocated Batch Costs + Per-Cake Additional Costs**
- Display detailed cost breakdown per cake

**UI Elements:**
- Number input field with clear label
- Display cost breakdown:
  - "Ingredient Cost per Cake"
  - "Additional Costs per Cake" (breakdown of batch + per-cake)
  - "Total Cost per Cake" (prominently displayed)

### 4. Profit Margin Calculator
**Purpose:** Calculate the selling price based on desired profit percentage.

**Requirements:**
- Number input field for profit margin percentage (minimum 0, maximum 1000)
- Calculate selling price using formula: `Selling Price = Cost per Cake × (1 + Profit% / 100)`
- Display both the profit amount per cake and final selling price
- Update calculations in real-time when profit percentage changes

**UI Elements:**
- Percentage input field with "%" symbol
- Display "Profit per Cake" (calculated amount)
- Display "Recommended Selling Price" (prominently shown, larger text)

### 5. Results Display
**Purpose:** Show all calculations clearly to help user make pricing decisions.

**Requirements:**
- Summary section showing:
  - Total ingredient cost
  - Total additional costs (breakdown by batch and per-cake)
  - Number of cakes
  - Cost per cake (with breakdown)
  - Profit margin percentage
  - Profit amount per cake
  - Final selling price per cake
- All monetary values should display with 2 decimal places
- Use clear labels and formatting
- Show detailed cost breakdown in an expandable section or table

## Technical Requirements

### Technology Stack
- **Frontend Framework:** React with TypeScript (recommended) or vanilla HTML/CSS/JavaScript
- **Styling:** Tailwind CSS or modern CSS
- **State Management:** React hooks (useState) or vanilla JS variables
- **Storage:** In-memory only (no localStorage/sessionStorage)

### Calculations

**Total Costs Calculation:**
```
Total Ingredient Cost = Sum of all ingredient costs

Total Per-Batch Additional Costs = Sum of all "Per Batch" additional costs

Total Per-Cake Additional Costs = Sum of all "Per Cake" additional costs
```

**Cost per Cake:**
```
Ingredient Cost per Cake = Total Ingredient Cost ÷ Number of Cakes

Allocated Batch Costs per Cake = Total Per-Batch Additional Costs ÷ Number of Cakes

Additional Costs per Cake = Allocated Batch Costs per Cake + Total Per-Cake Additional Costs

Total Cost per Cake = Ingredient Cost per Cake + Additional Costs per Cake
```

**Profit per Cake:**
```
Profit per Cake = Total Cost per Cake × (Profit Percentage ÷ 100)
```

**Selling Price:**
```
Selling Price = Total Cost per Cake + Profit per Cake
OR
Selling Price = Total Cost per Cake × (1 + Profit Percentage ÷ 100)
```

### Data Validation
- All number inputs must be validated (no negative numbers except where specified)
- Ingredient cost must be ≥ 0
- Number of cakes must be ≥ 1
- Profit percentage must be ≥ 0
- Show appropriate error messages for invalid inputs
- Prevent calculation errors (e.g., division by zero)

## User Experience Requirements

### Layout
- Clean, single-page application
- Logical flow from top to bottom:
  1. Ingredient input section
  2. Ingredient list
  3. Additional costs input section
  4. Additional costs list
  5. Production quantity
  6. Profit margin
  7. Results/Summary with detailed breakdown
- Responsive design (works on mobile and desktop)
- Consider using tabs or collapsible sections to organize ingredients vs. additional costs

### Visual Design
- Professional appearance suitable for small business use
- Clear visual hierarchy
- Prominent display of final selling price
- Use cards or sections to separate different functionalities
- Color coding: 
  - Costs in one color
  - Profits in another color (e.g., green)
  - Selling price highlighted/emphasized

### User Feedback
- Real-time calculation updates
- Clear labels for all inputs
- Success/error messages when adding/editing/deleting ingredients
- Disabled states for buttons when necessary
- Input field validation feedback

## Functional Requirements

### Must Have (P0)
- Add multiple ingredients with name and cost
- Edit and delete ingredients
- Add multiple additional costs with category, amount, and allocation method
- Edit and delete additional costs
- Calculate total ingredient cost and total additional costs
- Input number of cakes produced
- Calculate total cost per cake (including all costs)
- Input desired profit percentage
- Calculate and display selling price with detailed breakdown
- All calculations update automatically

### Should Have (P1)
- Ability to specify units for each ingredient
- Form validation with error messages
- Clear/reset all data button
- Responsive mobile layout

### Nice to Have (P2)
- Export results to PDF or print view
- Multiple recipe profiles (save different cake recipes)
- Bulk pricing calculator (price for 1, 6, 12 cakes)
- Additional cost factors (labor, packaging, overhead)

## Acceptance Criteria

### User Story 1: Add Ingredients
- Given I'm on the app
- When I enter ingredient name and cost and click "Add"
- Then the ingredient appears in the list
- And the total cost updates automatically

### User Story 2: Add Additional Costs
- Given I'm on the app
- When I select a cost category, enter amount, and choose allocation method
- Then the cost appears in the additional costs list
- And the total additional costs update automatically

### User Story 3: Calculate Selling Price with All Costs
- Given I have added ingredients, additional costs, and entered number of cakes
- When I input a profit percentage
- Then the app displays the correct selling price including all costs
- And shows a detailed breakdown of ingredient costs, additional costs, and profit

### User Story 4: Edit Ingredient
- Given I have added ingredients
- When I click edit on an ingredient
- Then I can modify the name or cost
- And all calculations update automatically

### User Story 5: Delete Ingredient
- Given I have added ingredients
- When I click delete on an ingredient
- Then it's removed from the list
- And total cost recalculates

## Future Enhancements
- Multi-currency support
- Ingredient inventory tracking
- Recipe scaling (adjust for different batch sizes)
- Competitor price comparison
- Cost trend analysis over time
- Integration with accounting software

## Out of Scope (Current Version)
- User authentication/login
- Cloud storage/database
- Multiple users
- Mobile native app
- Inventory management
- Order management

---

## Implementation Notes for Cursor

**File Structure:**
```
/src
  /components
    IngredientForm.jsx (or .tsx)
    IngredientList.jsx
    ProductionCalculator.jsx
    ProfitCalculator.jsx
    ResultsSummary.jsx
  App.jsx (main component)
  styles.css (if not using Tailwind)
```

**Key State Variables:**
- `ingredients` array of objects: `[{ id, name, cost, unit }]`
- `additionalCosts` array of objects: `[{ id, category, description, amount, allocationType }]` where allocationType is "batch" or "per-cake"
- `numberOfCakes` number
- `profitPercentage` number

**Priority Order:**
1. Build ingredient input and list functionality first
2. Add production quantity calculator
3. Implement profit and pricing calculations
4. Polish UI and add validation
5. Add edit/delete functionality
6. Responsive design refinements

Using MCP to create the database on supabase
Project URL: https://rxhmqqvqfctvpzevalrd.supabase.co
API Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4aG1xcXZxZmN0dnB6ZXZhbHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjE2MjAsImV4cCI6MjA3NTMzNzYyMH0.SLp4VM9FxCJvFmIDsuougqOjAACu-JO_96PMiDlGwQE