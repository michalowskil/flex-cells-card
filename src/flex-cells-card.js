import { LitElement, html, css } from 'lit';
import './flex-cells-card-editor.js';

class FlexCellsCard extends LitElement {
  static properties = { config: {}, hass: {} };

  static styles = css`
    .card {
      background: var(--ha-card-background, var(--card-background-color, #fff));
      color: var(--primary-text-color);
      border-radius: var(--ha-card-border-radius, 12px);
      font-size: 16px;
      border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
    }
    .wrap { width: 100%; }
    .datatable { width: 100%; border-collapse: collapse; }
    td, th { padding: 0; vertical-align: middle; white-space: nowrap; }
    thead th {
      font-weight: 700; text-align: left;
      background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
      border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.12));
    }
    .datatable.zebra tbody tr:nth-child(even) td {
      background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
    }
    .clickable { cursor: pointer; }
    .icon ha-icon { color: var(--state-icon-color, var(--primary-text-color)); }
    .celltext { display: inline-block; white-space: nowrap; }
    .datatable td, .datatable th { line-height: 1.15; }
  `;

  setConfig(config) {
    const colCount =
      Number.isInteger(config.column_count) && config.column_count > 0
        ? config.column_count
        : (config.rows?.[0]?.cells?.length || 1);

    const defaultCellPadding = { top: 4, right: 0, bottom: 4, left: 0 };
    const cell_padding = { ...defaultCellPadding, ...(config.cell_padding || {}) };

    this.config = {
      overflow_x: true,
      header_from_first_row: false,
      zebra: false,
      column_widths: undefined,
      hide_on_narrow: undefined,
      cell_padding,
      ...config,
      column_count: colCount,
    };
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      detail: { entityId }, bubbles: true, composed: true,
    }));
  }
  _onEntityKeydown(e, entityId) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._openMoreInfo(entityId); }
  }

  _isNumericState(state) { const n = Number(state); return Number.isFinite(n); }

  _formatEntityCell(cell, stateObj) {
    const raw = stateObj?.state ?? 'n/a';
    let text = raw;
    if (this._isNumericState(raw) && (cell?.precision === 0 || cell?.precision === 1 || cell?.precision === 2)) {
      text = Number(raw).toFixed(cell.precision);
    }
    const useEntityUnit = cell?.use_entity_unit !== false;
    const unit = useEntityUnit ? (stateObj?.attributes?.unit_of_measurement ?? '') : (cell?.unit ?? '');
    return `${text}${unit ? ` ${unit}` : ''}`;
  }

  _buildTextStyle(cell, type, align) {
    const st = cell?.style || {};
    const pad = this.config?.cell_padding || { top: 4, right: 0, bottom: 4, left: 0 };
    const parts = [
      `padding:${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
      `text-align:${align}`,
    ];

    const underline = st.underline === undefined ? (type === 'entity') : !!st.underline;
    const strike = !!st.strike;
    const decos = [];
    if (underline) decos.push('underline');
    if (strike) decos.push('line-through');
    parts.push(`text-decoration:${decos.length ? decos.join(' ') : 'none'}`);

    if (st.bold) parts.push('font-weight:700');
    if (st.italic) parts.push('font-style:italic');
    if (st.color) parts.push(`color:${st.color}`);

    const globalSize = this.config?.text_size;
    if (st.font_size) parts.push(`font-size:${st.font_size}`);
    else if (globalSize) parts.push(`font-size:${globalSize}`);

    if (st.text_transform) parts.push(`text-transform:${st.text_transform}`);
    if (st.letter_spacing) parts.push(`letter-spacing:${st.letter_spacing}`);
    return parts.join(';');
  }

  _buildIconStyle(cell) {
    const st = cell?.style || {};
    const parts = [];
    if (st.color) parts.push(`color:${st.color}`);
    const globalSize = this.config?.text_size;
    const iconSize = st.icon_size || globalSize || '';
    if (iconSize) parts.push(`--mdc-icon-size:${iconSize}`);
    return parts.join(';');
  }

  _renderHeaderCell(cell) {
    const type = cell?.type || 'string';
    const val = cell?.value ?? '';
    const align = cell?.align || 'left';
    const thStyle = this._buildTextStyle(cell, type, align);

    if (type === 'icon') {
      const iconStyle = this._buildIconStyle(cell);
      return html`<th class="icon" style=${thStyle}>${val ? html`<ha-icon style=${iconStyle} icon="${val}"></ha-icon>` : ''}</th>`;
    }
    if (type === 'entity') {
      const stateObj = this.hass?.states?.[val];
      const display = stateObj ? this._formatEntityCell(cell, stateObj) : 'n/a';
      return html`<th style=${thStyle}>${display}</th>`;
    }
    return html`<th style=${thStyle}>${val ?? ''}</th>`;
  }

  _renderBodyCell(cell) {
    const type = cell?.type || 'string';
    const val = cell?.value ?? '';
    const align = cell?.align || 'right';
    const tdStyle = this._buildTextStyle(cell, type, align);

    if (type === 'icon') {
      const iconStyle = this._buildIconStyle(cell);
      return html`<td class="icon" style=${tdStyle}>${val ? html`<ha-icon style=${iconStyle} icon="${val}"></ha-icon>` : ''}</td>`;
    }
    if (type === 'entity') {
      const stateObj = this.hass?.states?.[val];
      const display = stateObj ? this._formatEntityCell(cell, stateObj) : 'n/a';
      const aria = stateObj ? `${val}: ${display}` : val;
      return html`
        <td class="clickable"
            style=${tdStyle}
            title=${val}
            role="button"
            tabindex="0"
            aria-label=${aria}
            @click=${() => this._openMoreInfo(val)}
            @keydown=${(e) => this._onEntityKeydown(e, val)}>
          ${display}
        </td>
      `;
    }
    return html`<td style=${tdStyle}>${val ?? ''}</td>`;
  }

  _resolveCardPadding() {
    const v = this.config?.card_padding;
    if (v === '' || v === undefined || v === null) return 16;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 16;
  }

  render() {
    const cfg = this.config || {};
    const colCount = cfg.column_count ?? 1;
    const padVal = this._resolveCardPadding();

    if (!cfg.rows || !Array.isArray(cfg.rows) || cfg.rows.length === 0) {
      return html`<div class="card" style="padding:${padVal}px;">Brak wierszy do wyświetlenia.</div>`;
    }

    const hasHeader = !!cfg.header_from_first_row && cfg.rows.length > 0;
    const headerRow = hasHeader ? cfg.rows[0] : null;
    const bodyRows = hasHeader ? cfg.rows.slice(1) : cfg.rows;

    const widths = Array.isArray(cfg.column_widths) ? cfg.column_widths : null;
    const useFixed = !!widths && widths.length > 0;

    const classes = ['datatable'];
    if (cfg.zebra) classes.push('zebra');

    const hideCols = Array.isArray(cfg.hide_on_narrow) ? cfg.hide_on_narrow.filter(n => Number.isInteger(n) && n > 0) : null;
    const bp = parseInt(cfg.narrow_breakpoint, 10);
    const hasBP = Number.isFinite(bp) && bp > 0;

    const hideCSS = (hideCols?.length && hasBP)
      ? `
      @media (max-width: ${bp}px) {
        ${hideCols.map((i) => `
          colgroup col:nth-child(${i}) { display: none; }
          th:nth-child(${i}), td:nth-child(${i}) { display: none; }
        `).join('\n')}
      }`
      : '';

    const tableStyle = useFixed ? 'table-layout: fixed;' : '';

    const table = html`
      <style>${hideCSS}</style>
      <table class=${classes.join(' ')} style=${tableStyle} cellpadding="0" cellspacing="0" border="0">
        ${widths ? html`
          <colgroup>
            ${Array.from({ length: colCount }, (_, i) => html`<col style="width:${widths[i] || 'auto'}">`)}
          </colgroup>
        ` : ''}

        ${hasHeader ? html`
          <thead>
            <tr>
              ${Array.from({ length: colCount }, (_, i) => {
                const cells = Array.isArray(headerRow?.cells) ? headerRow.cells : [];
                const cell = cells[i] ?? { type: 'string', value: '', align: 'left', style: { bold: true } };
                const withBold = cell.style?.bold === undefined
                  ? { ...cell, style: { ...(cell.style || {}), bold: true } }
                  : cell;
                return this._renderHeaderCell(withBold);
              })}
            </tr>
          </thead>
        ` : ''}

        <tbody>
          ${bodyRows.map((row) => {
            const cells = Array.isArray(row?.cells) ? row.cells : [];
            const filled = Array.from({ length: colCount }, (_, i) =>
              cells[i] ?? { type: 'string', value: '', align: 'right' }
            );
            return html`<tr>${filled.map((cell) => this._renderBodyCell(cell))}</tr>`;
          })}
        </tbody>
      </table>
    `;

    return html`
      <div class="card" style="padding:${padVal}px;">
        ${cfg.overflow_x ? html`<div class="wrap" style="overflow-x:auto">${table}</div>` : table}
      </div>
    `;
  }

  static getConfigElement() {
    return document.createElement('flex-cells-card-editor');
  }
}

if (!customElements.get('flex-cells-card')) {
  customElements.define('flex-cells-card', FlexCellsCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'flex-cells-card',
  name: 'Flex Cells Card',
  description: 'A Lovelace card for Home Assistant that lets you add icons, text, or entities in flexible cell layouts — fully configurable from a visual editor with no documentation required.',
});
