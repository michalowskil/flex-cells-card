[![Forum](https://img.shields.io/badge/Forum-41BDF5?style=flat&logo=homeassistant&logoColor=white)](https://community.home-assistant.io/t/new-lovelace-card-flex-cells-card/919780) [![Downloads](https://img.shields.io/github/downloads/michalowskil/flex-cells-card/total?label=downloads&logo=github)](https://github.com/michalowskil/flex-cells-card/releases) [![Latest release downloads](https://img.shields.io/github/downloads/michalowskil/flex-cells-card/latest/total?label=latest%20downloads&logo=github)](https://github.com/michalowskil/flex-cells-card/releases/latest)

# Flex Cells Card

A Lovelace card for Home Assistant that lets you add **icons**, **text**,  **entities**, **attributes**, or **input controls** in flexible cell layouts — fully configurable from a **visual editor**, so **no documentation is required** to get started.

If you like this card, please consider giving it a ⭐ on GitHub: [![Star on GitHub](https://img.shields.io/github/stars/michalowskil/flex-cells-card.svg?style=social)](https://github.com/michalowskil/flex-cells-card/stargazers)

## Features
- Mix cells with **Icon / Text / Entity / Attribute / Input Control**
- **Dynamic Rules**: Color & Content Overrides
- **Per-cell actions:** tap, hold, double-tap (mobile-friendly)
- Per-cell **alignment**, **text transform**, **color**, **size**, **letter spacing**
- Entities with unit handling and optional precision
- Visual editor, drag-and-drop rows/columns, zebra rows, responsive columns

## Installation

### HACS – Custom repository

1. HACS → ⋮ → **Custom repositories** → add:
   `https://github.com/michalowskil/flex-cells-card` (Type: **Dashboard**) or just click the button below to do the same:  
   [![Open your Home Assistant instance and add this repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=michalowskil&repository=flex-cells-card&category=plugin)
2. Install **Flex Cells Card**.
3. Resource is added automatically as `/hacsfiles/flex-cells-card/flex-cells-card.js`.
4. Reload browser cache or refresh resources in HA if needed.

### Manual

1. Download `flex-cells-card.js` from the latest release and place it under  
   `config/www/flex-cells-card/flex-cells-card.js`.
2. Add a resource in **Edit Dashboard → ⋮ → Manage resources**:  
   `/local/flex-cells-card/flex-cells-card.js` (type: **JavaScript module**).
3. Hard refresh the browser.

## Usage
Add the card in the UI and configure everything from the visual editor.

## Video

Olli from the YouTube channel [@smarterkram](https://www.youtube.com/@smarterkram) recorded a video explaining this card. If you know German, I encourage you to watch it https://www.youtube.com/watch?v=oh36grjbPDQ

## Changelog
- v0.8.0 —
  - Added **formatting for input_datetime**.
- v0.7.0 —
  - Added **controls for input types**: boolean, number, select, button, datetime, text.
  - Added **"Appearance & Style" section** in the card editor for easier navigation.
- v0.6.0 —
  - Added **dynamic icons**.
- v0.5.0 —
  - Added **dynamic coloring/hiding/masking**.
  - Minor visual improvements.
- v0.4.0 —
  - Added **entity attributes** with per-attribute **rescaling** (Input/Output min/max).
  - Fixed **tap & hold** so secondary actions (e.g., setting brightness) work alongside the primary action.
  - Fixed **header/last row background** overflow when card padding is set to `0`.
- v0.3.0 — 
  - Added **inline color picker** with live preview.
- v0.2.0 —
  - Added per-cell actions: **tap / hold / double-tap**.
- v0.1.x —
  - First basic release of the card.

## Screenshots

| ![Flex Cells Card config](images/flex-cells-card-10.png) |
|---|

| ![Flex Cells Card](images/flex-cells-card-9.png) | ![Flex Cells Card](images/flex-cells-card-8.png) |
|---|---|

| ![Flex Cells Card](images/flex-cells-card-4.png) | ![Flex Cells Card](images/flex-cells-card-5.png) |
|---|---|

| ![Flex Cells Card](images/flex-cells-card-1.png) | ![Flex Cells Card](images/flex-cells-card-2.png) |
|---|---|

| ![Flex Cells Card config](images/flex-cells-card-6.png) |
|---|

**Main configuration view**
| ![Flex Cells Card config](images/flex-cells-card-configuration1.png) |
|---|

**Row and cell configuration**
| ![Flex Cells Card config](images/flex-cells-card-configuration2.png) |
|---|

**Tap & Hold Actions**
| ![Flex Cells Card config](images/flex-cells-card-configuration3.png) |
|---|

## Example YAML
```yaml
type: 'custom:flex-cells-card'
```