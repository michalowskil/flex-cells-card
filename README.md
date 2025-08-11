# Flex Cells Card

A Lovelace card for Home Assistant that lets you add **icons**, **text**, or **entities** in flexible cell layouts — fully configurable from a **visual editor**, so **no documentation is required** to get started.

## Features
- Mix cells with **Icon / Text / Entity**
- Per-cell **alignment**, **text transform**, **color**, **size**, **letter spacing**
- Entities with unit handling and optional precision
- Built-in **icon suggestions** (HA `ha-icon-picker` if available)
- Visual editor, drag-and-drop rows/columns, zebra rows, responsive columns

## Installation (HACS – Custom repository)
1. HACS → ⋮ → **Custom repositories** → add:
   `https://github.com/michalowskil/flex-cells-card` (Category: **Plugin**)
2. Install **Flex Cells Card**.
3. Resource is added automatically as `/hacsfiles/flex-cells-card/flex-cells-card.js`.
4. Reload browser cache or refresh resources in HA if needed.

## Usage
Add the card in the UI and configure everything from the visual editor.
Example YAML:
```yaml
type: 'custom:flex-cells-card'
