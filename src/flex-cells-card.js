import { LitElement, html, css, nothing } from 'lit';
import { t } from './localize/localize.js';
import './flex-cells-card-editor.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

const SORT_LOCALE_OPTS = { numeric: true, sensitivity: 'base' };


const UNAVAILABLE = 'unavailable';
const UNKNOWN = 'unknown';
const OFF = 'off';

const STATE_COLORED_DOMAIN = new Set(['alarm_control_panel','alert','automation','binary_sensor','calendar','camera','climate','cover','device_tracker','fan','group','humidifier','input_boolean','lawn_mower','light','lock','media_player','person','plant','remote','schedule','script','siren','sun','switch','timer','update','vacuum','valve','water_heater']);

const CLIMATE_HVAC_ACTION_TO_MODE = { cooling: 'cool', defrosting: 'heat', drying: 'dry', fan: 'fan_only', heating: 'heat', idle: 'off', off: 'off', preheating: 'heat' };

const batteryStateColorProperty = (state) => { const value = Number(state); if (Number.isNaN(value)) return undefined; if (value >= 70) return '--state-sensor-battery-high-color'; if (value >= 30) return '--state-sensor-battery-medium-color'; return '--state-sensor-battery-low-color'; };

const computeCssVariable = (props) => { if (Array.isArray(props)) { return props.slice().reverse().reduce((str, variable) => 'var(' + variable + (str ? ', ' + str : '') + ')', undefined); } return 'var(' + props + ')'; };

const slugify = (value, delimiter = '_') => { if (value === undefined || value === null) return 'unknown'; const slug = String(value).toLowerCase().replace(/\\s+/g, delimiter).replace(/[^a-z0-9_]+/g, delimiter).replace(new RegExp(delimiter + '+', 'g'), delimiter).replace(new RegExp('^' + delimiter + '|' + delimiter + '$', 'g'), ''); return slug || 'unknown'; };

const computeDomain = (entityId) => entityId.split('.')[0];

const computeGroupDomain = (stateObj) => { const entityIds = (stateObj?.attributes?.entity_id) || []; const uniqueDomains = [...new Set(entityIds.map((id) => computeDomain(id)))]; return uniqueDomains.length === 1 ? uniqueDomains[0] : undefined; };

const isUnavailableState = (state) => state === UNAVAILABLE || state === UNKNOWN;

const DEFAULT_AUTO_ENTITY_TEMPLATE = {
  header: [],
  cells: [
    { type: 'entity', value: '@entity', entity_display: 'icon', align: 'center' },
    { type: 'string', value: '@friendly_name', align: 'left' },
    { type: 'entity', value: '@entity', use_entity_unit: true },
  ],
};

const deepClone = (obj) => {
  try { return structuredClone(obj); } catch (_e) { /* fallback */ }
  return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
};

const stateActive = (stateObj, state) => { const domain = computeDomain(stateObj.entity_id); const compareState = state !== undefined ? state : stateObj?.state; if (['button','event','input_button','scene'].includes(domain)) return compareState !== UNAVAILABLE; if (isUnavailableState(compareState)) return false; if (compareState === OFF && domain !== 'alert') return false; switch (domain) { case 'alarm_control_panel': return compareState !== 'disarmed'; case 'alert': return compareState !== 'idle'; case 'cover': return compareState !== 'closed'; case 'device_tracker': case 'person': return compareState !== 'not_home'; case 'lawn_mower': return ['mowing','error'].includes(compareState); case 'lock': return compareState !== 'locked'; case 'media_player': return compareState !== 'standby'; case 'vacuum': return !['idle','docked','paused'].includes(compareState); case 'valve': return compareState !== 'closed'; case 'plant': return compareState === 'problem'; case 'group': return ['on','home','open','locked','problem'].includes(compareState); case 'timer': return compareState === 'active'; case 'camera': return compareState === 'streaming'; default: return true; } };

const domainColorProperties = (domain, deviceClass, state, active) => { const properties = []; const stateKey = slugify(state, '_'); const activeKey = active ? 'active' : 'inactive'; if (deviceClass) properties.push('--state-' + domain + '-' + deviceClass + '-' + stateKey + '-color'); properties.push('--state-' + domain + '-' + stateKey + '-color'); properties.push('--state-' + domain + '-' + activeKey + '-color'); properties.push('--state-' + activeKey + '-color'); return properties; };

const domainStateColorProperties = (domain, stateObj, state) => domainColorProperties(domain, stateObj.attributes?.device_class, state !== undefined ? state : stateObj.state, stateActive(stateObj, state));

const stateColorProperties = (stateObj, state) => { const compareState = state !== undefined ? state : stateObj?.state; const domain = computeDomain(stateObj.entity_id); const deviceClass = stateObj.attributes?.device_class; if (domain === 'sensor' && deviceClass === 'battery') { const property = batteryStateColorProperty(compareState); if (property) return [property]; } if (domain === 'group') { const groupDomain = computeGroupDomain(stateObj); if (groupDomain && STATE_COLORED_DOMAIN.has(groupDomain)) { return domainStateColorProperties(groupDomain, stateObj, state); } } if (STATE_COLORED_DOMAIN.has(domain)) { return domainStateColorProperties(domain, stateObj, state); } return undefined; };

const stateColorCss = (stateObj, state) => { const compareState = state !== undefined ? state : stateObj?.state; if (compareState === UNAVAILABLE) return 'var(--state-unavailable-color)'; const properties = stateColorProperties(stateObj, state); return properties ? computeCssVariable(properties) : undefined; };

const stateColorBrightness = (stateObj) => { const brightness = stateObj?.attributes?.brightness; if (typeof brightness === 'number' && computeDomain(stateObj.entity_id) !== 'plant') { return 'brightness(' + ((brightness + 245) / 5) + '%)'; } return ''; };

const DEFAULT_SEPARATOR = {
  color: '#d0d7de',
  background: '',
  style: 'solid',
  thickness: 1,
  length: '100%',
  align: 'stretch',
  opacity: 1,
  margin_top: 0,
  margin_bottom: 0,
};

class FlexCellsCard extends LitElement {
  static properties = { config: {}, hass: {} };

  static styles = css`
    .card {
      background: var(--ha-card-background, var(--card-background-color, #fff));
      color: var(--primary-text-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      font-size: 16px;
    }
    .wrap { width: 100%; border-radius: inherit; overflow: hidden; }
    .scroller { width: 100%; display: block; }
    .datatable { width: auto; min-width: 100%; border-collapse: collapse; }
    td, th { padding: 0; vertical-align: middle; white-space: nowrap; }
    thead th {
      font-weight: 700; text-align: left;
      background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
      border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.12));
    }
    .datatable.zebra tbody tr.fc-zebra-alt td {
      background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
    }
    .fcc-preview-stack {
      display: grid;
      gap: 16px;
    }
    .fcc-template-card {
      position: relative;
    }
    .fcc-template-cell {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
    }
    .fcc-template-row {
      display: inline-flex;
      align-items: stretch;
      flex-wrap: nowrap;
    }

    /* === NEW: blokada zaznaczania/kontekstu tylko dla klikanych pól === */
    .clickable, .icon.clickable, td.clickable, th.clickable {
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      /* nie ustawiamy touch-action:none, żeby nie zabić scrolla; to wystarcza */
    }

    .icon ha-icon { color: var(--state-icon-color, var(--primary-text-color)); }
    .celltext { display: inline-block; white-space: nowrap; }
    .datatable td, .datatable th { line-height: 1.15; }
    .fc-separator-row td {
      padding: 0 !important;
      background: transparent;
    }
    .fc-separator-line {
      display: block;
      height: 0;
      border: none;
    }
  
    .icon-mask { display:inline-block; vertical-align:middle; }
    .fc-entity-icon-text {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    /* === Simple HA input controls === */
    .ctrl-wrap { display:inline-flex; align-items:center; gap:8px; touch-action: pan-y; }
    .ctrl-range { width: 160px; vertical-align: middle; touch-action: pan-y !important; }
    .ctrl-range-color {
      width: 160px;
      height: 12px;
      appearance: none;
      -webkit-appearance: none;
      background: linear-gradient(90deg,
        #ff0000 0%,
        #ffcc00 10%,
        #ffff00 16.66%,
        #00ff00 33.33%,
        #00ffff 50%,
        #0000ff 66.66%,
        #ff00ff 83.33%,
        #ff0000 100%);
      border-radius: 999px;
      outline: none;
    }
    .ctrl-range-color::-webkit-slider-runnable-track {
      height: 12px;
      background: transparent;
      border-radius: 999px;
      border: 1px solid var(--divider-color,#ccc);
    }
    .ctrl-range-color::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
      background: #fff;
      cursor: pointer;
      margin-top: -4px;
    }
    .ctrl-range-color::-moz-range-track {
      height: 12px;
      background: transparent;
      border-radius: 999px;
      border: 1px solid var(--divider-color,#ccc);
    }
    .ctrl-range-color::-moz-range-progress { background: transparent; }
    .ctrl-range-color::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
      background: #fff;
      cursor: pointer;
    }
    .ctrl-color-swatch {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1px solid rgba(0,0,0,0.12);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3);
    }
    .ctrl-select, .ctrl-input { padding: 4px 6px; border: 1px solid var(--divider-color,#ddd); border-radius: 6px; background: var(--card-background-color,#fff); }
    .ctrl-button {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color,#ddd);
      background: var(--primary-background-color, #f7f7f7);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .ctrl-button ha-icon {
      --mdc-icon-size: 18px;
    }
    .ctrl-switch { vertical-align: middle; }
    .ctrl-input[type="date"],
    .ctrl-input[type="time"],
    .ctrl-input[type="datetime-local"],
    .ctrl-select {
      width: auto !important;
    }
`;

  constructor() {
    super();
    this._numberControlDrafts = new Map();
    this._attrControlDrafts = new Map();
    this._attrActivePointers = new Set();
    this._attrDraftTimestamps = new Map();
    this._customTemplateCache = new Map();
    this._narrowMedia = null;
    this._onNarrowMediaChange = null;
    this._onLocalesLoaded = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._onLocalesLoaded) {
      this._onLocalesLoaded = () => this.requestUpdate();
    }
    window.addEventListener('fcc-locales-loaded', this._onLocalesLoaded);
  }

  setConfig(config) {
    this._customTemplateCache = new Map();
    const templateColCount = (() => {
      const tplCells = config?.entity_row_template?.cells;
      if (Array.isArray(tplCells) && tplCells.length) return tplCells.length;
      if (Array.isArray(DEFAULT_AUTO_ENTITY_TEMPLATE.cells) && DEFAULT_AUTO_ENTITY_TEMPLATE.cells.length) return DEFAULT_AUTO_ENTITY_TEMPLATE.cells.length;
      return 1;
    })();
    const fallbackColCount = (() => {
      if (Array.isArray(config.rows)) {
        for (const row of config.rows) {
          if (Array.isArray(row?.cells) && row.cells.length) return row.cells.length;
        }
      }
      if (Array.isArray(config.entities) && config.entities.length) return templateColCount;
      return 1;
    })();

    const colCount =
      Number.isInteger(config.column_count) && config.column_count > 0
        ? config.column_count
        : fallbackColCount;

    const defaultCellPadding = { top: 4, right: 0, bottom: 4, left: 0 };
    const cell_padding = { ...defaultCellPadding, ...(config.cell_padding || {}) };
    const customTemplateEnabled = !!config.custom_template_enabled;
    const customTemplateHtml = typeof config.custom_template_html === 'string' ? config.custom_template_html : '';

    this.config = {
      overflow_x: true,
      header_from_first_row: false,
      zebra: false,
      column_widths: undefined,
      hide_on_narrow: undefined,
      cell_padding,
      ...config,
      column_count: colCount,
      custom_template_enabled: customTemplateEnabled,
      custom_template_html: customTemplateHtml,
    };
    this._setupNarrowMediaListener();
  }

  disconnectedCallback() {
    window.removeEventListener('fcc-locales-loaded', this._onLocalesLoaded);
    this._teardownNarrowMediaListener();
    super.disconnectedCallback();
  }

  _normalizeAutoEntity(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') return { entity: entry };
    if (typeof entry === 'object' && entry.entity) return { ...entry, entity: entry.entity };
    return null;
  }

  _resolveAutoEntityMeta(entry) {
    const normalized = this._normalizeAutoEntity(entry);
    if (!normalized?.entity) return null;
    const stateObj = this.hass?.states?.[normalized.entity];
    const attrs = { ...(stateObj?.attributes || {}), ...(normalized.attributes || {}) };
    const friendlyName = normalized.name ?? attrs.friendly_name ?? normalized.entity;
    const icon = normalized.icon ?? attrs.icon ?? '';
    const state = normalized.state ?? stateObj?.state ?? '';
    return {
      entity: normalized.entity,
      friendly_name: friendlyName,
      name: friendlyName,
      icon,
      state,
      attributes: attrs,
    };
  }

  _normalizeEntityTemplate(rawTemplate) {
    const tpl = (rawTemplate && typeof rawTemplate === 'object') ? rawTemplate : {};
    const rawCells = Array.isArray(tpl.cells) && tpl.cells.length ? tpl.cells : DEFAULT_AUTO_ENTITY_TEMPLATE.cells;
    const cells = rawCells.map((cell) => {
      const clone = deepClone(cell) || {};
      if (!clone.type) clone.type = 'string';
      if (!clone.align) {
        const wantsCenter = clone.type === 'icon' || (clone.type === 'entity' && clone.entity_display === 'icon');
        clone.align = wantsCenter ? 'center' : 'left';
      }
      return clone;
    });
    const colCount = cells.length || 1;
    const header = Array.isArray(tpl.header) ? tpl.header.slice(0, colCount) : [];
    const normalizedHeader = header.map((cell) => {
      const clone = deepClone(cell) || { type: 'string', value: '' };
      if (!clone.type) clone.type = 'string';
      if (clone.value === undefined) clone.value = '';
      return clone;
    });
    while (normalizedHeader.length && normalizedHeader.length < colCount) {
      normalizedHeader.push({ type: 'string', value: '' });
    }
    return { header: normalizedHeader, cells, colCount };
  }

  _applyTemplateTokens(value, meta) {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;
    const attrs = meta?.attributes || {};
    const replaceAttr = (match, attr) => {
      const v = attrs[attr];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    };
    let out = value.replace(/@attr:([a-zA-Z0-9_]+)/g, replaceAttr);
    out = out.replace(/@friendly_name/g, meta?.friendly_name ?? meta?.name ?? '');
    out = out.replace(/@name/g, meta?.name ?? meta?.friendly_name ?? '');
    out = out.replace(/@entity/g, meta?.entity ?? '');
    out = out.replace(/@state/g, meta?.state ?? '');
    out = out.replace(/@icon/g, meta?.icon ?? '');
    return out;
  }

  _applyTokensToAction(actionCfg, meta) {
    if (!actionCfg || typeof actionCfg !== 'object') return actionCfg;
    const next = deepClone(actionCfg) || {};
    if (next.entity) next.entity = this._applyTemplateTokens(next.entity, meta);
    if (next.navigation_path) next.navigation_path = this._applyTemplateTokens(next.navigation_path, meta);
    if (next.url_path) next.url_path = this._applyTemplateTokens(next.url_path, meta);
    if (next.service) next.service = this._applyTemplateTokens(next.service, meta);
    if (next.data && typeof next.data === 'object') {
      const dataClone = deepClone(next.data);
      Object.keys(dataClone || {}).forEach((key) => {
        dataClone[key] = this._applyTemplateTokens(dataClone[key], meta);
      });
      next.data = dataClone;
    }
    if (next.target && typeof next.target === 'object') {
      const tgtClone = { ...next.target };
      if (tgtClone.entity_id) tgtClone.entity_id = this._applyTemplateTokens(tgtClone.entity_id, meta);
      next.target = tgtClone;
    }
    if (next.perform_action && typeof next.perform_action === 'object') {
      next.perform_action = this._applyTokensToAction(next.perform_action, meta);
    }
    return next;
  }

  _materializeTemplateCell(cell, meta) {
    const clone = deepClone(cell) || { type: 'string', value: '' };
    clone.value = this._applyTemplateTokens(clone.value, meta);
    if (clone.attribute !== undefined) clone.attribute = this._applyTemplateTokens(clone.attribute, meta);
    if (clone.entity !== undefined) clone.entity = this._applyTemplateTokens(clone.entity, meta);
    if (clone.text !== undefined) clone.text = this._applyTemplateTokens(clone.text, meta);
    if (clone.tap_action) clone.tap_action = this._applyTokensToAction(clone.tap_action, meta);
    if (clone.hold_action) clone.hold_action = this._applyTokensToAction(clone.hold_action, meta);
    if (clone.double_tap_action) clone.double_tap_action = this._applyTokensToAction(clone.double_tap_action, meta);
    return clone;
  }

  _buildRowsFromEntities(cfg) {
    const entities = Array.isArray(cfg.entities) ? cfg.entities : [];
    if (!entities.length) return null;
    const tpl = this._normalizeEntityTemplate(cfg.entity_row_template);
    const rows = [];
    const hasHeader = tpl.header.length > 0;
    if (hasHeader) {
      rows.push({ cells: tpl.header });
    }
    for (const ent of entities) {
      const meta = this._resolveAutoEntityMeta(ent);
      if (!meta?.entity) continue;
      const rowCells = tpl.cells.map((cell) => this._materializeTemplateCell(cell, meta));
      rows.push({ cells: rowCells });
    }
    return { rows, colCount: tpl.colCount || 1, hasHeader };
  }

  _normalizeHideColumns(raw, colCount) {
    const total = Number.isInteger(colCount) && colCount > 0 ? colCount : 0;
    if (!Array.isArray(raw) || !raw.length || total === 0) return [];
    const seen = new Set();
    const normalized = [];
    raw.forEach((value) => {
      const num = Number(value);
      if (!Number.isInteger(num) || num <= 0) return;
      const idx = num - 1;
      if (idx < 0 || idx >= total || seen.has(idx)) return;
      seen.add(idx);
      normalized.push(idx);
    });
    return normalized.sort((a, b) => a - b);
  }

  _setupNarrowMediaListener() {
    this._teardownNarrowMediaListener();
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const cfg = this.config || {};
    const bp = parseInt(cfg.narrow_breakpoint, 10);
    if (!Number.isFinite(bp) || bp <= 0) return;
    try {
      const query = window.matchMedia(`(max-width: ${bp}px)`);
      const handler = () => this.requestUpdate();
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', handler);
      } else if (typeof query.addListener === 'function') {
        query.addListener(handler);
      }
      this._narrowMedia = query;
      this._onNarrowMediaChange = handler;
    } catch (_e) {
      this._narrowMedia = null;
      this._onNarrowMediaChange = null;
    }
  }

  _teardownNarrowMediaListener() {
    if (!this._narrowMedia || !this._onNarrowMediaChange) {
      this._narrowMedia = null;
      this._onNarrowMediaChange = null;
      return;
    }
    try {
      if (typeof this._narrowMedia.removeEventListener === 'function') {
        this._narrowMedia.removeEventListener('change', this._onNarrowMediaChange);
      } else if (typeof this._narrowMedia.removeListener === 'function') {
        this._narrowMedia.removeListener(this._onNarrowMediaChange);
      }
    } catch (_e) { /* noop */ }
    this._narrowMedia = null;
    this._onNarrowMediaChange = null;
  }

  _getActiveHiddenColumns(colCount) {
    const cfg = this.config || {};
    const hideCols = this._normalizeHideColumns(cfg.hide_on_narrow, colCount);
    if (!hideCols.length) return [];
    const bp = parseInt(cfg.narrow_breakpoint, 10);
    if (!Number.isFinite(bp) || bp <= 0) return [];
    if (this._narrowMedia && typeof this._narrowMedia.matches === 'boolean') {
      return this._narrowMedia.matches ? hideCols : [];
    }
    if (typeof window === 'undefined') return [];
    if (typeof window.matchMedia !== 'function') {
      if (typeof window.innerWidth === 'number' && Number.isFinite(window.innerWidth)) {
        return window.innerWidth <= bp ? hideCols : [];
      }
      return [];
    }
    try {
      return window.matchMedia(`(max-width: ${bp}px)`).matches ? hideCols : [];
    } catch (_e) {
      return [];
    }
  }

  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has('hass') && this._numberControlDrafts && this._numberControlDrafts.size) {
      const hassStates = this.hass?.states || {};
      let mutated = false;
      for (const [entityId, draft] of [...this._numberControlDrafts.entries()]) {
        const stateObj = hassStates[entityId];
        if (!stateObj) {
          this._numberControlDrafts.delete(entityId);
          mutated = true;
          continue;
        }
        const stateStr = stateObj.state == null ? '' : String(stateObj.state);
        if (draft === stateStr) {
          this._numberControlDrafts.delete(entityId);
          mutated = true;
          continue;
        }
        const draftNum = Number(draft);
        const stateNum = Number(stateObj.state);
        if (Number.isFinite(draftNum) && Number.isFinite(stateNum) && Math.abs(draftNum - stateNum) <= Number.EPSILON * 100) {
          this._numberControlDrafts.delete(entityId);
          mutated = true;
        }
      }
      if (mutated) this.requestUpdate();
    }

    if (changedProps.has('hass') && this._attrControlDrafts && this._attrControlDrafts.size) {
      const hassStates = this.hass?.states || {};
      let mutated = false;
      for (const [key, draft] of [...this._attrControlDrafts.entries()]) {
        if (this._attrActivePointers && this._attrActivePointers.has(key)) continue;
        const { entityId, attrPath } = this._parseAttrEditKey(key);
        if (!entityId) {
          this._attrControlDrafts.delete(key);
          mutated = true;
          continue;
        }
        const stateObj = hassStates[entityId];
        if (!stateObj) {
          this._attrControlDrafts.delete(key);
          mutated = true;
          continue;
        }
        const tree = this._buildEntityValueTree(stateObj);
        const raw = attrPath ? this._resolveEntityValuePath(stateObj, attrPath, tree) : undefined;
        if (raw === null || raw === undefined) {
          this._attrControlDrafts.delete(key);
          if (this._attrDraftTimestamps) this._attrDraftTimestamps.delete(key);
          mutated = true;
          continue;
        }
        const expected = draft && typeof draft === 'object'
          ? (draft.actual !== undefined ? draft.actual : draft.display)
          : draft;
        if (this._attrValuesEqual(raw, expected)) {
          this._attrControlDrafts.delete(key);
          if (this._attrDraftTimestamps) this._attrDraftTimestamps.delete(key);
          mutated = true;
        } else {
          const ts = this._attrDraftTimestamps ? this._attrDraftTimestamps.get(key) : null;
          const now = Date.now();
          const tooOld = ts && (now - ts > 1700);
          if (tooOld) {
            // After grace window, follow external changes.
            this._attrControlDrafts.delete(key);
            if (this._attrDraftTimestamps) this._attrDraftTimestamps.delete(key);
            mutated = true;
          }
        }
      }
      if (mutated) this.requestUpdate();
    }
  }

  // ---------- helpers ----------
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

  _getByPath(obj, path) {
    if (!obj || !path) return undefined;
    // Normalize bracket notation: a[0].b -> a.0.b
    const norm = String(path).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    let cur = obj;
    for (const key of norm) {
      const k = (Array.isArray(cur) && /^\d+$/.test(key)) ? Number(key) : key;
      if (cur == null || !(k in cur)) return undefined;
      cur = cur[k];
    }
    return cur;
  }

  _buildEntityValueTree(stateObj) {
    if (!stateObj) return null;
    const attrs = stateObj.attributes || {};
    const tree = {
      ...attrs,
      attributes: attrs,
      entity_id: stateObj.entity_id,
      state: stateObj.state,
      last_changed: stateObj.last_changed,
      last_updated: stateObj.last_updated,
    };
    if (stateObj.context !== undefined) tree.context = stateObj.context;
    return tree;
  }

  _resolveEntityValuePath(stateObj, path, cachedTree) {
    if (!stateObj || path === undefined || path === null) return undefined;
    const tree = cachedTree || this._buildEntityValueTree(stateObj);
    if (!tree) return undefined;
    return this._getByPath(tree, String(path));
  }

  _buildDateForInputDatetime(stateObj) {
    if (!stateObj) return null;
    const attrs = stateObj.attributes || {};
    const hasDate = !!attrs.has_date;
    const hasTime = !!attrs.has_time;
    const stateStr = typeof stateObj.state === 'string' ? stateObj.state : '';
    let dateFromState = null;

    if (hasDate || hasTime) {
      let year;
      let month;
      let day;
      if (hasDate) {
        const matchDate = stateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (matchDate) {
          year = Number(matchDate[1]);
          month = Number(matchDate[2]);
          day = Number(matchDate[3]);
        }
      }
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      if (hasTime) {
        const matchTime = stateStr.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
        if (matchTime) {
          hours = Number(matchTime[1]);
          minutes = Number(matchTime[2]);
          seconds = Number(matchTime[3] || '0');
        }
      }
      if (hasDate) {
        const result = new Date(
          year || 1970,
          (month || 1) - 1,
          day || 1,
          hasTime ? hours : 0,
          hasTime ? minutes : 0,
          hasTime ? seconds : 0,
        );
        if (!Number.isNaN(result.getTime())) dateFromState = result;
      } else if (hasTime) {
        const now = new Date();
        const result = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hours,
          minutes,
          seconds,
        );
        if (!Number.isNaN(result.getTime())) dateFromState = result;
      }
    }

    if (dateFromState) return dateFromState;
    return this._parseDateLikeValue(stateStr);
  }

  _parseDateLikeValue(raw) {
    if (raw === undefined || raw === null) return null;
    if (raw instanceof Date) {
      return Number.isNaN(raw.getTime()) ? null : new Date(raw.getTime());
    }
    if (typeof raw === 'number') {
      if (!Number.isFinite(raw)) return null;
      const abs = Math.abs(raw);
      const millis = abs >= 1e12 ? raw : raw * 1000;
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
      const parsed = Date.parse(normalized);
      if (!Number.isNaN(parsed)) return new Date(parsed);
      const asNumber = Number(trimmed);
      if (Number.isFinite(asNumber)) return this._parseDateLikeValue(asNumber);
    }
    return null;
  }

  _formatDateWithPattern(date, pattern, rawValue = '') {
    if (!pattern) return null;
    const hasDate = (date instanceof Date) && !Number.isNaN(date.getTime());
    const rawStr = rawValue === null || rawValue === undefined ? '' : String(rawValue);
    const locale = hasDate
      ? (this?.hass?.locale?.language || this?.hass?.language || (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en')
      : undefined;
    const tokens = ['YYYY','MMMM','REL_SHORT','REL','YY','MM','M','DD','D','HH','H','hh','h','mm','m','ss','s','RAW'];
    const mapping = { 'RAW': rawStr };
    if (hasDate) {
      const hours24 = date.getHours();
      Object.assign(mapping, {
        'YYYY': String(date.getFullYear()),
        'MMMM': new Intl.DateTimeFormat(locale, { month: 'long' }).format(date),
        'REL_SHORT': this._formatRelativeDurationText(date, locale, { short: true }),
        'REL': this._formatRelativeDurationText(date, locale),
        'YY': String(date.getFullYear()).slice(-2).padStart(2, '0'),
        'MM': String(date.getMonth() + 1).padStart(2, '0'),
        'M': String(date.getMonth() + 1),
        'DD': String(date.getDate()).padStart(2, '0'),
        'D': String(date.getDate()),
        'HH': String(hours24).padStart(2, '0'),
        'H': String(hours24),
        'hh': String(((hours24 % 12) || 12)).padStart(2, '0'),
        'h': String(((hours24 % 12) || 12)),
        'mm': String(date.getMinutes()).padStart(2, '0'),
        'm': String(date.getMinutes()),
        'ss': String(date.getSeconds()).padStart(2, '0'),
        's': String(date.getSeconds()),
      });
    }
    try {
      const pat = String(pattern || '');
      let out = '';
      for (let i = 0; i < pat.length;) {
        const ch = pat[i];
        if (ch === '[') {
          const end = pat.indexOf(']', i + 1);
          if (end === -1) {
            out += '[';
            i += 1;
            continue;
          }
          out += pat.slice(i + 1, end);
          i = end + 1;
          continue;
        }
        let matched = false;
        for (const token of tokens) {
          if (pat.startsWith(token, i) && Object.prototype.hasOwnProperty.call(mapping, token)) {
            out += mapping[token];
            i += token.length;
            matched = true;
            break;
          }
        }
        if (!matched) {
          out += ch;
          i += 1;
        }
      }
      return out;
    } catch (_e) {
      return null;
    }
  }

  _formatRelativeDurationText(date, locale, opts = {}) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const now = Date.now();
    const diff = now - date.getTime();
    if (!Number.isFinite(diff)) return '';
    const absMs = Math.abs(diff);
    const short = !!opts?.short;
    if (absMs < 1000) {
      try {
        return new Intl.RelativeTimeFormat(locale || undefined, { numeric: 'auto' }).format(0, 'second');
      } catch (_e) {
        return 'now';
      }
    }
    const units = [
      { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
      { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
      { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
      { unit: 'day', ms: 24 * 60 * 60 * 1000 },
      { unit: 'hour', ms: 60 * 60 * 1000 },
      { unit: 'minute', ms: 60 * 1000 },
      { unit: 'second', ms: 1000 },
    ];
    const baseUnit = units.find((u) => absMs >= u.ms) || units[units.length - 1];
    const parts = [];
    const baseValue = Math.max(1, Math.floor(absMs / baseUnit.ms));
    const baseText = this._formatRelativeDurationUnit(baseValue, baseUnit.unit, locale, short);
    if (baseText) parts.push(baseText);
    let remainder = absMs - (baseValue * baseUnit.ms);
    for (let idx = units.indexOf(baseUnit) + 1; idx < units.length && parts.length < 2; idx += 1) {
      const unit = units[idx];
      if (remainder >= unit.ms) {
        const value = Math.floor(remainder / unit.ms);
        if (value > 0) {
          const formatted = this._formatRelativeDurationUnit(value, unit.unit, locale, short);
          if (formatted) parts.push(formatted);
          remainder -= value * unit.ms;
        }
      }
    }
    return parts.join(short ? ' ' : ' ');
  }

  _formatRelativeDurationUnit(value, unit, locale, short = false) {
    if (!Number.isFinite(value) || value <= 0) return '';
    try {
      let formatted = new Intl.NumberFormat(locale || undefined, {
        style: 'unit',
        unit,
        unitDisplay: short ? 'narrow' : 'long',
        maximumFractionDigits: 0,
      }).format(value);
      if (short) {
        formatted = formatted
          .replace(/[\s\u00A0\u202F]+/g, '')
          .replace(/[\u2010\u2011\u2012\u2013\u2014-]+/g, '')
          .replace(/\./g, '');
      }
      return formatted;
    } catch (_e) {
      if (short) {
        const shortFallback = {
          year: 'y',
          month: 'mo',
          week: 'w',
          day: 'd',
          hour: 'h',
          minute: 'm',
          second: 's',
        };
        const suffix = shortFallback[unit] || (unit ? unit[0] : '');
        return `${value}${suffix}`;
      }
      const plural = value === 1 ? '' : 's';
      return `${value} ${unit}${plural}`;
    }
  }

  _literalizePattern(pattern) {
    if (!pattern) return '';
    const pat = String(pattern);
    let out = '';
    for (let i = 0; i < pat.length;) {
      const ch = pat[i];
      if (ch === '[') {
        const end = pat.indexOf(']', i + 1);
        if (end === -1) {
          out += ch;
          i += 1;
          continue;
        }
        out += pat.slice(i + 1, end);
        i = end + 1;
        continue;
      }
      out += ch;
      i += 1;
    }
    return out;
  }

  _formatCellDateValue(cell, stateObj, raw, isAttr) {
    const pattern = cell?.datetime_format;
    if (!pattern) return null;
    const rawStr = raw === undefined || raw === null ? '' : String(raw);
    let date = null;
    if (!isAttr) {
      const entityId = String(cell?.value || '');
      if (entityId.startsWith('input_datetime.')) {
        date = this._buildDateForInputDatetime(stateObj);
      }
    }
    if (!date) {
      date = this._parseDateLikeValue(raw);
    }
    if (date) {
      const formatted = this._formatDateWithPattern(date, pattern, rawStr);
      if (formatted !== null && formatted !== undefined) return formatted;
    }
    const formattedRaw = this._formatDateWithPattern(null, pattern, rawStr);
    if (formattedRaw !== null && formattedRaw !== undefined) return formattedRaw;
    return this._literalizePattern(pattern);
  }

  _rescaleIfConfigured(cell, n) {
    const a = Number(cell?.scale_in_min);
    const b = Number(cell?.scale_in_max);
    const c = Number(cell?.scale_out_min);
    const d = Number(cell?.scale_out_max);
    if (![a, b, c, d].every(Number.isFinite) || a === b) return n;
    let t = (n - a) / (b - a);
    // domyślnie: clamp do [0,1] — zachowuje się „intuicyjnie” dla zakresów typu 0–255 -> 0–100
    t = Math.max(0, Math.min(1, t));
    return c + t * (d - c);
  }

  _rescaleOutputToInput(cell, n) {
    const a = Number(cell?.scale_in_min);
    const b = Number(cell?.scale_in_max);
    const c = Number(cell?.scale_out_min);
    const d = Number(cell?.scale_out_max);
    if (![a, b, c, d].every(Number.isFinite) || c === d) return n;
    const t = (Number(n) - c) / (d - c);
    const clamped = Math.max(0, Math.min(1, t));
    return a + clamped * (b - a);
  }

  _normalizePrecision(precision) {
    if (precision === null || precision === undefined || precision === '') return null;
    const parsed = Number(precision);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  }

  _inferFractionDigits(value) {
    if (!Number.isFinite(value)) return 0;
    const absVal = Math.abs(value);
    let str = absVal.toString();
    if (str.includes('e') || str.includes('E')) str = absVal.toPrecision(6);
    if (!str.includes('.')) return 0;
    const fractional = str.split('.')[1];
    const trimmed = fractional.replace(/0+$/, '');
    return Math.max(0, Math.min(trimmed.length, 6));
  }

  _normalizeLocaleCode(code) {
    if (typeof code !== 'string' || !code.length) return undefined;
    let normalized = code.trim();
    const atIndex = normalized.indexOf('@');
    if (atIndex !== -1) normalized = normalized.slice(0, atIndex);
    const dotIndex = normalized.indexOf('.');
    if (dotIndex !== -1) normalized = normalized.slice(0, dotIndex);
    normalized = normalized.replace(/_/g, '-');
    return normalized || undefined;
  }

  _resolveNumberLocale(locale, prefInput) {
    const navLang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : undefined;
    const hassLang = this._normalizeLocaleCode(this?.hass?.language);
    const normalizedPref = (prefInput || 'language').toLowerCase();
    const pref = normalizedPref.replace(/-/g, '_');

    switch (pref) {
      case 'comma_decimal':
        return ['en-US', 'en'];
      case 'decimal_comma':
        return ['de', 'es', 'it'];
      case 'space_comma':
        return ['fr', 'sv', 'cs'];
      case 'system':
        return undefined;
      case 'language':
      case 'auto':
      default: {
        const langCode = this._normalizeLocaleCode(locale?.language) || hassLang || navLang;
        return langCode || undefined;
      }
    }
  }

  _formatNumberByLocale(value, precision) {
    if (!Number.isFinite(value)) return String(value);
    const locale = this.hass?.locale;
    const prefRaw = typeof locale?.number_format === 'string' ? locale.number_format : 'language';
    const pref = prefRaw.toLowerCase().replace(/-/g, '_');
    const normalizedPrecision = this._normalizePrecision(precision);

    if (pref === 'none') {
      return normalizedPrecision !== null ? value.toFixed(normalizedPrecision) : String(value);
    }

    const inferredFractionDigits = normalizedPrecision !== null ? normalizedPrecision : this._inferFractionDigits(value);
    const maxFractionDigits = Math.min(Math.max(inferredFractionDigits, normalizedPrecision !== null ? normalizedPrecision : 0), 20);

    const options = {
      useGrouping: true,
      minimumFractionDigits: normalizedPrecision !== null ? normalizedPrecision : 0,
      maximumFractionDigits: maxFractionDigits,
    };

    const localeCode = this._resolveNumberLocale(locale, pref);

    try {
      const nfLocale = localeCode || undefined;
      return new Intl.NumberFormat(nfLocale, options).format(value);
    } catch (_e) {
      return normalizedPrecision !== null ? value.toFixed(normalizedPrecision) : String(value);
    }
  }

  _sanitizeSortString(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  _normalizeDynamicEntityDisplay(mode) {
    const raw = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
    return raw === 'icon' || raw === 'icon_value' ? raw : 'value';
  }

  _resolveDynamicEntityOverwrite(cell, dyn) {
    if (!dyn || (dyn.overwrite || '').toLowerCase() !== 'entity') return null;
    const fallbackEntity = cell?.type === 'entity' ? cell?.value : '';
    const targetEntity = dyn.overwrite_entity || dyn.entity || fallbackEntity || '';
    if (!targetEntity) return null;
    const stateObj = this.hass?.states?.[targetEntity];
    if (!stateObj) return null;
    let attrPath = dyn.overwrite_attr !== undefined ? dyn.overwrite_attr : dyn.attr;
    if ((attrPath === undefined || attrPath === null || attrPath === '') && targetEntity === (cell?.value || '') && cell?.attribute) {
      attrPath = cell.attribute;
    }
    const stub = { type: 'entity', value: targetEntity };
    if (cell?.precision !== undefined) stub.precision = cell.precision;
    if (cell?.scale !== undefined) stub.scale = cell.scale;
    if (dyn.overwrite_datetime_format !== undefined) stub.datetime_format = dyn.overwrite_datetime_format;
    const setNumber = (key, raw) => {
      if (raw === undefined || raw === null || raw === '') return;
      const n = Number(raw);
      if (Number.isFinite(n)) stub[key] = n;
    };
    setNumber('scale_in_min', dyn.overwrite_scale_in_min);
    setNumber('scale_in_max', dyn.overwrite_scale_in_max);
    setNumber('scale_out_min', dyn.overwrite_scale_out_min);
    setNumber('scale_out_max', dyn.overwrite_scale_out_max);
    if (attrPath !== undefined && attrPath !== null && attrPath !== '') {
      stub.attribute = String(attrPath);
      stub.use_entity_unit = false;
      if (dyn.overwrite_unit !== undefined) stub.unit = dyn.overwrite_unit;
    } else if (dyn.overwrite_unit !== undefined) {
      stub.unit = dyn.overwrite_unit;
    }
    const displayMode = this._normalizeDynamicEntityDisplay(dyn.overwrite_entity_display);
    if (displayMode !== 'value') stub.entity_display = displayMode;
    const display = this._formatEntityCell(stub, stateObj);
    return { display, stateObj, mode: displayMode };
  }

  _getDynamicEntityOverwriteValue(cell, dyn) {
    const resolved = this._resolveDynamicEntityOverwrite(cell, dyn);
    return resolved ? resolved.display : '';
  }

  _renderDynamicEntityContent(cell, dyn, textDecoration) {
    const resolved = this._resolveDynamicEntityOverwrite(cell, dyn);
    if (!resolved) return null;
    const mode = resolved.mode || 'value';
    const textDisplay = resolved.display != null ? String(resolved.display) : '';
    if (mode === 'icon' || mode === 'icon_value') {
      const iconTemplate = this._renderEntityIconTemplate(cell, resolved.stateObj, dyn);
      if (mode === 'icon') return iconTemplate || textDisplay;
      let deco = textDecoration;
      if (deco === undefined) {
        const st = cell?.style || {};
        const underline = st.underline === undefined ? false : !!st.underline;
        const strike = !!st.strike;
        const decos = [];
        if (underline) decos.push('underline');
        if (strike) decos.push('line-through');
        deco = decos.length ? decos.join(' ') : 'none';
      }
      const decoStyle = deco && deco !== 'none' ? `text-decoration:${deco}` : '';
      const textSpan = decoStyle
        ? html`<span class="celltext" style=${decoStyle}>${textDisplay}</span>`
        : html`<span class="celltext">${textDisplay}</span>`;
      return iconTemplate
        ? html`<span class="fc-entity-icon-text">${iconTemplate}${textSpan}</span>`
        : textSpan;
    }
    return textDisplay;
  }

  _resolveDynamicOverwriteContent(cell, dyn, textDecoration) {
    if (!dyn) return null;
    const overwrite = (dyn.overwrite || '').toLowerCase();
    if (overwrite === 'icon') {
      const iconName = dyn.icon != null ? String(dyn.icon) : '';
      if (!iconName) return '';
      return html`<ha-icon style=${this._buildIconStyle(cell, dyn)} icon="${iconName}"></ha-icon>`;
    }
    if (overwrite === 'text') {
      if (dyn.text != null) return dyn.text;
      if (dyn.mask != null) return dyn.mask;
      return '';
    }
    if (overwrite === 'entity') {
      const dynContent = this._renderDynamicEntityContent(cell, dyn, textDecoration);
      if (dynContent !== null && dynContent !== undefined && dynContent !== '') return dynContent;
      if (dyn.mask != null) return dyn.mask;
      return '';
    }
    if (overwrite === 'hide') {
      if (dyn.mask != null) return dyn.mask;
      return '';
    }
    if (dyn.hide) {
      if (dyn.mask != null) return dyn.mask;
      return '';
    }
    return null;
  }

  _resolveDisplayWithDynamics(baseValue, dyn, cell) {
    if (!dyn) return baseValue ?? '';
    const overwrite = (dyn.overwrite || '').toLowerCase();
    if (overwrite === 'icon') return dyn.icon != null ? String(dyn.icon) : '';
    if (overwrite === 'text') {
      if (dyn.text != null) return String(dyn.text);
      if (dyn.mask != null) return String(dyn.mask);
      return '';
    }
    if (overwrite === 'entity') {
      const dynamicValue = this._getDynamicEntityOverwriteValue(cell, dyn);
      if (dynamicValue !== undefined && dynamicValue !== null && dynamicValue !== '') return dynamicValue;
      if (dyn.mask != null) return String(dyn.mask);
      return '';
    }
    if (overwrite === 'hide' || dyn.hide) {
      if (dyn.mask != null) return String(dyn.mask);
      return '';
    }
    return baseValue ?? '';
  }

  _buildSortKey(displayValue, tertiaryValue) {
    const display = this._sanitizeSortString(displayValue);
    const tertiaryBase = this._sanitizeSortString(tertiaryValue !== undefined ? tertiaryValue : display);
    return {
      primary: display.toLowerCase(),
      secondary: display,
      tertiary: tertiaryBase.toLowerCase(),
    };
  }

  _getCellSortKey(row, colIndex) {
    const cells = Array.isArray(row?.cells) ? row.cells : [];
    const cell = cells[colIndex] ?? { type: 'string', value: '', align: 'right' };
    const type = cell?.type || 'string';

    if (type === 'icon') {
      const base = cell?.value != null ? String(cell.value) : '';
      const dyn = this._evaluateDynColor(cell, type, base);
      const shown = this._resolveDisplayWithDynamics(base, dyn, cell);
      return this._buildSortKey(shown);
    }

    if (type === 'entity') {
      const entityId = cell?.value != null ? String(cell.value) : '';
      const stateObj = entityId ? this.hass?.states?.[entityId] : undefined;
      const displayRaw = stateObj ? this._formatEntityCell(cell, stateObj) : '';
      const display = displayRaw != null ? String(displayRaw) : '';
      const dyn = this._evaluateDynColor(cell, type, display);
      const shown = this._resolveDisplayWithDynamics(display, dyn, cell);
      return this._buildSortKey(shown);
    }

    const base = cell?.value != null ? String(cell.value) : '';
    const dyn = this._evaluateDynColor(cell, type, base);
    const shown = this._resolveDisplayWithDynamics(base, dyn, cell);
    return this._buildSortKey(shown);
  }
  _compareSortKeys(left, right, sortDesc) {
    if (!left || !right) return 0;
    const direction = sortDesc ? -1 : 1;
    let diff = left.primary.localeCompare(right.primary, undefined, SORT_LOCALE_OPTS);
    if (diff !== 0) return diff * direction;
    diff = left.secondary.localeCompare(right.secondary, undefined, SORT_LOCALE_OPTS);
    if (diff !== 0) return diff * direction;
    diff = left.tertiary.localeCompare(right.tertiary, undefined, SORT_LOCALE_OPTS);
    if (diff !== 0) return diff * direction;
    return 0;
  }

  _sortBodyRows(rows, sortColumns, sortDesc) {
    if (!Array.isArray(rows) || !rows.length) return rows;
    if (!Array.isArray(sortColumns) || !sortColumns.length) return rows;

    const sortSegment = (segment) => {
      if (!segment.length) return [];
      const prepared = segment.map((row, index) => ({
        row,
        index,
        keys: sortColumns.map((colIdx) => this._getCellSortKey(row, colIdx)),
      }));
      prepared.sort((a, b) => {
        for (let i = 0; i < sortColumns.length; i += 1) {
          const diff = this._compareSortKeys(a.keys[i], b.keys[i], sortDesc);
          if (diff !== 0) return diff;
        }
        return a.index - b.index;
      });
      return prepared.map((entry) => entry.row);
    };

    const result = [];
    let segment = [];
    rows.forEach((row) => {
      if ((row?.type || '') === 'separator') {
        if (segment.length) {
          result.push(...sortSegment(segment));
          segment = [];
        }
        result.push(row);
      } else {
        segment.push(row);
      }
    });
    if (segment.length) result.push(...sortSegment(segment));
    return result;
  }

  // === Simple input entity controls (input_boolean / input_number / input_select) ===
  _renderEntityControl(cell, stateObj, entityId) {
    const domain = (entityId || '').split('.')[0];
    if (domain === 'input_boolean' || domain === 'switch') {
      const checked = stateObj?.state === 'on';
      return html`<label class="ctrl-wrap"><input class="ctrl-switch" type="checkbox" .checked=${checked}
        @change=${(e) => this._onToggleBoolean(entityId, !!e.target.checked)} /></label>`;
    }
    if (domain === 'input_number' || domain === 'number') {
      const attrs = stateObj?.attributes || {};
      const rawMin = Number(attrs.min);
      const rawMax = Number(attrs.max);
      let min = Number.isFinite(rawMin) ? rawMin : 0;
      let max = Number.isFinite(rawMax) ? rawMax : 100;
      if (max < min) {
        const tmp = min;
        min = max;
        max = tmp;
      }
      const stepRaw = attrs.step;
      let stepAttr;
      let stepForCalc;
      if (stepRaw === 'any' || stepRaw === undefined || stepRaw === null) {
        stepAttr = 'any';
        stepForCalc = null;
      } else {
        const parsedStep = Number(stepRaw);
        if (Number.isFinite(parsedStep) && parsedStep > 0) {
          stepAttr = parsedStep;
          stepForCalc = parsedStep;
        } else {
          stepAttr = 1;
          stepForCalc = 1;
        }
      }
      const modeRaw = typeof attrs.mode === 'string' ? attrs.mode.trim().toLowerCase() : '';
      const effectiveMode = modeRaw === 'box' ? 'box' : 'slider';
      const draft = this._getNumberDraft(entityId);
      const stateValue = Number(stateObj?.state);
      let controlValue = Number.isFinite(stateValue) ? stateValue : min;
      if (draft !== undefined && draft !== null && draft !== '') {
        const draftNum = Number(draft);
        if (Number.isFinite(draftNum)) controlValue = draftNum;
      }
      controlValue = this._clampNumber(controlValue, min, max);
      if (effectiveMode === 'box') {
        const inputValue = draft !== undefined && draft !== null ? draft : (stateObj?.state ?? '');
        return html`<span class="ctrl-wrap">
          <input class="ctrl-input" type="number" min="${min}" max="${max}" step="${stepAttr}"
            .value=${String(inputValue)}
            @input=${(e) => this._onNumberInput(e, entityId)}
            @change=${(e) => this._onNumberChange(e, entityId, min, max, stepForCalc)} />
        </span>`;
      }
      const showValue = cell?.show_control_value_right !== false;
      const displayState = stateObj
        ? { ...stateObj, state: String(controlValue) }
        : { state: String(controlValue), attributes: {}, entity_id: entityId };
      return html`<span class="ctrl-wrap">
        <input class="ctrl-range" type="range" min="${min}" max="${max}" step="${stepAttr}"
          .value=${String(controlValue)}
          @input=${(e) => this._onNumberInput(e, entityId)}
          @change=${(e) => this._onNumberChange(e, entityId, min, max, stepForCalc)} />
        ${showValue ? html`<span class="ctrl-value">${this._formatEntityCell(cell, displayState)}</span>` : nothing}
      </span>`;
    }
    if (domain === 'input_select' || domain === 'select') {
      const rawOpts = stateObj?.attributes?.options;
      const opts = Array.isArray(rawOpts) ? rawOpts.map(o => String(o)) : [];
      const cur = String(stateObj?.state ?? '');
      return html`<select class="ctrl-select" .value=${cur}
        @change=${(e) => this._onSelectOption(entityId, e.target.value)}>
        ${opts.map(o => html`<option value="${o}" ?selected=${o === cur}>${o}</option>`)}
      </select>`;
    }
    if (domain === 'input_text' || domain === 'text') {
      const cur = String(stateObj?.state ?? '');
      return html`<input class="ctrl-input" type="text" .value=${cur}
    @change=${(e) => this._onSetText(entityId, e.target.value)} />`;
    }
    if (domain === 'input_datetime' || domain === 'datetime' || domain === 'date' || domain === 'time') {
      const attrs = stateObj?.attributes || {};
      const domain = entityId?.split?.('.')?.[0] || '';
      const hasDateAttr = attrs.has_date;
      const hasTimeAttr = attrs.has_time;
      const hasDate = hasDateAttr !== undefined ? !!hasDateAttr : (domain === 'input_datetime' || domain === 'datetime' || domain === 'date');
      const hasTime = hasTimeAttr !== undefined ? !!hasTimeAttr : (domain === 'input_datetime' || domain === 'datetime' || domain === 'time');
      // Build value for input controls from state string primarily
      const st = String(stateObj?.state ?? '');
      let valueStr = '';
      if (hasDate && hasTime) {
        // formats like "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS"
        const iso = st.replace(' ', 'T');
        const m = iso.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?$/);
        valueStr = m ? `${m[1]}T${m[2]}` : '';
      } else if (hasDate) {
        const m = st.match(/^(\d{4}-\d{2}-\d{2})$/);
        valueStr = m ? m[1] : '';
      } else if (hasTime) {
        const m = st.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
        valueStr = m ? m[1] : '';
      }
      if (hasDate && hasTime) {
        return html`<input class="ctrl-input" type="datetime-local" .value=${valueStr}
      @change=${(e) => this._onSetDatetime(entityId, e.target.value)} />`;
      } else if (hasDate) {
        return html`<input class="ctrl-input" type="date" .value=${valueStr}
      @change=${(e) => this._onSetDatetime(entityId, e.target.value)} />`;
      } else if (hasTime) {
        return html`<input class="ctrl-input" type="time" .value=${valueStr}
      @change=${(e) => this._onSetDatetime(entityId, e.target.value)} />`;
      }
      // Fallback: just show formatted cell value
      return this._formatEntityCell(cell, stateObj);
    }

    if (domain === 'input_button' || domain === 'button') {
      const attrs = stateObj?.attributes || {};
      const friendly = attrs.friendly_name ?? attrs.name;
      const label = (friendly && String(friendly)) || (t(this.hass, 'editor.press') || 'Press');
      const icon = attrs.icon ? String(attrs.icon) : '';
      const buttonContent = icon
        ? html`<ha-icon icon="${icon}"></ha-icon><span>${label}</span>`
        : label;
      const hasActs = this._hasCellActions(cell);
      if (hasActs) {
        return html`<button class="ctrl-button"
      @click=${(e) => { e.stopPropagation(); }}
      @pointerdown=${(e) => this._onCellPointerDown(e, cell, entityId)}
      @pointerup=${(e) => this._onCellPointerUp(e, cell, entityId)}
      @pointercancel=${(e) => this._onCellPointerCancel(e)}
      @mouseleave=${(e) => this._onCellPointerCancel(e)}
      @keydown=${(e) => this._onCellKeydown(e, cell, entityId)}>${buttonContent}</button>`;
      }
      // no actions configured -> do nothing, and don't bubble to cell
      return html`<button class="ctrl-button" @click=${(e) => { e.stopPropagation(); e.preventDefault(); }}>${buttonContent}</button>`;
    }
    return this._formatEntityCell(cell, stateObj);
  }

  _renderAttributeEditControl(cell, stateObj, attrEdit) {
    if (!attrEdit?.enabled) return null;
    const entityId = cell?.value || '';
    const attrPath = this._attrKeyPath(cell, attrEdit);
    if (!entityId || !attrPath) return null;
    const key = this._attrEditKey(cell);
    const draft = key ? this._getAttrDraft(key) : undefined;
    const tree = this._buildEntityValueTree(stateObj);
    const raw = this._resolveEntityValuePath(stateObj, attrPath, tree);
    const showValueRight = cell?.show_control_value_right !== false;
    const disabled = !attrEdit.service || !attrEdit.field || !entityId;
    const range = this._attrEffectiveRange(cell, attrEdit);

    if (attrEdit.control === 'switch') {
      const draftDisplay = typeof draft?.display === 'boolean' ? draft.display : null;
      const isChecked = draftDisplay !== null
        ? draftDisplay
        : this._attrValuesEqual(raw, attrEdit.checked) || (!this._attrValuesEqual(raw, attrEdit.unchecked) && !!raw);
      const valueSource = draft && draft.actual !== undefined ? draft.actual : raw;
      const formatted = this._formatAttrDisplayValue(valueSource, cell);
      return html`<span class="ctrl-wrap">
        <input class="ctrl-switch" type="checkbox"
          .checked=${!!isChecked}
          ?disabled=${disabled}
          @change=${(e) => this._onAttrSwitchChange(e, cell)} />
        ${showValueRight ? html`<span class="ctrl-value">${formatted || ''}</span>` : nothing}
      </span>`;
    }

    const rawNum = Number(raw);
    const stateDisplay = Number.isFinite(rawNum) ? this._rescaleIfConfigured(cell, rawNum) : rawNum;
    const draftDisplay = draft && draft.display !== undefined ? draft.display : null;
    let controlValue = draftDisplay !== null && draftDisplay !== undefined ? draftDisplay : stateDisplay;
    const min = Number.isFinite(range.min) ? range.min : 0;
    const max = Number.isFinite(range.max) ? range.max : 1;
    const step = Number.isFinite(range.step) && range.step > 0 ? range.step : 'any';
    if (!Number.isFinite(Number(controlValue))) controlValue = min;
    controlValue = Math.max(min, Math.min(max, Number(controlValue)));
    const formattedValue = this._formatAttrDisplayValue(controlValue, cell);
    const satValue = attrEdit.control === 'color'
      ? this._resolveColorSaturation(cell, attrEdit, stateObj, tree, entityId)
      : (attrEdit.control === 'color_sat' ? Number(controlValue) : null);
    const hue = attrEdit.control === 'color'
      ? Number(controlValue)
      : (attrEdit.control === 'color_sat' ? this._resolveColorHue(cell, attrEdit, stateObj, tree) : null);
    const showColorSwatch = (attrEdit.control === 'color' || attrEdit.control === 'color_sat') && showValueRight;
    const colorSwatch = showColorSwatch ? html`<span class="ctrl-color-swatch" title="${hue ?? ''} / ${satValue ?? ''}%" style="background: hsl(${hue}, ${satValue}%, 50%);"></span>` : nothing;
    const rangeClass = (attrEdit.control === 'color' || attrEdit.control === 'color_sat') ? 'ctrl-range ctrl-range-color' : 'ctrl-range';
    const satGradient = attrEdit.control === 'color_sat'
      ? `background: linear-gradient(90deg, hsl(${hue || 0},0%,50%) 0%, hsl(${hue || 0},100%,50%) 100%);`
      : '';
    const rangeStyle = satGradient;
    return html`<span class="ctrl-wrap">
      <input class=${rangeClass} type="range" min="${min}" max="${max}" step="${step}"
        .value=${String(controlValue)}
        ?disabled=${disabled}
        style=${rangeStyle}
        @pointerdown=${(e) => this._onAttrSliderPointerDown(e, cell)}
        @pointermove=${(e) => this._onAttrSliderPointerMove(e, cell)}
        @pointerup=${(e) => this._onAttrSliderPointerUp(e, cell)}
        @pointercancel=${(e) => this._onAttrSliderPointerUp(e, cell)}
        @input=${(e) => this._onAttrSliderInput(e, cell)}
        @change=${(e) => this._onAttrSliderChange(e, cell)} />
      ${showColorSwatch ? colorSwatch : (showValueRight ? html`<span class="ctrl-value">${formattedValue}</span>` : nothing)}
    </span>`;
  }

  _onToggleBoolean(entityId, isOn) {
    const svc = isOn ? 'turn_on' : 'turn_off';
    const domain = entityId?.split?.('.')[0] || 'input_boolean';
    const serviceDomain = domain === 'switch' ? 'switch' : 'input_boolean';
    try { this.hass?.callService(serviceDomain, svc, { entity_id: entityId }); } catch (e) { /* noop */ }
  }

  _onSetNumber(entityId, value) {
    if (!entityId) return;
    const domain = entityId?.split?.('.')[0] || 'input_number';
    const serviceDomain = domain === 'number' ? 'number' : 'input_number';
    try { this.hass?.callService(serviceDomain, 'set_value', { entity_id: entityId, value }); } catch (e) { /* noop */ }
  }
  _onNumberInput(event, entityId) {
    if (!event || !entityId) return;
    event.stopPropagation?.();
    const target = event.target;
    if (!target) return;
    this._setNumberDraft(entityId, target.value ?? '');
  }
  _onNumberChange(event, entityId, min, max, step) {
    if (!event || !entityId) return;
    event.stopPropagation?.();
    const target = event.target;
    if (!target) return;
    const raw = target.value ?? '';
    const normalized = this._normalizeNumberValue(raw, min, max, step);
    if (normalized === null) {
      this._clearNumberDraft(entityId);
      const fallback = this.hass?.states?.[entityId]?.state;
      const fallbackNum = Number(fallback);
      target.value = Number.isFinite(fallbackNum) ? String(fallbackNum) : '';
      return;
    }
    const current = Number(this.hass?.states?.[entityId]?.state);
    if (Number.isFinite(current) && Math.abs(current - normalized) <= Number.EPSILON * 100) {
      this._clearNumberDraft(entityId);
      target.value = String(normalized);
      return;
    }
    const normalizedStr = String(normalized);
    target.value = normalizedStr;
    this._setNumberDraft(entityId, normalizedStr);
    this._onSetNumber(entityId, normalized);
  }
  _getNumberDraft(entityId) {
    if (!entityId || !this._numberControlDrafts) return undefined;
    return this._numberControlDrafts.get(entityId);
  }
  _setNumberDraft(entityId, value) {
    if (!entityId) return;
    if (!this._numberControlDrafts) this._numberControlDrafts = new Map();
    if (this._numberControlDrafts.get(entityId) === value) return;
    this._numberControlDrafts.set(entityId, value);
    this.requestUpdate();
  }
  _clearNumberDraft(entityId) {
    if (!entityId || !this._numberControlDrafts) return;
    if (this._numberControlDrafts.delete(entityId)) this.requestUpdate();
  }

  _attrEditKey(cell) {
    const entityId = cell?.value || '';
    if (!entityId) return null;
    const attrEdit = this._normalizeAttrEditConfig(cell);
    const attrPath = this._attrKeyPath(cell, attrEdit);
    return `${entityId}||${attrPath}`;
  }

  _attrKeyPath(cell, attrEdit) {
    if (attrEdit?.control === 'color') return this._attrHuePath(cell, attrEdit);
    if (attrEdit?.control === 'color_sat') return this._attrSatPath(cell, attrEdit);
    return cell?.attribute || attrEdit?.field || '';
  }

  _attrHuePath(cell, attrEdit) {
    const isColor = attrEdit?.control === 'color' || attrEdit?.control === 'color_sat';
    const explicit = (attrEdit?.hue_path && typeof attrEdit.hue_path === 'string')
      ? attrEdit.hue_path
      : '';
    if (explicit) return explicit;
    if (cell?.attribute) return cell.attribute;
    const field = attrEdit?.field || '';
    if (field) return isColor ? `${field}.0` : field;
    return '';
  }

  _attrSatPath(cell, attrEdit) {
    const isColor = attrEdit?.control === 'color' || attrEdit?.control === 'color_sat';
    const explicit = (attrEdit?.sat_path && typeof attrEdit.sat_path === 'string')
      ? attrEdit.sat_path
      : '';
    if (explicit) return explicit;
    if (!isColor) return '';
    const huePath = this._attrHuePath(cell, attrEdit);
    if (huePath && /(\.\d+|\[\d+\])$/.test(huePath)) {
      const match = huePath.match(/(\.|\[)(\d+)(\])?$/);
      if (match) {
        const [, sep, idx, closing] = match;
        const next = Number(idx) + 1;
        const prefix = huePath.slice(0, -match[0].length);
        const open = sep === '[' ? '[' : '.';
        const close = sep === '[' ? ']' : (closing || '');
        return `${prefix}${open}${next}${close}`;
      }
    }
    const field = attrEdit?.field || '';
    return field ? `${field}.1` : '';
  }

  _snapSaturation(val) {
    if (!Number.isFinite(val)) return val;
    const rounded = Math.round(val * 1000) / 1000;
    if (Math.abs(rounded - 100) <= 0.5) return 100;
    if (Math.abs(rounded - 0) <= 0.5) return 0;
    return rounded;
  }

  _resolveColorSaturation(cell, attrEdit, stateObj, tree, entityId) {
    const satPathRaw = typeof attrEdit?.sat_path === 'string' ? attrEdit.sat_path.trim() : '';
    const satPath = satPathRaw ? satPathRaw : '';
    const satRaw = satPath && stateObj ? this._resolveEntityValuePath(stateObj, satPath, tree) : undefined;
    const satFallback = Number.isFinite(attrEdit?.sat_fallback) ? attrEdit.sat_fallback : 100;
    const cacheKey = entityId || '';
    if (!this._lastSatByEntity) this._lastSatByEntity = new Map();
    if (Number.isFinite(Number(satRaw))) {
      const sat = this._snapSaturation(this._clampNumber(Number(satRaw), 0, 100));
      if (cacheKey) this._lastSatByEntity.set(cacheKey, sat);
      return sat;
    }
    const cached = cacheKey ? this._lastSatByEntity.get(cacheKey) : undefined;
    if (Number.isFinite(Number(cached))) return this._snapSaturation(this._clampNumber(Number(cached), 0, 100));
    const sat = this._snapSaturation(this._clampNumber(satFallback, 0, 100));
    if (cacheKey) this._lastSatByEntity.set(cacheKey, sat);
    return sat;
  }

  _resolveColorHue(cell, attrEdit, stateObj, tree) {
    const huePath = this._attrHuePath(cell, attrEdit);
    const hueRaw = huePath && stateObj ? this._resolveEntityValuePath(stateObj, huePath, tree) : undefined;
    const cacheKey = cell?.value || '';
    if (!this._lastHueByEntity) this._lastHueByEntity = new Map();
    if (Number.isFinite(Number(hueRaw))) {
      const hue = this._clampNumber(Number(hueRaw), 0, 360);
      if (cacheKey) this._lastHueByEntity.set(cacheKey, hue);
      return hue;
    }
    const cached = cacheKey ? this._lastHueByEntity.get(cacheKey) : undefined;
    if (Number.isFinite(Number(cached))) return this._clampNumber(Number(cached), 0, 360);
    return 0;
  }

  _parseAttrEditKey(key) {
    if (!key) return { entityId: '', attrPath: '' };
    const [entityId, ...rest] = String(key).split('||');
    return { entityId: entityId || '', attrPath: rest.join('||') || '' };
  }

  _getAttrDraft(key) {
    if (!key || !this._attrControlDrafts) return undefined;
    return this._attrControlDrafts.get(key);
  }

  _setAttrDraft(key, draft) {
    if (!key) return;
    if (!this._attrControlDrafts) this._attrControlDrafts = new Map();
    this._attrControlDrafts.set(key, draft);
    if (!this._attrDraftTimestamps) this._attrDraftTimestamps = new Map();
    this._attrDraftTimestamps.set(key, Date.now());
    this.requestUpdate();
  }

  _clearAttrDraft(key) {
    if (!key || !this._attrControlDrafts) return;
    const removed = this._attrControlDrafts.delete(key);
    if (this._attrDraftTimestamps) this._attrDraftTimestamps.delete(key);
    if (removed) this.requestUpdate();
  }

  _attrValuesEqual(a, b) {
    if (a === b) return true;
    if ((a === undefined || a === null || a === '') && (b === undefined || b === null || b === '')) return true;
    const numA = Number(a);
    const numB = Number(b);
    if (Number.isFinite(numA) && Number.isFinite(numB)) {
      return Math.abs(numA - numB) <= Number.EPSILON * 100;
    }
    return String(a).trim() === String(b).trim();
  }

  _normalizeAttrEditConfig(cell) {
    const raw = (cell?.attr_edit && typeof cell.attr_edit === 'object') ? cell.attr_edit : {};
    const controlRaw = typeof raw.control === 'string' ? raw.control.trim().toLowerCase() : 'slider';
    const control = controlRaw === 'switch'
      ? 'switch'
      : (['color', 'color-slider', 'color_hs'].includes(controlRaw) ? 'color'
        : (['color_sat', 'color-sat', 'color_saturation'].includes(controlRaw) ? 'color_sat' : 'slider'));
    const minNum = Number(raw.min);
    const maxNum = Number(raw.max);
    const stepNum = Number(raw.step);
    const min = control === 'color' ? undefined : (Number.isFinite(minNum) ? minNum : undefined);
    const max = control === 'color' ? undefined : (Number.isFinite(maxNum) ? maxNum : undefined);
    const step = control === 'color' ? undefined : (Number.isFinite(stepNum) && stepNum > 0 ? stepNum : undefined);
    const defaultField = (control === 'color' || control === 'color_sat') ? 'hs_color' : '';
    const fieldRaw = typeof raw.field === 'string' ? raw.field.trim() : (cell?.attribute || defaultField);
    const field = control === 'color'
      ? (this._stripIndexFromPath(fieldRaw) || 'hs_color')
      : fieldRaw;
    const service = typeof raw.service === 'string' ? raw.service.trim() : '';
    const checked = raw.checked !== undefined ? raw.checked : true;
    const unchecked = raw.unchecked !== undefined ? raw.unchecked : false;
    const huePath = typeof raw.hue_path === 'string' ? raw.hue_path.trim() : '';
    const satPath = typeof raw.sat_path === 'string' ? raw.sat_path.trim() : '';
    const satFallbackNum = Number(raw.sat_fallback);
    const sat_fallback = Number.isFinite(satFallbackNum) ? satFallbackNum : 100;
    return {
      enabled: raw.enabled === true,
      control,
      min,
      max: max > min ? max : min,
      step,
      field,
      service,
      checked,
      unchecked,
      hue_path: huePath,
      sat_path: satPath,
      sat_fallback,
    };
  }

  _stripIndexFromPath(path) {
    if (typeof path !== 'string') return '';
    const trimmed = path.trim();
    if (!trimmed) return '';
    return trimmed.replace(/(\.|\[)\d+(\])?$/, '');
  }

  _normalizeAttrSliderValue(raw, range) {
    const min = Number(range?.min);
    const max = Number(range?.max);
    const step = Number(range?.step);
    return this._normalizeNumberValue(
      raw,
      Number.isFinite(min) ? min : undefined,
      Number.isFinite(max) ? max : undefined,
      Number.isFinite(step) && step > 0 ? step : undefined,
    );
  }

  _formatAttrDisplayValue(value, cell) {
    if (value === undefined || value === null) return '';
    if (Number.isFinite(Number(value))) {
      const num = Number(value);
      const formatted = this._formatNumberByLocale(num, cell?.precision);
      const unit = cell?.unit ? ` ${cell.unit}` : '';
      return `${formatted}${unit}`;
    }
    return String(value);
  }

  _attrEffectiveRange(cell, attrEdit) {
    const outMin = Number(cell?.scale_out_min);
    const outMax = Number(cell?.scale_out_max);
    const hasOutRange = Number.isFinite(outMin) && Number.isFinite(outMax) && outMin !== outMax;

    if (attrEdit?.control === 'color') {
      return { min: 0, max: 360, step: 1 };
    }
    if (attrEdit?.control === 'color_sat') {
      let min = Number.isFinite(attrEdit?.min) ? Number(attrEdit.min) : 0;
      let max = Number.isFinite(attrEdit?.max) ? Number(attrEdit.max) : 100;
      if (hasOutRange) {
        min = outMin;
        max = outMax;
      }
      if (!Number.isFinite(max) || max === min) max = min + 1;
      const step = Number.isFinite(attrEdit?.step) && attrEdit.step > 0 ? Number(attrEdit.step) : 1;
      return { min, max, step };
    }

    let min = Number.isFinite(attrEdit?.min) ? Number(attrEdit.min) : undefined;
    let max = Number.isFinite(attrEdit?.max) ? Number(attrEdit.max) : undefined;
    if (hasOutRange) {
      min = outMin;
      max = outMax;
    }
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max) || max === min) max = min + 1;

    let step = Number.isFinite(attrEdit?.step) && attrEdit.step > 0 ? Number(attrEdit.step) : undefined;
    if (!Number.isFinite(step) || step <= 0) {
      const span = Math.abs(max - min);
      step = span > 0 ? Number((span / 100).toFixed(4)) || 0.01 : 0.01;
    }
    return { min, max, step };
  }

  _onAttrSliderPointerDown(event, cell) {
    const key = this._attrEditKey(cell);
    if (!key) return;
    const attrEdit = this._normalizeAttrEditConfig(cell);
    const entityId = cell?.value || '';
    const stateObj = entityId ? this.hass?.states?.[entityId] : null;
    const tree = stateObj ? this._buildEntityValueTree(stateObj) : null;
    const attrPath = this._attrKeyPath(cell, attrEdit);
    const rawState = attrPath && stateObj ? this._resolveEntityValuePath(stateObj, attrPath, tree) : undefined;
    const stateDisplay = Number.isFinite(Number(rawState)) ? this._rescaleIfConfigured(cell, Number(rawState)) : undefined;
    const val = Number.isFinite(stateDisplay) ? stateDisplay : Number(event?.target?.value);
    this._setAttrDraft(key, {
      display: Number.isFinite(val) ? val : undefined,
      actual: Number.isFinite(val) ? this._rescaleOutputToInput(cell, val) : undefined,
    });
    if (!this._attrActivePointers) this._attrActivePointers = new Set();
    this._attrActivePointers.add(key);
    const guardVal = Number.isFinite(val) ? val : undefined;
    const guard = {
      startX: event?.clientX ?? null,
      startY: event?.clientY ?? null,
      startValue: Number.isFinite(stateDisplay) ? stateDisplay : guardVal,
      allow: false,
      blocked: false,
    };
    if (event?.target && guard.startValue !== undefined) {
      event.target.value = String(guard.startValue);
    }
    if (!this._attrPointerGuards) this._attrPointerGuards = new Map();
    this._attrPointerGuards.set(key, guard);
  }

  _onAttrSliderPointerUp(_event, cell) {
    const key = this._attrEditKey(cell);
    if (!key || !this._attrActivePointers) return;
    this._attrActivePointers.delete(key);
    if (this._attrPointerGuards) this._attrPointerGuards.delete(key);
  }

  _onAttrSliderPointerMove(event, cell) {
    if (!event) return;
    const key = this._attrEditKey(cell);
    if (!key || !this._attrPointerGuards) return;
    const guard = this._attrPointerGuards.get(key);
    if (!guard) return;
    if (guard.allow) return; // już zdecydowaliśmy, że to gest suwaka
    const x = event.clientX ?? 0;
    const y = event.clientY ?? 0;
    const dx = guard.startX !== null && guard.startX !== undefined ? x - guard.startX : 0;
    const dy = guard.startY !== null && guard.startY !== undefined ? y - guard.startY : 0;
    const threshold = 6;
    if (Math.abs(dy) > Math.abs(dx) + threshold) {
      guard.blocked = true;
      guard.allow = false;
      if (guard.startValue !== undefined && event.target) {
        event.target.value = String(guard.startValue);
      }
      event.stopPropagation?.();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy) + threshold) {
      guard.allow = true;
    }
  }

  _onAttrSliderInput(event, cell) {
    if (!event) return;
    event.stopPropagation?.();
    const key = this._attrEditKey(cell);
    if (!key) return;
    const guard = this._attrPointerGuards ? this._attrPointerGuards.get(key) : null;
    if (guard && guard.blocked) {
      if (guard.startValue !== undefined && event.target) {
        event.target.value = String(guard.startValue);
      }
      return;
    }
    if (guard && !guard.allow && event.pointerType === 'touch') {
      return;
    }
    const raw = event.target?.value ?? '';
    const display = raw === '' ? '' : Number(raw);
    const actual = Number.isFinite(display) ? this._rescaleOutputToInput(cell, display) : display;
    this._setAttrDraft(key, { display, actual });
  }

  _onAttrSliderChange(event, cell) {
    if (!event) return;
    event.stopPropagation?.();
    const key = this._attrEditKey(cell);
    const guard = this._attrPointerGuards ? this._attrPointerGuards.get(key) : null;
    if (guard && guard.blocked) {
      if (guard.startValue !== undefined && event.target) {
        event.target.value = String(guard.startValue);
      }
      this._clearAttrDraft(key);
      return;
    }
    const attrEdit = this._normalizeAttrEditConfig(cell);
    if (!attrEdit.enabled || !key) return;
    const target = event.target;
    if (!target) return;
    const raw = target.value ?? '';
    const range = this._attrEffectiveRange(cell, attrEdit);
    const normalized = this._normalizeAttrSliderValue(raw, range);
    const entityId = cell?.value || '';
    const stateObj = entityId ? this.hass?.states?.[entityId] : null;
    const tree = stateObj ? this._buildEntityValueTree(stateObj) : null;
    const attrPath = this._attrKeyPath(cell, attrEdit);
    const fallbackRaw = attrPath && stateObj ? this._resolveEntityValuePath(stateObj, attrPath, tree) : undefined;
    if (normalized === null) {
      this._clearAttrDraft(key);
      const fallbackNum = Number(fallbackRaw);
      target.value = Number.isFinite(fallbackNum) ? String(this._rescaleIfConfigured(cell, fallbackNum)) : '';
      return;
    }
    const displayValue = Number(normalized);
    const actual = this._rescaleOutputToInput(cell, displayValue);
    target.value = String(displayValue);
    this._setAttrDraft(key, { display: displayValue, actual });
    this._callAttrEditService(cell, actual);
  }

  _onAttrSwitchChange(event, cell) {
    if (!event) return;
    event.stopPropagation?.();
    const key = this._attrEditKey(cell);
    const attrEdit = this._normalizeAttrEditConfig(cell);
    if (!attrEdit.enabled || !key) return;
    const checked = !!event.target?.checked;
    const valueToSend = checked ? attrEdit.checked : attrEdit.unchecked;
    this._setAttrDraft(key, { display: checked, actual: valueToSend });
    this._callAttrEditService(cell, valueToSend);
  }

  _callAttrEditService(cell, value) {
    const attrEdit = this._normalizeAttrEditConfig(cell);
    if (!attrEdit.enabled) return;
    const serviceId = attrEdit.service || '';
    const [domain, service] = serviceId.includes('.') ? serviceId.split('.', 2) : ['', ''];
    const entityId = cell?.value || '';
    const field = attrEdit.field || cell?.attribute || '';
    if (!domain || !service || !entityId || !field) return;
    let valueToSend = value;
    if (attrEdit.control === 'color') {
      const stateObj = this.hass?.states?.[entityId];
      const tree = stateObj ? this._buildEntityValueTree(stateObj) : null;
      const sat = this._resolveColorSaturation(cell, attrEdit, stateObj, tree, entityId);
      const hueMin = Number.isFinite(attrEdit?.min) ? Number(attrEdit.min) : 0;
      const hueMax = Number.isFinite(attrEdit?.max) ? Number(attrEdit.max) : 360;
      const hue = this._clampNumber(Number(value), hueMin, hueMax);
      valueToSend = [hue, sat];
      if (!this._lastHueByEntity) this._lastHueByEntity = new Map();
      if (entityId) this._lastHueByEntity.set(entityId, hue);
    } else if (attrEdit.control === 'color_sat') {
      const stateObj = this.hass?.states?.[entityId];
      const tree = stateObj ? this._buildEntityValueTree(stateObj) : null;
      const hue = this._resolveColorHue(cell, attrEdit, stateObj, tree);
      const satMin = Number.isFinite(attrEdit?.min) ? Number(attrEdit.min) : 0;
      const satMax = Number.isFinite(attrEdit?.max) ? Number(attrEdit.max) : 100;
      const sat = this._snapSaturation(this._clampNumber(Number(value), satMin, satMax));
      valueToSend = [hue, sat];
      if (!this._lastSatByEntity) this._lastSatByEntity = new Map();
      if (entityId) this._lastSatByEntity.set(entityId, sat);
    }
    const data = { entity_id: entityId, [field]: valueToSend };
    try { this.hass?.callService(domain, service, data); } catch (_e) { /* noop */ }
  }
  _clampNumber(value, min, max) {
    let result = Number(value);
    if (!Number.isFinite(result)) {
      if (Number.isFinite(min)) return min;
      if (Number.isFinite(max)) return max;
      return 0;
    }
    if (Number.isFinite(min)) result = Math.max(min, result);
    if (Number.isFinite(max)) result = Math.min(max, result);
    return result;
  }
  _normalizeNumberValue(raw, min, max, step) {
    if (raw === undefined || raw === null) return null;
    const str = String(raw).trim();
    if (!str) return null;
    const normalizedStr = str.replace(',', '.');
    let value = Number(normalizedStr);
    if (!Number.isFinite(value)) return null;

    const minNum = Number(min);
    const maxNum = Number(max);
    if (Number.isFinite(minNum) && value < minNum) value = minNum;
    if (Number.isFinite(maxNum) && value > maxNum) value = maxNum;

    const stepNum = Number(step);
    if (Number.isFinite(stepNum) && stepNum > 0) {
      const base = Number.isFinite(minNum) ? minNum : 0;
      const steps = Math.round((value - base) / stepNum);
      value = base + steps * stepNum;
      if (Number.isFinite(minNum) && value < minNum) value = minNum;
      if (Number.isFinite(maxNum) && value > maxNum) value = maxNum;
      const decimals = Math.min(
        Math.max(this._inferFractionDigits(stepNum), this._inferFractionDigits(base)),
        6
      );
      if (decimals > 0) value = Number(value.toFixed(decimals));
      if (Number.isFinite(minNum) && value < minNum) value = minNum;
      if (Number.isFinite(maxNum) && value > maxNum) value = maxNum;
    }

    return Number.isFinite(value) ? value : null;
  }
  
  _rowCssClass(index) {
    return `fcc-row-css-${index}`;
  }

  _cellCssClass(rowIndex, cellIndex) {
    return `fcc-cell-css-${rowIndex}-${cellIndex}`;
  }

  _defaultRowCss() {
    return `tr {\n   background-color: yellow;\n   border: 2px dashed red;\n}\n`;
  }

  _defaultCellCss() {
    return `th, td {\n   background-color: yellow;\n   border: 2px dashed red;\n}\n`;
  }

  _collectCustomCss(rows) {
    const blocks = [];
    if (!Array.isArray(rows)) return blocks;
    rows.forEach((row, rowIndex) => {
      if (row?.custom_css_enabled === true) {
        const cssText = typeof row.custom_css === 'string' && row.custom_css.trim()
          ? row.custom_css
          : this._defaultRowCss();
        const scoped = this._scopeCss(cssText, `.${this._rowCssClass(rowIndex)}`, 'row');
        if (scoped) blocks.push(scoped);
      }
      const cells = Array.isArray(row?.cells) ? row.cells : [];
      cells.forEach((cell, cellIndex) => {
        if (cell?.custom_css_enabled === true) {
          const cssText = typeof cell.custom_css === 'string' && cell.custom_css.trim()
            ? cell.custom_css
            : this._defaultCellCss();
          const scoped = this._scopeCss(cssText, `.${this._cellCssClass(rowIndex, cellIndex)}`, 'cell');
          if (scoped) blocks.push(scoped);
        }
      });
    });
    return blocks;
  }

  _scopeCss(cssText, scope, mode = 'row') {
    const text = typeof cssText === 'string' ? cssText : '';
    const trimmed = text.trim();
    if (!trimmed) return '';
    const blocks = [];
    const regex = /([^{}]+)\{([^{}]*)\}/g;
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
      const selectorPart = match[1];
      const body = match[2].trim();
      if (!selectorPart || !body) continue;
      const scopedSelectors = Array.from(new Set(
        selectorPart
          .split(',')
          .map((sel) => this._applyScopeToSelector(sel, scope, mode))
          .filter(Boolean)
      ));
      if (scopedSelectors.length) {
        blocks.push(`${scopedSelectors.join(', ')} { ${body} }`);
      }
    }
    return blocks.join('\n');
  }

  _applyScopeToSelector(selector, scope, mode) {
    if (!selector) return '';
    let sel = selector.trim();
    if (!sel) return '';
    if (sel.startsWith('@')) return ''; // skip at-rules
    if (sel.includes(':host')) sel = sel.replace(/:host/g, scope);
    if (sel.includes('&')) sel = sel.replace(/&/g, scope);
    if (mode === 'cell') {
      const tagMatch = sel.match(/^(th|td)\b/i);
      if (tagMatch) {
        const tag = tagMatch[0];
        const tagLower = tag.toLowerCase();
        const after = sel.slice(tagMatch[0].length);
        const rest = after.trimStart();
        const hadLeadingWhitespace = /^\s/.test(after);
        const attachDirect = rest.length > 0 && !hadLeadingWhitespace && (rest.startsWith(':') || rest.startsWith('.') || rest.startsWith('[') || rest.startsWith('#'));
        const applyRest = (base) => {
          if (!rest) return base;
          if (attachDirect) return `${base}${rest}`;
          return `${base} ${rest}`.trim();
        };
        const selectors = new Set();
        selectors.add(applyRest(`${tag}${scope}`));
        const templateBase = `.fcc-template-cell[data-fcc-origin="${tagLower}"]${scope}`;
        selectors.add(applyRest(templateBase));
        return Array.from(selectors).filter(Boolean).join(', ');
      }
    }
    if (mode === 'row') {
      const rowMatch = sel.match(/^tr\b/i);
      if (rowMatch) {
        const after = sel.slice(rowMatch[0].length);
        const rest = after.trim();
        const compose = (base, part) => {
          const trimmed = typeof part === 'string' ? part.trim() : '';
          if (!trimmed) return base;
          const first = trimmed[0];
          if (first === ':' || first === '.' || first === '[' || first === '#') {
            return `${base}${trimmed}`;
          }
          if (first === '>' || first === '+' || first === '~') {
            return `${base} ${trimmed}`;
          }
          return `${base} ${trimmed}`.trim();
        };
        const selectors = new Set();
        selectors.add(rest ? compose(scope, rest) : scope);
        const adapt = (value) => {
          if (!value) return value;
          return value
            .replace(/\btd\b/gi, '.fcc-template-cell[data-fcc-origin="td"]')
            .replace(/\bth\b/gi, '.fcc-template-cell[data-fcc-origin="th"]');
        };
        const templateRest = adapt(rest);
        const addTemplateSelector = (base) => {
          if (!base) return;
          if (templateRest && templateRest.trim()) {
            selectors.add(compose(base, templateRest));
            const condensed = templateRest.replace(/\s+(\.fcc-template-cell\b)/g, '$1');
            if (condensed !== templateRest) {
              selectors.add(compose(base, condensed));
            }
          } else {
            selectors.add(`${base}.fcc-template-row`);
          }
        };
        addTemplateSelector(scope);
        const rowIndexMatch = scope.match(/\.fcc-row-css-(\d+)/);
        if (rowIndexMatch) {
          addTemplateSelector(`[data-fcc-row-index="${rowIndexMatch[1]}"]`);
        }
        return Array.from(selectors).filter(Boolean).join(', ');
      }
    }
    if (sel.startsWith(scope)) return sel;
    return `${scope} ${sel}`.replace(/\s+/g, ' ').trim();
  }
  _onSelectOption(entityId, option) {
    const domain = entityId?.split?.('.')[0] || 'input_select';
    const serviceDomain = domain === 'select' ? 'select' : 'input_select';
    try { this.hass?.callService(serviceDomain, 'select_option', { entity_id: entityId, option }); } catch (e) { /* noop */ }
  }


  _formatEntityCell(cell, stateObj) {
    const isAttr = !!cell?.attribute;
    let source;

    if (isAttr) {
      const path = cell?.attribute;
      const tree = this._buildEntityValueTree(stateObj);
      source = this._resolveEntityValuePath(stateObj, path, tree);
    } else {
      const domain = String(cell?.value || '').split('.')[0];
      if (domain === 'input_button' || domain === 'button') {
        const nm = stateObj?.attributes?.friendly_name ?? stateObj?.attributes?.name;
        if (nm !== undefined) return String(nm);
      }
      source = stateObj?.state;
    }

    const hasValue = source !== undefined && source !== null;
    let textValue;

    if (!hasValue) {
      textValue = 'n/a';
    } else {
      const maybeDate = this._formatCellDateValue(cell, stateObj, source, isAttr);
      if (maybeDate !== null) {
        textValue = maybeDate;
      } else if (this._isNumericState(source)) {
        let num = Number(source);
        num = this._rescaleIfConfigured(cell, num);
        textValue = this._formatNumberByLocale(num, cell?.precision);
      } else {
        textValue = (typeof source === 'object') ? JSON.stringify(source) : String(source);
      }
    }

    let unit = '';
    if (isAttr) {
      unit = cell?.unit ?? '';
    } else {
      const useEntityUnit = cell?.use_entity_unit !== false;
      unit = useEntityUnit ? (stateObj?.attributes?.unit_of_measurement ?? '') : (cell?.unit ?? '');
    }

    return `${textValue}${unit ? ` ${unit}` : ''}`;
  }

  // === Dynamic coloring helpers (simple rules) ===
  _coerceNumber(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
    // normalize decimal comma and trim
    const s = String(v).trim().replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  _evaluateDynColor(cell, type, displayText) {
    const rules = Array.isArray(cell?.dyn_color) ? cell.dyn_color : [];
    if (!rules.length) return null;

    const res = {}; // { bg, fg, hide, mask }
    const treeCache = new Map();
    const readAttr = (stObj, attrPath) => {
      if (!stObj || attrPath === undefined || attrPath === null) return undefined;
      const entityId = stObj.entity_id;
      let tree = entityId ? treeCache.get(entityId) : undefined;
      if (!tree) {
        tree = this._buildEntityValueTree(stObj);
        if (entityId && tree) treeCache.set(entityId, tree);
      }
      if (!tree) return undefined;
      return this._resolveEntityValuePath(stObj, attrPath, tree);
    };

    const normalizeConditions = (rule) => {
      if (Array.isArray(rule?.conditions) && rule.conditions.length) return rule.conditions;
      return [{ entity: rule?.entity, attr: rule?.attr, op: rule?.op, val: rule?.val, val2: rule?.val2, src: rule?.src }];
    };
    const normalizeMatch = (rule) => {
      const raw = (rule?.match || rule?.condition_match || '').toLowerCase();
      return (raw === 'any' || raw === 'or') ? 'any' : 'all';
    };

    for (const r of rules) {
      if (!r || typeof r !== 'object') continue;
      const conds = normalizeConditions(r);
      const matchMode = normalizeMatch(r);

      const evaluateCondition = (cond) => {
        const op = (cond?.op || r.op || '=');
        const condEntity = cond?.entity ?? r.entity;
        const condAttr = cond?.attr ?? r.attr;
        const condVal = cond?.val ?? r.val;
        const condVal2 = cond?.val2 ?? r.val2;
        const condSrc = cond?.src ?? r.src;
        let sourceVal;
        let isThisEntity = false; // for rescale

        if (condEntity) {
          const stObj = this.hass?.states?.[condEntity];
          sourceVal = condAttr ? readAttr(stObj, condAttr) : stObj?.state;
          isThisEntity = (type === 'entity' && condEntity === cell?.value);
        } else if (condSrc) {
          const src = condSrc || 'this_display';
          if (src === 'this_display') {
            sourceVal = displayText ?? (cell?.value ?? '');
          } else if (src === 'this_state') {
            if (type === 'entity') {
              const stObj = this.hass?.states?.[cell?.value];
              sourceVal = stObj?.state;
            } else {
              sourceVal = displayText ?? (cell?.value ?? '');
            }
          } else if (src === 'this_attr') {
            if (type === 'entity') {
              const stObj = this.hass?.states?.[cell?.value];
              sourceVal = readAttr(stObj, condAttr);
            }
          } else if (src === 'other_state') {
            const stObj = this.hass?.states?.[condEntity];
            sourceVal = stObj?.state;
          } else if (src === 'other_attr') {
            const stObj = this.hass?.states?.[condEntity];
            sourceVal = readAttr(stObj, condAttr);
          } else {
            sourceVal = displayText ?? (cell?.value ?? '');
          }
          isThisEntity =
            (type === 'entity') &&
            (src === 'this_display' || src === 'this_state' || src === 'this_attr');
        } else {
          // default: this cell visible value
          sourceVal = displayText ?? (cell?.value ?? '');
          isThisEntity = (type === 'entity');
        }

        const isNumOp = op === '>' || op === '>=' || op === '<' || op === '<=' || op === 'between';
        let match = false;

        if (isNumOp) {
          let num = this._coerceNumber(sourceVal);
          if (isThisEntity && Number.isFinite(num)) {
            num = this._rescaleIfConfigured(cell, num);
          }
          if (!Number.isFinite(num)) {
            match = false;
          } else if (op === 'between') {
            const a = this._coerceNumber(condVal);
            const b = this._coerceNumber(condVal2);
            if (Number.isFinite(a) && Number.isFinite(b)) {
              const min = Math.min(a, b);
              const max = Math.max(a, b);
              match = (num >= min && num <= max);
            } else {
              match = false;
            }
          } else {
            const ref = this._coerceNumber(condVal);
            if (!Number.isFinite(ref)) {
              match = false;
            } else {
              if (op === '>') match = num > ref;
              else if (op === '>=') match = num >= ref;
              else if (op === '<') match = num < ref;
              else if (op === '<=') match = num <= ref;
            }
          }
        } else if (op === 'contains' || op === 'not_contains') {
          const s = String(sourceVal ?? '').toLowerCase();
          const needle = String(condVal ?? '').toLowerCase();
          match = s.includes(needle);
          if (op === 'not_contains') match = !match;
        } else {
          const leftNum = this._coerceNumber(sourceVal);
          const rightNum = this._coerceNumber(condVal);
          if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) {
            match = (leftNum === rightNum);
          } else {
            const a = String(sourceVal ?? '').toLowerCase();
            const b = String(condVal ?? '').toLowerCase();
            match = (a === b);
          }
          if (op === '!=') match = !match;
        }

        return !!match;
      };

      let matchesRule = matchMode === 'any' ? false : true;
      for (const cond of conds) {
        const condMatch = evaluateCondition(cond);
        if (matchMode === 'any') {
          if (condMatch) { matchesRule = true; break; }
        } else {
          if (!condMatch) { matchesRule = false; break; }
        }
      }

      if (matchesRule) {
        if (r.bg) res.bg = r.bg;
        if (r.fg) res.fg = r.fg;
        if (r.visibility) {
          const visRaw = String(r.visibility).toLowerCase();
          if (visRaw === 'visible' || visRaw === 'hidden') res.visibility = visRaw;
        }
        const ow = (r.overwrite || '').toLowerCase();
        if (ow === 'hide') {
          res.hide = true;
          res.mask = '';
          res.overwrite = 'hide';
        } else if (ow === 'text') {
          res.hide = true;
          res.mask = r.text || '';
          res.overwrite = 'text';
          res.text = r.text || '';
        } else if (ow === 'icon') {
          res.hide = true;
          res.overwrite = 'icon';
          res.icon = r.icon || '';
        } else if (ow === 'entity') {
          res.hide = true;
          res.overwrite = 'entity';
          if (r.overwrite_entity !== undefined) res.overwrite_entity = r.overwrite_entity;
          else if (r.entity !== undefined) res.overwrite_entity = r.entity;
          if (r.overwrite_attr !== undefined) res.overwrite_attr = r.overwrite_attr;
          else if (r.attr !== undefined) res.overwrite_attr = r.attr;
          if (r.overwrite_datetime_format !== undefined) res.overwrite_datetime_format = r.overwrite_datetime_format;
          if (r.overwrite_entity_display !== undefined) res.overwrite_entity_display = r.overwrite_entity_display;
          if (r.overwrite_scale_in_min !== undefined) res.overwrite_scale_in_min = r.overwrite_scale_in_min;
          if (r.overwrite_scale_in_max !== undefined) res.overwrite_scale_in_max = r.overwrite_scale_in_max;
          if (r.overwrite_scale_out_min !== undefined) res.overwrite_scale_out_min = r.overwrite_scale_out_min;
          if (r.overwrite_scale_out_max !== undefined) res.overwrite_scale_out_max = r.overwrite_scale_out_max;
          if (r.overwrite_unit !== undefined) res.overwrite_unit = r.overwrite_unit;
        } else {
          if (r.hide !== undefined) res.hide = !!r.hide;
          if (r.mask !== undefined) res.mask = r.mask;
        }
      }
    }
    return res;
  }



  _evaluateRowRules(row) {
    const rules = Array.isArray(row?.dyn_row_rules) ? row.dyn_row_rules : [];
    if (!rules.length) return null;
    const stub = { dyn_color: rules };
    const res = this._evaluateDynColor(stub, 'row', undefined);
    if (!res) return null;
    const out = {};
    if (res.bg) out.bg = res.bg;
    if (res.fg) out.fg = res.fg;
    const vis = typeof res.visibility === 'string' ? res.visibility.toLowerCase() : null;
    if (vis === 'hidden' || vis === 'visible') out.visibility = vis;
    return Object.keys(out).length ? out : null;
  }



  _buildTextStyle(cell, type, align, dyn, options = {}) {
    const st = cell?.style || {};
    const pad = this.config?.cell_padding || { top: 4, right: 0, bottom: 4, left: 0 };
    const parts = [
      `padding:${pad.top}px ${pad.right}px ${pad.bottom}px ${pad.left}px`,
      `text-align:${align}`,
    ];

    const underline = st.underline === undefined ? false : !!st.underline;
    const strike = !!st.strike;
    const decos = [];
    if (underline) decos.push('underline');
    if (strike) decos.push('line-through');
    const textDecoration = decos.length ? decos.join(' ') : 'none';
    if (!options?.skipTextDecoration) parts.push(`text-decoration:${textDecoration}`);

    if (st.bold) parts.push('font-weight:700');
    if (st.italic) parts.push('font-style:italic');
    if (st.background) parts.push(`background:${st.background}`);
    if (st.color) parts.push(`color:${st.color}`);

    const globalSize = this.config?.text_size;
    if (st.font_size) parts.push(`font-size:${st.font_size}`);
    else if (globalSize) parts.push(`font-size:${globalSize}`);

    if (st.text_transform) parts.push(`text-transform:${st.text_transform}`);
    if (st.letter_spacing) parts.push(`letter-spacing:${st.letter_spacing}`);
    if (dyn && dyn.bg) parts.push(`background:${dyn.bg}`);
    if (dyn && dyn.fg) parts.push(`color:${dyn.fg}`);
    return {
      style: parts.join(';'),
      textDecoration,
    };
  }

  _buildIconStyle(cell, dyn, stateObj = undefined) {
    const st = cell?.style || {};
    const parts = [];
    const visuals = stateObj ? this._computeStateIconVisuals(stateObj) : null;
    const applyColor = (value) => {
      if (!value) return;
      parts.push('color:' + value);
      parts.push('--state-icon-color:' + value);
      parts.push('--icon-color:' + value);
    };
    const dynColor = dyn?.fg;
    const styleColor = st.color;
    if (dynColor) {
      applyColor(dynColor);
    } else if (styleColor) {
      applyColor(styleColor);
    } else if (visuals?.color) {
      applyColor(visuals.color);
    }
    if (visuals?.filter) {
      parts.push('filter:' + visuals.filter);
    }
    const iconSize = st.icon_size || '';
    if (iconSize) parts.push('--mdc-icon-size:' + iconSize);
    return parts.join(';');
  }

  _computeStateIconVisuals(stateObj) {
    if (!stateObj) return {};
    const attrs = stateObj.attributes || {};
    let color = stateColorCss(stateObj);
    if (Array.isArray(attrs.rgb_color) && attrs.rgb_color.length === 3) {
      color = this._rgbToCss(attrs.rgb_color);
    } else if (Array.isArray(attrs.hs_color) && attrs.hs_color.length >= 2) {
      const rgbFromHs = this._hsbToRgb(attrs.hs_color[0], attrs.hs_color[1], 1);
      color = this._rgbToCss(rgbFromHs);
    }
    const hvacAction = attrs.hvac_action;
    if (hvacAction && CLIMATE_HVAC_ACTION_TO_MODE[hvacAction]) {
      const hvacColor = stateColorCss(stateObj, CLIMATE_HVAC_ACTION_TO_MODE[hvacAction]);
      if (hvacColor) color = hvacColor;
    }
    if (!color && stateActive(stateObj)) {
      color = 'var(--state-icon-active-color, var(--primary-color))';
    }
    const filter = stateColorBrightness(stateObj) || '';
    return { color, filter };
  }
  _hsbToRgb(h, s, b) {
    const hueRaw = Number.isFinite(Number(h)) ? Number(h) : 0;
    const hue = ((hueRaw % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(1, Number(s) / 100));
    const bri = Math.max(0, Math.min(1, Number.isFinite(Number(b)) ? Number(b) : 1));
    const c = bri * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = bri - c;
    let r1 = 0, g1 = 0, b1 = 0;
    const segment = Math.floor(hue / 60);
    switch (segment) {
      case 0: r1 = c; g1 = x; b1 = 0; break;
      case 1: r1 = x; g1 = c; b1 = 0; break;
      case 2: r1 = 0; g1 = c; b1 = x; break;
      case 3: r1 = 0; g1 = x; b1 = c; break;
      case 4: r1 = x; g1 = 0; b1 = c; break;
      default: r1 = c; g1 = 0; b1 = x; break;
    }
    return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
  }

  _rgbToCss(rgb, brightness) {
    if (!Array.isArray(rgb) || rgb.length !== 3) return '';
    const clamp = (val) => Math.max(0, Math.min(255, Math.round(Number(val) || 0)));
    const [r, g, b] = [clamp(rgb[0]), clamp(rgb[1]), clamp(rgb[2])];
    if (brightness === undefined) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    const alpha = Math.max(0.2, Math.min(1, brightness));
    if (alpha >= 0.999) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }
  _getEntityDisplayMode(cell) {
    const mode = cell?.entity_display;
    return mode === "icon" || mode === "icon_value" ? mode : "value";
  }

  _renderEntityIconTemplate(cell, stateObj, dyn) {
    const iconStyle = this._buildIconStyle(cell, dyn, stateObj);
    if (dyn?.overwrite === "icon") {
      const iconName = dyn.icon != null ? String(dyn.icon) : "";
      if (!iconName) return "";
      return html`<ha-icon style=${iconStyle} icon="${iconName}"></ha-icon>`;
    }
    if (!stateObj) return "";
    if (customElements.get("ha-state-icon")) {
      return html`<ha-state-icon style=${iconStyle} .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>`;
    }
    const attrIcon = stateObj?.attributes?.icon;
    return attrIcon ? html`<ha-icon style=${iconStyle} icon="${attrIcon}"></ha-icon>` : "";
  }

  _buildEntityDisplayContent(cell, stateObj, display, dyn, textDecoration, presetMode) {
    const mode = presetMode || this._getEntityDisplayMode(cell);
    const textDisplay = display != null ? String(display) : "";
    const overwrite = (dyn?.overwrite || "").toLowerCase();

    if (overwrite === "icon") {
      const iconTemplate = this._renderEntityIconTemplate(cell, stateObj, dyn);
      return iconTemplate || "";
    }
    if (overwrite === "text") {
      return dyn?.text ?? dyn?.mask ?? "";
    }
    if (overwrite === "entity") {
      const dynamicValue = this._renderDynamicEntityContent(cell, dyn, textDecoration);
      if (dynamicValue !== null && dynamicValue !== undefined && dynamicValue !== '') {
        return dynamicValue;
      }
      return dyn?.mask || "";
    }
    if (overwrite === "hide") {
      return dyn?.mask || "";
    }
    if (dyn?.hide) {
      return dyn.mask || "";
    }

    const wantsIcon = mode === "icon" || mode === "icon_value";
    const iconTemplate = wantsIcon ? this._renderEntityIconTemplate(cell, stateObj, dyn) : null;
    if (mode === "icon") {
      return iconTemplate || textDisplay;
    }
    if (mode === "icon_value") {
      let deco = textDecoration;
      if (deco === undefined) {
        const st = cell?.style || {};
        const underline = st.underline === undefined ? false : !!st.underline;
        const strike = !!st.strike;
        const decos = [];
        if (underline) decos.push("underline");
        if (strike) decos.push("line-through");
        deco = decos.length ? decos.join(" ") : "none";
      }
      const decoStyle = deco && deco !== "none" ? `text-decoration:${deco}` : "";
      const textSpan = decoStyle
        ? html`<span class="celltext" style=${decoStyle}>${textDisplay}</span>`
        : html`<span class="celltext">${textDisplay}</span>`;
      if (iconTemplate) {
        return html`<span class="fc-entity-icon-text">${iconTemplate}${textSpan}</span>`;
      }
      return textSpan;
    }
    return textDisplay;
  }
  // ---------- Actions ----------
  _hasAction(cfg) { return !!(cfg && cfg.action && cfg.action !== 'none'); }

  // filter out more-info/toggle for icon/string
  _sanitizeActionForCell(cell, actionCfg) {
    if (!actionCfg) return undefined;
    const type = (cell?.type || 'string').toLowerCase();
    const a = actionCfg?.action;
    if ((type === 'icon' || type === 'string') && (a === 'more-info' || a === 'toggle')) {
      return undefined;
    }
    return actionCfg;
  }
  _getSanitizedActions(cell) {
    return {
      tap: this._sanitizeActionForCell(cell, cell?.tap_action),
      hold: this._sanitizeActionForCell(cell, cell?.hold_action),
      dbl: this._sanitizeActionForCell(cell, cell?.double_tap_action),
    };
  }
  _hasCellActions(cell) {
    const s = this._getSanitizedActions(cell);
    return this._hasAction(s.tap) || this._hasAction(s.hold) || this._hasAction(s.dbl);
  }

  _tapActionIsExplicitNone(cell) {
    if (!cell) return false;
    const action = cell?.tap_action?.action;
    return action === 'none';
  }

  _ensureTarget(target, entityId) {
    const t = { ...(target || {}) };
    if (!t.entity_id && entityId) t.entity_id = entityId;
    return Object.keys(t).length ? t : undefined;
  }

  _callService(domain, service, data, target) {
    const t = target && Object.keys(target).length ? target : undefined;
    const hasEntity = t && t.entity_id;
    if (hasEntity) {
      const d = { ...(data || {}) };
      if (d.entity_id === undefined) d.entity_id = t.entity_id;
      return this.hass?.callService(domain, service, d);
    }
    return this.hass?.callService(domain, service, data, t);
  }

  async _runPerformAction(inner, entityId, outerTarget, outerData) {
    // ujednolicenie: string -> obiekt
    let obj = inner;
    if (typeof inner === 'string') {
      obj = { service: inner };
    }

    obj = obj || {};
    const action = obj.action;
    const target = this._ensureTarget(obj.target || outerTarget, entityId);
    const payload = obj.data || obj.service_data || outerData || undefined;

    if (action === 'toggle') {
      return this._callService('homeassistant', 'toggle', undefined, target);
    }
    if (action === 'call_service' || action === 'call-service' || obj.service) {
      const svc = obj.service || '';
      const [domain, service] = svc.split('.', 2);
      if (!domain || !service) return;
      return this._callService(domain, service, payload, target);
    }
  }

  async _runAction(actionCfg = {}, entityId) {
    if (actionCfg?.action === 'perform-action' || actionCfg?.action === 'perform_action') {
      const inner = actionCfg.perform_action || actionCfg.performAction || {};
      const outerTarget = actionCfg.target;
      const outerData = actionCfg.data || actionCfg.service_data;
      return this._runPerformAction(inner, entityId, outerTarget, outerData);
    }

    const a = actionCfg?.action;
    if (!a || a === 'none') return;

    const actionEntity = actionCfg.entity || entityId;
    const target = this._ensureTarget(actionCfg.target, actionEntity);
    const payload = actionCfg.data || actionCfg.service_data || undefined;

    switch (a) {
      case 'more-info':
        this._openMoreInfo(actionEntity || target?.entity_id);
        break;
      case 'toggle':
        this._callService('homeassistant', 'toggle', undefined, target);
        break;
      case 'call-service': {
        const svc = actionCfg.service || '';
        const [domain, service] = svc.split('.', 2);
        if (!domain || !service) return;
        this._callService(domain, service, payload, target);
        break;
      }
      case 'navigate': {
        const path = actionCfg.navigation_path || '/';
        try {
          window.history.pushState(null, '', path);
          this.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false }, bubbles: true, composed: true }));
        } catch {
          window.location.assign(path);
        }
        break;
      }
      case 'url': {
        const url = actionCfg.url_path || '/';
        const t = actionCfg.new_tab ? '_blank' : '_self';
        window.open(url, t);
        break;
      }
      default:
        break;
    }
  }

  // --- input handling: tap / double-tap / hold ---
  _onCellKeydown(e, cell, entityId) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    const tap = this._sanitizeActionForCell(cell, cell?.tap_action);
    if (this._hasAction(tap)) {
      this._runAction(tap, entityId);
    } else if (!this._hasCellActions(cell) && !this._tapActionIsExplicitNone(cell) && cell?.type === 'entity' && entityId) {
      this._openMoreInfo(entityId);
    }
  }

  _onCellPointerDown(e, cell, entityId) {
    e.stopPropagation();
    /* NEW: zgaś domyślne (zaznaczanie/callout) – zwłaszcza iOS */
    try { e.preventDefault(); } catch (_) { }
    const el = e.currentTarget;
    el.__lastTapTs = el.__lastTapTs || 0;

    const hold = this._sanitizeActionForCell(cell, cell?.hold_action);
    if (this._hasAction(hold)) {
      el.__holdFired = false;
      el.__holdTimer = window.setTimeout(() => {
        el.__holdFired = true;
        if (el.__tapTimer) { clearTimeout(el.__tapTimer); el.__tapTimer = null; }
        this._runAction(hold, entityId);
      }, 550);
    }
  }
  _cancelTimers(el) { if (!el) return; if (el.__holdTimer) { clearTimeout(el.__holdTimer); el.__holdTimer = null; } }
  _onCellPointerCancel(e) { e.stopPropagation(); this._cancelTimers(e.currentTarget); }

  _onCellPointerUp(e, cell, entityId) {
    e.stopPropagation();
    const el = e.currentTarget;
    if (el.__holdFired) { this._cancelTimers(el); return; }
    this._cancelTimers(el);

    const dblWindow = 360;
    const now = e.timeStamp || Date.now();
    const since = now - (el.__lastTapTs || 0);

    const dbl = this._sanitizeActionForCell(cell, cell?.double_tap_action);
    const tap = this._sanitizeActionForCell(cell, cell?.tap_action);

    const hasDouble = this._hasAction(dbl);
    const hasTap = this._hasAction(tap);

    if (hasDouble && since > 0 && since < dblWindow && el.__tapTimer) {
      clearTimeout(el.__tapTimer);
      el.__tapTimer = null;
      el.__lastTapTs = 0;
      this._runAction(dbl, entityId);
      return;
    }

    if (hasDouble) {
      if (el.__tapTimer) clearTimeout(el.__tapTimer);
      el.__lastTapTs = now;
      el.__tapTimer = window.setTimeout(() => {
        el.__tapTimer = null;
        el.__lastTapTs = 0;
        if (hasTap) {
          this._runAction(tap, entityId);
        } else if (!this._hasCellActions(cell) && !this._tapActionIsExplicitNone(cell) && cell?.type === 'entity' && entityId) {
          this._openMoreInfo(entityId);
        }
      }, dblWindow);
      return;
    }

    if (hasTap) {
      this._runAction(tap, entityId);
    } else if (!this._hasCellActions(cell) && !this._tapActionIsExplicitNone(cell) && cell?.type === 'entity' && entityId) {
      this._openMoreInfo(entityId);
    }
  }

  // ---------- render ----------

  _renderHeaderCell(cell, colSpan = 1, rowIndex = null, cellIndex = null) {
    const numericSpan = Number(colSpan);
    const span = Number.isFinite(numericSpan) && numericSpan > 1 ? numericSpan : 1;
    const type = cell?.type || 'string';
    const val = cell?.value ?? '';
    const align = cell?.align || 'left';
    const hasRowIndex = rowIndex !== null && rowIndex !== undefined;
    const hasCellIndex = cellIndex !== null && cellIndex !== undefined;
    const cellCssClass = (hasRowIndex && hasCellIndex) ? this._cellCssClass(rowIndex, cellIndex) : '';

    if (type === 'icon') {
      const display = val;
      const dyn = this._evaluateDynColor(cell, type, display);
      const { style: thStyle } = this._buildTextStyle(cell, type, align, dyn);
      const hasActions = this._hasCellActions(cell);
      const iconStyle = this._buildIconStyle(cell, dyn);
      let content;
      if (dyn && dyn.overwrite === 'icon') {
        content = dyn.icon ? html`<ha-icon style=${iconStyle} icon="${dyn.icon}"></ha-icon>` : '';
      } else if (dyn && dyn.overwrite === 'entity') {
        const dynContent = this._renderDynamicEntityContent(cell, dyn);
        content = (dynContent !== null && dynContent !== undefined && dynContent !== '')
          ? dynContent
          : (dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '');
      } else if (dyn && dyn.hide) {
        content = dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '';
      } else {
        content = display ? html`<ha-icon style=${iconStyle} icon="${display}"></ha-icon>` : '';
      }

      const iconClasses = ['icon'];
      if (hasActions) iconClasses.push('clickable');
      if (cellCssClass) iconClasses.push(cellCssClass);
      const iconClassAttr = iconClasses.join(' ');

      if (hasActions) {
        const aria = display || 'icon';
        return html`
          <th class=${iconClassAttr || nothing}
              colspan=${span}
              style=${thStyle}
              role="button"
              tabindex="0"
              aria-label=${aria}
              @pointerdown=${(e) => this._onCellPointerDown(e, cell)}
              @pointerup=${(e) => this._onCellPointerUp(e, cell)}
              @pointercancel=${(e) => this._onCellPointerCancel(e)}
              @mouseleave=${(e) => this._onCellPointerCancel(e)}
              @keydown=${(e) => this._onCellKeydown(e, cell)}>
            ${content}
          </th>
        `;
      }
      return html`<th class=${iconClassAttr || nothing} colspan=${span} style=${thStyle}>${content}</th>`;
    }

    if (type === 'entity') {
      const stateObj = this.hass?.states?.[val];
      const domain = val?.split?.('.')?.[0];
      const attrEdit = this._normalizeAttrEditConfig(cell);
      if (attrEdit.enabled && stateObj && (cell?.attribute || attrEdit.field)) {
        const display = this._formatEntityCell(cell, stateObj);
        const cellDyn = this._evaluateDynColor(cell, type, display);
        const { style: _thStyle, textDecoration: _textDecoration } = this._buildTextStyle(cell, type, align, cellDyn);
        const dynContent = this._resolveDynamicOverwriteContent(cell, cellDyn, _textDecoration);
        const control = dynContent !== null && dynContent !== undefined
          ? dynContent
          : this._renderAttributeEditControl(cell, stateObj, attrEdit);
        const tokens = [];
        if (cellCssClass) tokens.push(cellCssClass);
        const cls = tokens.join(' ');
        if (control !== null && control !== undefined) {
          return html`
            <th class=${cls || nothing}
                colspan=${span}
                style=${_thStyle}>
              ${control}
            </th>
          `;
        }
      }
      if (cell?.show_control && stateObj && (domain === 'input_boolean' || domain === 'switch' || domain === 'input_number' || domain === 'number' || domain === 'input_select' || domain === 'select' || domain === 'input_button' || domain === 'button' || domain === 'input_datetime' || domain === 'datetime' || domain === 'date' || domain === 'time' || domain === 'input_text' || domain === 'text')) {
        const _disp = this._formatEntityCell(cell, stateObj);
        const _dyn = this._evaluateDynColor(cell, type, _disp);
        const { style: _thStyle, textDecoration: _textDecoration } = this._buildTextStyle(cell, type, align, _dyn);
        const dynContent = this._resolveDynamicOverwriteContent(cell, _dyn, _textDecoration);
        const controlClasses = [];
        if (cellCssClass) controlClasses.push(cellCssClass);
        const controlClassAttr = controlClasses.join(' ');
        return html`
          <th class=${controlClassAttr || nothing}
              colspan=${span}
              style=${_thStyle}>
            ${dynContent !== null && dynContent !== undefined
              ? dynContent
              : this._renderEntityControl(cell, stateObj, val)}
          </th>
        `;
      }
      const display = stateObj ? this._formatEntityCell(cell, stateObj) : 'n/a';
      const dyn = this._evaluateDynColor(cell, type, display);
      const baseMode = this._getEntityDisplayMode(cell);
      const dynMode = dyn && dyn.overwrite === 'entity'
        ? this._normalizeDynamicEntityDisplay(dyn.overwrite_entity_display)
        : null;
      const mode = dynMode || baseMode;
      const { style: thStyle, textDecoration } = this._buildTextStyle(cell, type, align, dyn, { skipTextDecoration: mode === 'icon_value' });
      const hasActions = this._hasCellActions(cell);
      const tapNone = this._tapActionIsExplicitNone(cell);
      const allowDefault = !hasActions && !tapNone;
      const shown = this._buildEntityDisplayContent(cell, stateObj, display, dyn, textDecoration, mode);
      const aria = stateObj ? `${val}: ${display}` : val;
      const baseTokens = [];
      if (mode === 'icon') baseTokens.push('icon');
      if (cellCssClass) baseTokens.push(cellCssClass);

      if (hasActions) {
        const entityClassAttr = [...baseTokens, 'clickable'].join(' ');
        return html`
          <th class=${entityClassAttr || nothing}
              colspan=${span}
              style=${thStyle}
              title=${val}
              role="button"
              tabindex="0"
              aria-label=${aria}
              @pointerdown=${(e) => this._onCellPointerDown(e, cell, val)}
              @pointerup=${(e) => this._onCellPointerUp(e, cell, val)}
              @pointercancel=${(e) => this._onCellPointerCancel(e)}
              @mouseleave=${(e) => this._onCellPointerCancel(e)}
              @keydown=${(e) => this._onCellKeydown(e, cell)}>
            ${shown}
          </th>
        `;
      }

      if (allowDefault) {
        const entityClassAttr = [...baseTokens, 'clickable'].join(' ');
        return html`
          <th class=${entityClassAttr || nothing}
              colspan=${span}
              style=${thStyle}
              title=${val}
              role="button"
              tabindex="0"
              aria-label=${aria}
              @click=${() => this._openMoreInfo(val)}
              @keydown=${(e) => this._onEntityKeydown(e, val)}>
            ${shown}
          </th>
        `;
      }

      const entityClassAttr = baseTokens.join(' ');
      return html`<th class=${entityClassAttr || nothing} colspan=${span} style=${thStyle} title=${val}>${shown}</th>`;
    }

    const display = val ?? '';
    const dyn = this._evaluateDynColor(cell, type, display);
    const { style: thStyle } = this._buildTextStyle(cell, type, align, dyn);
    const hasActions = this._hasCellActions(cell);
    let shown;
    if (dyn && dyn.overwrite === 'icon') {
      shown = html`<ha-icon style=${this._buildIconStyle(cell, dyn)} icon="${dyn.icon || ''}"></ha-icon>`;
    } else if (dyn && dyn.overwrite === 'entity') {
      const dynContent = this._renderDynamicEntityContent(cell, dyn);
      shown = (dynContent !== null && dynContent !== undefined && dynContent !== '') ? dynContent : (dyn?.mask || '');
    } else if (dyn && dyn.hide) {
      shown = dyn.mask || '';
    } else {
      shown = val ?? '';
    }

    const defaultClassTokens = hasActions ? ['clickable'] : [];
    if (cellCssClass) defaultClassTokens.push(cellCssClass);
    const defaultClassAttr = defaultClassTokens.join(' ');

    if (hasActions) {
      const aria = String(val || 'text');
      return html`
        <th class=${defaultClassAttr || nothing}
            colspan=${span}
            style=${thStyle}
            role="button"
            tabindex="0"
            aria-label=${aria}
            @pointerdown=${(e) => this._onCellPointerDown(e, cell)}
            @pointerup=${(e) => this._onCellPointerUp(e, cell)}
            @pointercancel=${(e) => this._onCellPointerCancel(e)}
            @mouseleave=${(e) => this._onCellPointerCancel(e)}
            @keydown=${(e) => this._onCellKeydown(e, cell)}>
          ${shown}
        </th>
      `;
    }

    return html`<th class=${defaultClassAttr || nothing} colspan=${span} style=${thStyle}>${shown}</th>`;
  }

  _describeBodyCell(cell, rowDyn = null, colSpan = 1) {
    const numericSpan = Number(colSpan);
    const span = Number.isFinite(numericSpan) && numericSpan > 1 ? numericSpan : 1;
    const type = cell?.type || 'string';
    const val = cell?.value ?? '';
    const align = cell?.align || 'right';
    const rowDynBase = rowDyn
      ? {
          ...(rowDyn?.bg ? { bg: rowDyn.bg } : {}),
          ...(rowDyn?.fg ? { fg: rowDyn.fg } : {}),
        }
      : null;
    const mergeDyn = (cellDyn) => (cellDyn ? { ...(rowDynBase || {}), ...cellDyn } : rowDynBase);

    const descriptor = {
      colSpan: span,
      className: '',
      style: '',
      role: null,
      tabIndex: null,
      title: null,
      ariaLabel: null,
      onContextMenu: null,
      onPointerDown: null,
      onPointerUp: null,
      onPointerCancel: null,
      onMouseLeave: null,
      onKeydown: null,
      onClick: null,
      content: '',
      align,
      type,
      hidden: false,
    };

    if (type === 'icon') {
      const display = val;
      const cellDyn = this._evaluateDynColor(cell, type, display);
      const dyn = mergeDyn(cellDyn);
      const { style: tdStyle } = this._buildTextStyle(cell, type, align, dyn);
      const hasActions = this._hasCellActions(cell);
      const iconStyle = this._buildIconStyle(cell, dyn);
      let content;
      if (dyn && dyn.overwrite === 'icon') {
        content = dyn.icon ? html`<ha-icon style=${iconStyle} icon="${dyn.icon}"></ha-icon>` : '';
      } else if (dyn && dyn.overwrite === 'entity') {
        const dynContent = this._renderDynamicEntityContent(cell, dyn);
        content = (dynContent !== null && dynContent !== undefined && dynContent !== '')
          ? dynContent
          : (dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '');
      } else if (dyn && dyn.hide) {
        content = dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '';
      } else {
        content = display ? html`<ha-icon style=${iconStyle} icon="${display}"></ha-icon>` : '';
      }

      descriptor.className = hasActions ? 'icon clickable' : 'icon';
      descriptor.style = tdStyle;
      descriptor.content = content;
      if (dyn && dyn.hide && !dyn.mask && (!dyn.overwrite || dyn.overwrite === 'hide')) {
        descriptor.hidden = true;
      }

      if (hasActions) {
        const aria = display || 'icon';
        descriptor.role = 'button';
        descriptor.tabIndex = 0;
        descriptor.ariaLabel = aria;
        descriptor.onContextMenu = (e) => e.preventDefault();
        descriptor.onPointerDown = (e) => this._onCellPointerDown(e, cell);
        descriptor.onPointerUp = (e) => this._onCellPointerUp(e, cell);
        descriptor.onPointerCancel = (e) => this._onCellPointerCancel(e);
        descriptor.onMouseLeave = (e) => this._onCellPointerCancel(e);
        descriptor.onKeydown = (e) => this._onCellKeydown(e, cell);
      }

      return descriptor;
    }

    if (type === 'entity') {
      const stateObj = this.hass?.states?.[val];
      const domain = val?.split?.('.')?.[0];
      const attrEdit = this._normalizeAttrEditConfig(cell);
      if (attrEdit.enabled && stateObj && (cell?.attribute || attrEdit.field)) {
        const display = this._formatEntityCell(cell, stateObj);
        const cellDyn = this._evaluateDynColor(cell, type, display);
        const dyn = mergeDyn(cellDyn);
        const { style: tdStyle, textDecoration } = this._buildTextStyle(cell, type, align, dyn);
        descriptor.style = tdStyle;
        const dynContent = this._resolveDynamicOverwriteContent(cell, dyn, textDecoration);
        descriptor.content = dynContent !== null && dynContent !== undefined
          ? dynContent
          : this._renderAttributeEditControl(cell, stateObj, attrEdit);
        if (dyn && dyn.hide && !dyn.mask && (!dyn.overwrite || dyn.overwrite === 'hide')) {
          descriptor.hidden = true;
        }
        return descriptor;
      }
      if (cell?.show_control && stateObj && !cell?.attribute && (domain === 'input_boolean' || domain === 'switch' || domain === 'input_number' || domain === 'number' || domain === 'input_select' || domain === 'select' || domain === 'input_button' || domain === 'button' || domain === 'input_datetime' || domain === 'datetime' || domain === 'date' || domain === 'time' || domain === 'input_text' || domain === 'text')) {
        const display = this._formatEntityCell(cell, stateObj);
        const cellDyn = this._evaluateDynColor(cell, type, display);
        const dyn = mergeDyn(cellDyn);
        const { style: tdStyle, textDecoration } = this._buildTextStyle(cell, type, align, dyn);
        descriptor.style = tdStyle;
        const dynContent = this._resolveDynamicOverwriteContent(cell, dyn, textDecoration);
        descriptor.content = dynContent !== null && dynContent !== undefined
          ? dynContent
          : this._renderEntityControl(cell, stateObj, val);
        if (dyn && dyn.hide && !dyn.mask && (!dyn.overwrite || dyn.overwrite === 'hide')) {
          descriptor.hidden = true;
        }
        return descriptor;
      }

      const display = stateObj ? this._formatEntityCell(cell, stateObj) : 'n/a';
      const cellDyn = this._evaluateDynColor(cell, type, display);
      const dyn = mergeDyn(cellDyn);
      const baseMode = this._getEntityDisplayMode(cell);
      const dynMode = dyn && dyn.overwrite === 'entity'
        ? this._normalizeDynamicEntityDisplay(dyn.overwrite_entity_display)
        : null;
      const mode = dynMode || baseMode;
      const { style: tdStyle, textDecoration } = this._buildTextStyle(cell, type, align, dyn, { skipTextDecoration: mode === 'icon_value' });
      const hasActions = this._hasCellActions(cell);
      const tapNone = this._tapActionIsExplicitNone(cell);
      const allowDefault = !hasActions && !tapNone;
      const shown = this._buildEntityDisplayContent(cell, stateObj, display, dyn, textDecoration, mode);
      const aria = stateObj ? `${val}: ${display}` : val;
      const classTokens = [];
      if (mode === 'icon') classTokens.push('icon');
      if (hasActions || allowDefault) classTokens.push('clickable');

      descriptor.className = classTokens.join(' ');
      descriptor.style = tdStyle;
      descriptor.title = val;
      descriptor.ariaLabel = aria;
      descriptor.content = shown;
      if (dyn && dyn.hide && !dyn.mask && (!dyn.overwrite || dyn.overwrite === 'hide')) {
        descriptor.hidden = true;
      }

      if (hasActions || allowDefault) {
        descriptor.role = 'button';
        descriptor.tabIndex = 0;
      }

      if (hasActions) {
        descriptor.onContextMenu = (e) => e.preventDefault();
        descriptor.onPointerDown = (e) => this._onCellPointerDown(e, cell, val);
        descriptor.onPointerUp = (e) => this._onCellPointerUp(e, cell, val);
        descriptor.onPointerCancel = (e) => this._onCellPointerCancel(e);
        descriptor.onMouseLeave = (e) => this._onCellPointerCancel(e);
        descriptor.onKeydown = (e) => this._onCellKeydown(e, cell);
      } else if (allowDefault) {
        descriptor.onClick = () => this._openMoreInfo(val);
        descriptor.onKeydown = (e) => this._onEntityKeydown(e, val);
      }

      return descriptor;
    }

    const display = val ?? '';
    const cellDyn = this._evaluateDynColor(cell, type, display);
    const dyn = mergeDyn(cellDyn);
    const { style: tdStyle } = this._buildTextStyle(cell, type, align, dyn);
    const hasActions = this._hasCellActions(cell);
    let shown;
    if (dyn && dyn.overwrite === 'icon') {
      shown = html`<ha-icon style=${this._buildIconStyle(cell, dyn)} icon="${dyn.icon || ''}"></ha-icon>`;
    } else if (dyn && dyn.overwrite === 'entity') {
      const dynContent = this._renderDynamicEntityContent(cell, dyn);
      shown = (dynContent !== null && dynContent !== undefined && dynContent !== '') ? dynContent : (dyn?.mask || '');
    } else if (dyn && dyn.hide) {
      shown = dyn.mask || '';
    } else {
      shown = val ?? '';
    }

    descriptor.className = hasActions ? 'clickable' : '';
    descriptor.style = tdStyle;
    descriptor.content = shown;
    if (dyn && dyn.hide && !dyn.mask && (!dyn.overwrite || dyn.overwrite === 'hide')) {
      descriptor.hidden = true;
    }

    if (hasActions) {
      const aria = String(val || 'text');
      descriptor.role = 'button';
      descriptor.tabIndex = 0;
      descriptor.ariaLabel = aria;
      descriptor.onContextMenu = (e) => e.preventDefault();
      descriptor.onPointerDown = (e) => this._onCellPointerDown(e, cell);
      descriptor.onPointerUp = (e) => this._onCellPointerUp(e, cell);
      descriptor.onPointerCancel = (e) => this._onCellPointerCancel(e);
      descriptor.onMouseLeave = (e) => this._onCellPointerCancel(e);
      descriptor.onKeydown = (e) => this._onCellKeydown(e, cell);
    }

    return descriptor;
  }

  _renderBodyCell(cell, rowDyn = null, colSpan = 1, rowIndex = null, cellIndex = null) {
    const descriptor = this._describeBodyCell(cell, rowDyn, colSpan);
    if (!descriptor) return html``;
    const {
      colSpan: span,
      className,
      style,
      role,
      tabIndex,
      title,
      ariaLabel,
      onContextMenu,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onMouseLeave,
      onKeydown,
      onClick,
      content,
    } = descriptor;

    const classTokens = [];
    if (className) classTokens.push(className);
    if (rowIndex !== null && rowIndex !== undefined && cellIndex !== null && cellIndex !== undefined) {
      classTokens.push(this._cellCssClass(rowIndex, cellIndex));
    }
    const classAttr = classTokens.length ? classTokens.join(' ') : nothing;

    return html`
      <td
        class=${classAttr}
        colspan=${span}
        style=${style ? style : nothing}
        role=${role || nothing}
        title=${title || nothing}
        aria-label=${ariaLabel || nothing}
        tabindex=${tabIndex !== null && tabIndex !== undefined ? tabIndex : nothing}
        @contextmenu=${onContextMenu || null}
        @pointerdown=${onPointerDown || null}
        @pointerup=${onPointerUp || null}
        @pointercancel=${onPointerCancel || null}
        @mouseleave=${onMouseLeave || null}
        @keydown=${onKeydown || null}
        @click=${onClick || null}>
        ${content}
      </td>
    `;
  }

  _renderStandaloneCell(cell, rowDyn = null, colSpan = 1, extraStyle = '', extraClass = '', originTag = 'td', rowMeta = null) {
    const descriptor = this._describeBodyCell(cell, rowDyn, colSpan);
    if (!descriptor) return html``;
    if (descriptor.hidden) return html``;
    const {
      className,
      style,
      role,
      tabIndex,
      title,
      ariaLabel,
      onContextMenu,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onMouseLeave,
      onKeydown,
      onClick,
      content,
      align,
    } = descriptor;
    const origin = (originTag === 'th' || originTag === 'td') ? originTag : 'td';
    const classes = ['fcc-template-cell'];
    if (className) classes.push(className);
    if (extraClass && typeof extraClass === 'string') {
      const tokens = extraClass.split(/\s+/).filter(Boolean);
      if (tokens.length) classes.push(...tokens);
    }
    const alignment = typeof align === 'string' ? align : 'left';
    const styleSegments = [];
    if (style) {
      const cleaned = style.replace(/text-align:[^;]+;?/gi, '');
      if (cleaned.trim()) styleSegments.push(cleaned.trim().replace(/;$/, ''));
    }
    styleSegments.push('display:inline-flex');
    styleSegments.push('align-items:center');
    if (alignment === 'right') {
      styleSegments.push('justify-content:flex-end');
      styleSegments.push('text-align:right');
    } else if (alignment === 'center') {
      styleSegments.push('justify-content:center');
      styleSegments.push('text-align:center');
    } else {
      styleSegments.push('justify-content:flex-start');
      styleSegments.push('text-align:left');
    }
    styleSegments.push('white-space:nowrap');
    if (extraStyle && typeof extraStyle === 'string') {
      const appended = extraStyle.trim().replace(/;+$/, '');
      if (appended) styleSegments.push(appended);
    }
    const finalStyle = styleSegments.join(';');
    const rowIndexAttr = rowMeta && rowMeta.rowIndex !== null && rowMeta.rowIndex !== undefined
      ? String(rowMeta.rowIndex)
      : nothing;
    const rowOrderAttr = rowMeta && rowMeta.rowOrder !== null && rowMeta.rowOrder !== undefined
      ? String(rowMeta.rowOrder)
      : nothing;
    return html`
      <span
        class=${classes.join(' ') || nothing}
        style=${finalStyle || nothing}
        data-fcc-origin=${origin}
        data-fcc-row-index=${rowIndexAttr}
        data-fcc-row-order=${rowOrderAttr}
        role=${role || nothing}
        title=${title || nothing}
        aria-label=${ariaLabel || nothing}
        tabindex=${tabIndex !== null && tabIndex !== undefined ? tabIndex : nothing}
        @contextmenu=${onContextMenu || null}
        @pointerdown=${onPointerDown || null}
        @pointerup=${onPointerUp || null}
        @pointercancel=${onPointerCancel || null}
        @mouseleave=${onMouseLeave || null}
        @keydown=${onKeydown || null}
        @click=${onClick || null}>
        ${content}
      </span>
    `;
  }

  _renderTemplateRow(templateRows, rowNumber, inlineStyle = '', extraClass = '') {
    if (!Number.isInteger(rowNumber) || rowNumber <= 0) return html``;
    const entry = templateRows[rowNumber - 1];
    if (!entry || entry.hidden) return html``;
    const rowMeta = {
      rowIndex: entry.rowIndex,
      rowOrder: entry.rowOrder,
      rowClass: entry.rowClass,
      zebraClass: entry.zebraClass,
    };
    const classes = ['fcc-template-row'];
    if (entry.rowClass) classes.push(entry.rowClass);
    if (entry.zebraClass) classes.push(entry.zebraClass);
    if (extraClass && typeof extraClass === 'string') {
      const tokens = extraClass.split(/\s+/).filter(Boolean);
      if (tokens.length) classes.push(...tokens);
    }
    let styleAttr = '';
    if (inlineStyle && typeof inlineStyle === 'string') {
      const trimmed = inlineStyle.trim().replace(/;+$/, '');
      if (trimmed) styleAttr = trimmed;
    }
    const rowIndexAttr = entry.rowIndex !== null && entry.rowIndex !== undefined
      ? String(entry.rowIndex)
      : nothing;
    const rowOrderAttr = entry.rowOrder !== null && entry.rowOrder !== undefined
      ? String(entry.rowOrder)
      : nothing;
    const originTag = entry.originTag || 'td';

    let cellsContent;
    if (entry.mergeColumns) {
      const cell = entry.cells[0] ?? { type: 'string', value: '', align: originTag === 'th' ? 'left' : 'right' };
      const combinedClass = entry.rowIndex != null ? this._cellCssClass(entry.rowIndex, 0) : '';
      cellsContent = this._renderStandaloneCell(cell, entry.rowDyn, entry.colSpan, '', combinedClass, originTag, rowMeta);
    } else {
      cellsContent = entry.cells.map((cell, idx) => {
        const combinedClass = entry.rowIndex != null ? this._cellCssClass(entry.rowIndex, idx) : '';
        return this._renderStandaloneCell(cell, entry.rowDyn, 1, '', combinedClass, originTag, rowMeta);
      });
    }

    return html`
      <span
        class=${classes.join(' ') || nothing}
        style=${styleAttr || nothing}
        data-fcc-row-index=${rowIndexAttr}
        data-fcc-row-order=${rowOrderAttr}>
        ${cellsContent}
      </span>
    `;
  }

  _renderTemplateCell(templateRows, rowNumber, colNumber, inlineStyle = '', extraClass = '') {
    if (!Number.isInteger(rowNumber) || rowNumber <= 0) return html``;
    if (!Number.isInteger(colNumber) || colNumber <= 0) {
      return this._renderTemplateRow(templateRows, rowNumber, inlineStyle, extraClass);
    }
    const entry = templateRows[rowNumber - 1];
    if (!entry || entry.hidden) return html``;
    const rowMeta = {
      rowIndex: entry.rowIndex,
      rowOrder: entry.rowOrder,
      rowClass: entry.rowClass,
      zebraClass: entry.zebraClass,
    };
    const originTag = entry.originTag || 'td';
    if (entry.mergeColumns) {
      if (colNumber !== 1) return html``;
      const cell = entry.cells[0] ?? { type: 'string', value: '', align: 'right' };
      const combinedClass = [extraClass, entry.rowIndex != null ? this._cellCssClass(entry.rowIndex, 0) : '']
        .filter((cls) => !!cls)
        .join(' ')
        .trim();
      return this._renderStandaloneCell(cell, entry.rowDyn, entry.colSpan, inlineStyle, combinedClass, originTag, rowMeta);
    }
    const idx = colNumber - 1;
    if (idx < 0 || idx >= entry.cells.length) return html``;
    const cell = entry.cells[idx] ?? { type: 'string', value: '', align: 'right' };
    const combinedClass = [extraClass, entry.rowIndex != null ? this._cellCssClass(entry.rowIndex, idx) : '']
      .filter((cls) => !!cls)
      .join(' ')
      .trim();
    return this._renderStandaloneCell(cell, entry.rowDyn, 1, inlineStyle, combinedClass, originTag, rowMeta);
  }

  _stringifyTemplateValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  }

  _extractTemplateCellText(cell) {
    if (!cell) return '';
    const type = cell?.type || 'string';
    if (type === 'entity') {
      const entityId = this._stringifyTemplateValue(cell?.value);
      if (!entityId) return '';
      const stateObj = this.hass?.states?.[entityId];
      const displayRaw = stateObj ? this._formatEntityCell(cell, stateObj) : '';
      const display = this._stringifyTemplateValue(displayRaw);
      const dyn = this._evaluateDynColor(cell, type, display);
      const shown = this._resolveDisplayWithDynamics(display, dyn, cell);
      return this._stringifyTemplateValue(shown);
    }
    const base = this._stringifyTemplateValue(cell?.value);
    const dyn = this._evaluateDynColor(cell, type, base);
    const shown = this._resolveDisplayWithDynamics(base, dyn, cell);
    return this._stringifyTemplateValue(shown);
  }

  _renderTemplateCellText(templateRows, rowNumber, colNumber) {
    if (!Number.isInteger(rowNumber) || rowNumber <= 0) return '';
    if (!Number.isInteger(colNumber) || colNumber <= 0) return '';
    const entry = templateRows[rowNumber - 1];
    if (!entry || entry.hidden) return '';
    if (entry.mergeColumns) {
      if (colNumber !== 1) return '';
      const cell = entry.cells[0] ?? { type: 'string', value: '' };
      return this._extractTemplateCellText(cell);
    }
    const idx = colNumber - 1;
    if (idx < 0 || idx >= entry.cells.length) return '';
    const cell = entry.cells[idx] ?? { type: 'string', value: '' };
    return this._extractTemplateCellText(cell);
  }

  _renderCustomTemplate(templateHtml, templateRows, tableContent = null) {
    const raw = typeof templateHtml === 'string' ? templateHtml : '';
    if (!raw) return html``;
    if (!this._customTemplateCache) this._customTemplateCache = new Map();
    let cached = this._customTemplateCache.get(raw);
    if (!cached) {
      const readAttrValue = (src, attr) => {
        if (!src || !attr) return null;
        const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const doubleQuoted = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*"([^"]*)"`, 'i');
        const singleQuoted = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*'([^']*)'`, 'i');
        const dblMatch = src.match(doubleQuoted);
        if (dblMatch) return dblMatch[1];
        const sglMatch = src.match(singleQuoted);
        if (sglMatch) return sglMatch[1];
        return null;
      };
      const regex = /<fcc\b([^>]*)\/>/gi;
      const segments = [];
      const rawSegments = [];
      const slots = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(raw)) !== null) {
        const before = raw.slice(lastIndex, match.index);
        segments.push(before);
        rawSegments.push(before);

        const attrs = match[1] || '';
        const rowMatch = attrs.match(/row\s*=\s*["'](\d+)["']/i);
        const colMatch = attrs.match(/col\s*=\s*["'](\d+)["']/i);
        const styleMatch =
          attrs.match(/style\s*=\s*"([^"]*)"/i) ||
          attrs.match(/style\s*=\s*'([^']*)'/i);
        const classMatch =
          attrs.match(/class\s*=\s*"([^"]*)"/i) ||
          attrs.match(/class\s*=\s*'([^']*)'/i);
        const rowNumber = rowMatch ? parseInt(rowMatch[1], 10) : NaN;
        const colNumberRaw = colMatch ? parseInt(colMatch[1], 10) : NaN;
        const hasRow = Number.isInteger(rowNumber) && rowNumber > 0;
        const hasColAttr = !!colMatch;
        const hasCol = Number.isInteger(colNumberRaw) && colNumberRaw > 0;
        const styleValue = styleMatch ? styleMatch[1] : '';
        const classValue = classMatch ? classMatch[1] : '';
        const modeAttr = readAttrValue(attrs, 'mode') ?? readAttrValue(attrs, 'as');
        const normalizedMode = typeof modeAttr === 'string' && modeAttr.trim().toLowerCase() === 'text' ? 'text' : 'node';

        if (hasRow && (hasCol || !hasColAttr)) {
          const colNumber = hasCol ? colNumberRaw : null;
          slots.push({ rowNumber, colNumber, styleValue, classValue, outputMode: normalizedMode });
        } else if (!hasRow && !hasColAttr) {
          slots.push({ type: 'table', styleValue, classValue });
        } else {
          const idx = segments.length - 1;
          segments[idx] = segments[idx] + match[0];
          rawSegments[idx] = rawSegments[idx] + match[0];
        }
        lastIndex = regex.lastIndex;
      }

      const tail = raw.slice(lastIndex);
      segments.push(tail);
      rawSegments.push(tail);

      if (!slots.length) {
        this._customTemplateCache.set(raw, { slots: [], templateStrings: null });
        return html`${unsafeHTML(raw)}`;
      }

      const cooked = segments.slice(0);
      const rawCopy = rawSegments.slice(0);
      cooked.raw = rawCopy;
      Object.freeze(rawCopy);
      Object.freeze(cooked);
      cached = { slots, templateStrings: cooked };
      this._customTemplateCache.set(raw, cached);
    }

    if (!cached || !cached.slots?.length || !cached.templateStrings) {
      return html`${unsafeHTML(raw)}`;
    }

    const values = cached.slots.map((slot) => {
      if (slot?.type === 'table') {
        const content = tableContent || html``;
        const cls = slot.classValue ? slot.classValue.trim() : '';
        const sty = slot.styleValue ? slot.styleValue.trim() : '';
        if (!cls && !sty) return content;
        return html`<span class=${cls || nothing} style=${sty || nothing}>${content}</span>`;
      }
      const { rowNumber, colNumber, styleValue, classValue, outputMode } = slot;
      if ((outputMode || '') === 'text') {
        return this._renderTemplateCellText(templateRows, rowNumber, colNumber);
      }
      return this._renderTemplateCell(templateRows, rowNumber, colNumber, styleValue, classValue);
    });
    return html(cached.templateStrings, ...values);
  }

  _isInEditorPreview() {
    try {
      return !!this.closest?.('hui-card-preview');
    } catch (_e) {
      return false;
    }
  }

  _normalizeSeparator(row) {
    const raw = row?.separator || {};
    const normalized = { ...DEFAULT_SEPARATOR };

    if (raw.color != null && String(raw.color).trim()) normalized.color = String(raw.color).trim();
    if (raw.background != null && String(raw.background).trim()) normalized.background = String(raw.background).trim();

    const style = String(raw.style || '').toLowerCase();
    if (['solid', 'dashed', 'dotted'].includes(style)) normalized.style = style;

    const thickness = Number(raw.thickness);
    if (Number.isFinite(thickness) && thickness >= 0) normalized.thickness = thickness;

    if (raw.length != null && String(raw.length).trim()) normalized.length = String(raw.length).trim();

    const align = String(raw.align || '').toLowerCase();
    if (['stretch', 'center', 'left', 'right'].includes(align)) normalized.align = align;

    const opacity = Number(raw.opacity);
    if (Number.isFinite(opacity)) normalized.opacity = Math.min(Math.max(opacity, 0), 1);

    const marginTop = Number(raw.margin_top);
    if (Number.isFinite(marginTop)) normalized.margin_top = marginTop;

    const marginBottom = Number(raw.margin_bottom);
    if (Number.isFinite(marginBottom)) normalized.margin_bottom = marginBottom;

    return normalized;
  }

  _renderSeparatorRow(row, colCount) {
    const sep = this._normalizeSeparator(row);
    const thickness = Math.max(0, Number(sep.thickness));
    const opacity = Number.isFinite(sep.opacity) ? sep.opacity : DEFAULT_SEPARATOR.opacity;
    const marginTop = Number.isFinite(sep.margin_top) ? sep.margin_top : DEFAULT_SEPARATOR.margin_top;
    const marginBottom = Number.isFinite(sep.margin_bottom) ? sep.margin_bottom : DEFAULT_SEPARATOR.margin_bottom;
    const span = Math.max(1, colCount || 1);
    const background = (sep.background || '').trim();

    let width = sep.length || '100%';
    let marginLeft = 'auto';
    let marginRight = 'auto';

    switch (sep.align) {
      case 'stretch':
        width = '100%';
        marginLeft = '0';
        marginRight = '0';
        break;
      case 'left':
        marginLeft = '0';
        marginRight = 'auto';
        break;
      case 'right':
        marginLeft = 'auto';
        marginRight = '0';
        break;
      default:
        marginLeft = 'auto';
        marginRight = 'auto';
        break;
    }

    const styleParts = [
      thickness > 0 ? `border-top:${thickness}px ${sep.style} ${sep.color}` : 'border-top:none',
      `width:${width}`,
      `margin-top:${marginTop}px`,
      `margin-bottom:${marginBottom}px`,
      `margin-left:${marginLeft}`,
      `margin-right:${marginRight}`,
      `opacity:${opacity}`,
      'height:0',
      'box-sizing:border-box',
    ];

    return html`
      <tr class="fc-separator-row">
        <td colspan=${span} style=${background ? `background:${background};` : ''}>
          <div class="fc-separator-line" style=${styleParts.join(';')}></div>
        </td>
      </tr>
    `;
  }


  _resolveCardPadding() {
    const v = this.config?.card_padding;
    if (v === '' || v === undefined || v === null) return 16;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 16;
  }

  render() {
    const cfg = this.config || {};
    const autoEntities = this._buildRowsFromEntities(cfg);
    const rows = (autoEntities?.rows && autoEntities.rows.length)
      ? autoEntities.rows
      : (Array.isArray(cfg.rows) ? cfg.rows : []);
    const colCount = (() => {
      const explicit = Number.isInteger(cfg.column_count) && cfg.column_count > 0 ? cfg.column_count : null;
      if (explicit) return explicit;
      if (autoEntities?.colCount) return autoEntities.colCount;
      return cfg.column_count ?? 1;
    })();
    const padVal = this._resolveCardPadding();
    const customTemplateEnabled = !!cfg.custom_template_enabled;
    const customTemplateRaw = typeof cfg.custom_template_html === 'string' ? cfg.custom_template_html : '';
    const customTemplateHasContent = customTemplateEnabled && customTemplateRaw.trim() !== '';
    const customCssBlocks = this._collectCustomCss(rows);
    const extraStyle = customCssBlocks.length ? html`<style>${customCssBlocks.join('\n')}</style>` : nothing;

    if (!rows.length) {
      const defaultCard = html`<ha-card class="card" style="padding:${padVal}px;">${t(this.hass, "card.no_rows")}</ha-card>`;
      if (!customTemplateHasContent) {
        return html`${extraStyle}${defaultCard}`;
      }
      const templateCard = html`
        <ha-card class="card fcc-template-card" style="padding:${padVal}px;">
          ${this._renderCustomTemplate(customTemplateRaw, [], null)}
        </ha-card>
      `;
      const combined = this._isInEditorPreview()
        ? html`<div class="fcc-preview-stack">${defaultCard}${templateCard}</div>`
        : templateCard;
      return html`${extraStyle}${combined}`;
    }

    const headerFromFirstRow = autoEntities?.hasHeader ? true : !!cfg.header_from_first_row;
    const headerIndex = headerFromFirstRow
      ? rows.findIndex((row) => (row?.type || '') !== 'separator')
      : -1;
    const headerRow = headerIndex >= 0 ? rows[headerIndex] : null;
    const hasHeader = !!headerRow;
    const bodyRows = hasHeader
      ? rows.filter((_, idx) => idx !== headerIndex)
      : rows;

    const widths = Array.isArray(cfg.column_widths) ? cfg.column_widths : null;
    const useFixed = !!widths && widths.length > 0;

    const classes = ['datatable'];
    if (cfg.zebra) classes.push('zebra');

    const hiddenColumns = this._getActiveHiddenColumns(colCount);
    const effectiveVisibleCount = Math.max(1, colCount - hiddenColumns.length);
    const hiddenColumnSet = new Set(hiddenColumns);
    const firstVisibleColumnIndex = (() => {
      for (let i = 0; i < colCount; i += 1) {
        if (!hiddenColumnSet.has(i)) return i;
      }
      return 0;
    })();
    const normalizedHideCols = this._normalizeHideColumns(cfg.hide_on_narrow, colCount);
    const bp = parseInt(cfg.narrow_breakpoint, 10);
    const hasBP = Number.isFinite(bp) && bp > 0;
    const hideCSS = (!hiddenColumns.length && normalizedHideCols.length && hasBP)
      ? `
      @media (max-width: ${bp}px) {
        ${normalizedHideCols.map((idx) => {
          const nth = idx + 1;
          return `
          colgroup col:nth-child(${nth}) { display: none; }
          thead th:nth-child(${nth}) { display: none; }
          tbody tr:not(.fc-separator-row) td:nth-child(${nth}) { display: none; }
        `;
        }).join('\n')}
      }`
      : '';

    const tableStyle = useFixed ? 'table-layout: fixed;' : '';

    const rawSortColumns = Array.isArray(cfg.sort_columns) ? cfg.sort_columns.filter((n) => Number.isInteger(n) && n > 0) : [];
    const zeroBasedSortColumns = rawSortColumns
      .map((n) => n - 1)
      .filter((idx) => idx >= 0 && idx < colCount);
    const sortColumns = zeroBasedSortColumns.filter((idx, pos, arr) => arr.indexOf(idx) === pos);
    const sortDesc = !!cfg.sort_desc;
    const sortActive = sortColumns.length > 0;
    const rowsForBody = sortActive
      ? this._sortBodyRows(bodyRows, sortColumns, sortDesc)
      : bodyRows;

    let zebraCounter = 0;
    const zebraIgnoreSeparators = !!cfg.zebra_ignore_separators;
    const hideSortSeparators = sortActive && !!cfg.hide_separators_on_sort;
    const templateRows = [];
    let templateRowOrder = 0;

    if (hasHeader && headerRow) {
      const headerCells = Array.isArray(headerRow?.cells) ? headerRow.cells : [];
      const headerRowIndex = headerIndex >= 0 ? headerIndex : null;
      const headerRowClass = headerRowIndex !== null ? this._rowCssClass(headerRowIndex) : '';
      if (headerRow?.merge_columns) {
        const cell = headerCells[0] ?? { type: 'string', value: '', align: 'left', style: { bold: true } };
        const withBold = cell.style?.bold === undefined
          ? { ...cell, style: { ...(cell.style || {}), bold: true } }
          : cell;
        templateRows.push({
          row: headerRow,
          rowIndex: headerRowIndex,
          rowClass: headerRowClass,
          zebraClass: '',
          rowOrder: ++templateRowOrder,
          rowDyn: null,
          mergeColumns: true,
          cells: [withBold],
          colSpan: Math.max(1, effectiveVisibleCount),
          originTag: 'th',
        });
      } else {
        const filled = Array.from({ length: colCount }, (_, i) => {
          const cell = headerCells[i] ?? { type: 'string', value: '', align: 'left', style: { bold: true } };
          return cell.style?.bold === undefined
            ? { ...cell, style: { ...(cell.style || {}), bold: true } }
            : cell;
        });
        templateRows.push({
          row: headerRow,
          rowIndex: headerRowIndex,
          rowClass: headerRowClass,
          zebraClass: '',
          rowOrder: ++templateRowOrder,
          rowDyn: null,
          mergeColumns: false,
          cells: filled,
          colSpan: 1,
          originTag: 'th',
        });
      }
    }

    const bodyContent = rowsForBody.map((row) => {
      const isSeparator = (row?.type || '') === 'separator';
      if (isSeparator) {
        if (cfg.zebra && !zebraIgnoreSeparators) {
          zebraCounter += 1;
        }
        const separatorRow = hideSortSeparators
          ? {
              ...row,
              separator: {
                ...(row?.separator || {}),
                thickness: 0,
                margin_top: 0,
                margin_bottom: 0,
              },
            }
          : row;
        return this._renderSeparatorRow(separatorRow, effectiveVisibleCount);
      }
      const rowDyn = this._evaluateRowRules(row);
      if (rowDyn?.visibility === 'hidden') {
        const safeRowIndex = rows.indexOf(row);
        const rowIndexForCss = safeRowIndex >= 0 ? safeRowIndex : null;
        const rowCssClass = rowIndexForCss !== null ? this._rowCssClass(rowIndexForCss) : '';
        templateRows.push({
          row,
          rowIndex: rowIndexForCss,
          rowClass: rowCssClass,
          zebraClass: '',
          rowOrder: ++templateRowOrder,
          rowDyn,
          mergeColumns: false,
          cells: Array.isArray(row?.cells) ? row.cells : [],
          colSpan: 1,
          originTag: 'td',
          hidden: true,
        });
        return html``;
      }
      if (cfg.zebra) {
        zebraCounter += 1;
      }
      const zebraClass = (cfg.zebra && zebraCounter % 2 === 0) ? 'fc-zebra-alt' : '';
      const safeRowIndex = rows.indexOf(row);
      const rowIndexForCss = safeRowIndex >= 0 ? safeRowIndex : null;
      const rowCssClass = rowIndexForCss !== null ? this._rowCssClass(rowIndexForCss) : '';
      const rowClassAttr = [zebraClass, rowCssClass].filter(Boolean).join(' ');
      const cells = Array.isArray(row?.cells) ? row.cells : [];
      if (row?.merge_columns) {
        const cell = cells[0] ?? { type: 'string', value: '', align: 'right' };
        templateRows.push({
          row,
          rowIndex: rowIndexForCss,
          rowClass: rowCssClass,
          zebraClass,
          rowOrder: ++templateRowOrder,
          rowDyn,
          mergeColumns: true,
          cells: [cell],
          colSpan: Math.max(1, effectiveVisibleCount),
          originTag: 'td',
        });
        return html`<tr class=${rowClassAttr || nothing}>${this._renderBodyCell(cell, rowDyn, Math.max(1, effectiveVisibleCount), rowIndexForCss, firstVisibleColumnIndex)}</tr>`;
      }
      const filled = Array.from({ length: colCount }, (_, i) => cells[i] ?? { type: 'string', value: '', align: 'right' });
      templateRows.push({
        row,
        rowIndex: rowIndexForCss,
        rowClass: rowCssClass,
        zebraClass,
        rowOrder: ++templateRowOrder,
        rowDyn,
        mergeColumns: false,
        cells: filled,
        colSpan: 1,
        originTag: 'td',
      });
      const rowCells = filled.map((cell, cellIdx) => {
        if (hiddenColumnSet.has(cellIdx)) return nothing;
        return this._renderBodyCell(cell, rowDyn, 1, rowIndexForCss, cellIdx);
      });
      return html`<tr class=${rowClassAttr || nothing}>${rowCells}</tr>`;
    });

    const table = html`
      <style>${hideCSS}</style>
      <table class=${classes.join(' ')} style=${tableStyle} cellpadding="0" cellspacing="0" border="0">
        ${widths ? html`
          <colgroup>
            ${Array.from({ length: colCount }, (_, i) => hiddenColumnSet.has(i) ? nothing : html`<col style="width:${widths[i] || 'auto'}">`)}
          </colgroup>
        ` : ''}

        ${hasHeader ? html`
          <thead>
            <tr class=${headerIndex >= 0 ? this._rowCssClass(headerIndex) : nothing}>
              ${(() => {
      const cells = Array.isArray(headerRow?.cells) ? headerRow.cells : [];
      if (headerRow?.merge_columns) {
        const cell = cells[0] ?? { type: 'string', value: '', align: 'left', style: { bold: true } };
        const withBold = cell.style?.bold === undefined
          ? { ...cell, style: { ...(cell.style || {}), bold: true } }
          : cell;
        return this._renderHeaderCell(withBold, Math.max(1, effectiveVisibleCount), headerIndex, firstVisibleColumnIndex);
      }
      return Array.from({ length: colCount }, (_, i) => {
        if (hiddenColumnSet.has(i)) return nothing;
        const cell = cells[i] ?? { type: 'string', value: '', align: 'left', style: { bold: true } };
        const withBold = cell.style?.bold === undefined
          ? { ...cell, style: { ...(cell.style || {}), bold: true } }
          : cell;
        return this._renderHeaderCell(withBold, 1, headerIndex, i);
      });
    })()}
            </tr>
          </thead>
        ` : ''}

        <tbody>
          ${bodyContent}
        </tbody>
      </table>
    `;

    const tableViewport = cfg.overflow_x
      ? html`<div class="wrap"><div class="scroller" style="overflow-x:auto; overflow-y:hidden">${table}</div></div>`
      : html`<div class="wrap">${table}</div>`;

    const defaultCard = html`
      <ha-card class="card" style="padding:${padVal}px;">
        ${tableViewport}
      </ha-card>
    `;

    if (!customTemplateHasContent) {
      return html`${extraStyle}${defaultCard}`;
    }

    const templateCard = html`
      <ha-card class="card fcc-template-card" style="padding:${padVal}px;">
        ${this._renderCustomTemplate(customTemplateRaw, templateRows, tableViewport)}
      </ha-card>
    `;

    const combined = this._isInEditorPreview()
      ? html`<div class="fcc-preview-stack">${defaultCard}${templateCard}</div>`
      : templateCard;
    return html`${extraStyle}${combined}`;
  }

  // NEW: fallback import — gdyby przeglądarka wczytała wersję bez edytora lub cache „zgubił” definicję
  static async getConfigElement() {
    if (!customElements.get('flex-cells-card-editor')) {
      try { await import('./flex-cells-card-editor.js'); } catch (_e) { }
    }
    return document.createElement('flex-cells-card-editor');
  }
  _onSetText(entityId, value) {
    try {
      const domain = entityId?.split?.('.')[0] || 'input_text';
      const serviceDomain = domain === 'text' ? 'text' : 'input_text';
      this.hass?.callService(serviceDomain, 'set_value', { entity_id: entityId, value: value ?? '' });
    } catch (e) { /* noop */ }
  }
  _onSetDatetime(entityId, raw) {
    try {
      const st = this.hass?.states?.[entityId];
      const attrs = st?.attributes || {};
      const domain = entityId?.split?.('.')[0] || 'input_datetime';
      const hasDateAttr = attrs.has_date;
      const hasTimeAttr = attrs.has_time;
      const hasDate = hasDateAttr !== undefined ? !!hasDateAttr : (domain === 'input_datetime' || domain === 'datetime' || domain === 'date');
      const hasTime = hasTimeAttr !== undefined ? !!hasTimeAttr : (domain === 'input_datetime' || domain === 'datetime' || domain === 'time');
      const input = String(raw || '').trim();
      let datePart = '';
      let timePart = '';
      if (hasDate && hasTime) {
        const s = input.replace(' ', 'T');
        const m = s.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})[T ]([0-9]{2}:[0-9]{2})(?::([0-9]{2}))?$/);
        if (m) {
          datePart = m[1];
          const seconds = m[3] ?? '00';
          timePart = `${m[2]}:${seconds}`;
        }
      } else if (hasDate) {
        const m = input.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})$/);
        if (m) datePart = m[1];
      } else if (hasTime) {
        let time = input;
        if (/^[0-9]{2}:[0-9]{2}$/.test(time)) time += ':00';
        if (/^[0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(time)) timePart = time;
      }

      const serviceDomain = (domain === 'datetime' || domain === 'date' || domain === 'time') ? domain : 'input_datetime';
      if (serviceDomain === 'input_datetime') {
        const data = { entity_id: entityId };
        if (datePart) data.date = datePart;
        if (timePart) data.time = timePart;
        this.hass?.callService('input_datetime', 'set_datetime', data);
        return;
      }

      const data = { entity_id: entityId };
      let provided = false;
      if (serviceDomain === 'datetime') {
        if (datePart && timePart) {
          data.datetime = `${datePart} ${timePart}`;
          provided = true;
        } else if (datePart) {
          data.datetime = `${datePart} 00:00:00`;
          provided = true;
        } else if (timePart) {
          data.datetime = `1970-01-01 ${timePart}`;
          provided = true;
        }
      } else if (serviceDomain === 'date') {
        if (datePart) {
          data.date = datePart;
          provided = true;
        }
      } else if (serviceDomain === 'time') {
        if (timePart) {
          data.time = timePart;
          provided = true;
        }
      }
      if (!provided && input) {
        // Fallback: send generic value payload.
        data.value = input;
      }
      this.hass?.callService(serviceDomain, 'set_value', data);
    } catch (e) { /* noop */ }
  }
  _onPressButton(entityId) {
    try {
      // Legacy helper; not used if cell actions are configured.
      const domain = entityId?.split?.('.')[0] || 'input_button';
      const serviceDomain = domain === 'button' ? 'button' : 'input_button';
      this.hass?.callService(serviceDomain, 'press', { entity_id: entityId });
    } catch (e) { /* noop */ }
  }
}

if (!customElements.get('flex-cells-card')) {
  customElements.define('flex-cells-card', FlexCellsCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'flex-cells-card',
  name: 'Flex Cells Card',
  description: 'A Lovelace card for Home Assistant that lets you add icons, text, entities, attributes, or input controls in flexible cell layouts - fully configurable from a visual editor, so no documentation is required to get started.',
});