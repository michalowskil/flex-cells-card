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
      font-size: 16px;
      border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
    }
    .wrap { width: 100%; border-radius: inherit; overflow: hidden; }
    .scroller { width: 100%; display: block; }
    .datatable { width: 100%; border-collapse: collapse; }
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
    .ctrl-wrap { display:inline-flex; align-items:center; gap:8px; }
    .ctrl-range { width: 140px; vertical-align: middle; }
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

  setConfig(config) {
    const fallbackColCount = (() => {
      if (!Array.isArray(config.rows)) return 1;
      for (const row of config.rows) {
        if (Array.isArray(row?.cells) && row.cells.length) return row.cells.length;
      }
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

  _formatDateWithPattern(date, pattern) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const locale = (this?.hass?.locale?.language || this?.hass?.language || (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en');
    const tokens = ['YYYY','MMMM','YY','MM','M','DD','D','HH','H','hh','h','mm','m','ss','s'];
    const hours24 = date.getHours();
    const mapping = {
      'YYYY': String(date.getFullYear()),
      'MMMM': new Intl.DateTimeFormat(locale, { month: 'long' }).format(date),
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
    };
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
          if (pat.startsWith(token, i)) {
            out += mapping[token] ?? token;
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
      const formatted = this._formatDateWithPattern(date, pattern);
      if (formatted !== null && formatted !== undefined) return formatted;
    }
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

  _getDynamicEntityOverwriteValue(cell, dyn) {
    if (!dyn || (dyn.overwrite || '').toLowerCase() !== 'entity') return '';
    const fallbackEntity = cell?.type === 'entity' ? cell?.value : '';
    const targetEntity = dyn.overwrite_entity || dyn.entity || fallbackEntity || '';
    if (!targetEntity) return '';
    const stateObj = this.hass?.states?.[targetEntity];
    if (!stateObj) return '';
    let attrPath = dyn.overwrite_attr !== undefined ? dyn.overwrite_attr : dyn.attr;
    if ((attrPath === undefined || attrPath === null || attrPath === '') && targetEntity === (cell?.value || '') && cell?.attribute) {
      attrPath = cell.attribute;
    }
    const stub = { type: 'entity', value: targetEntity };
    if (cell?.precision !== undefined) stub.precision = cell.precision;
    if (cell?.scale !== undefined) stub.scale = cell.scale;
    if (attrPath !== undefined && attrPath !== null && attrPath !== '') {
      stub.attribute = String(attrPath);
      stub.use_entity_unit = false;
      if (dyn.overwrite_unit !== undefined) stub.unit = dyn.overwrite_unit;
    } else if (dyn.overwrite_unit !== undefined) {
      stub.unit = dyn.overwrite_unit;
    }
    return this._formatEntityCell(stub, stateObj);
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
    if (domain === 'input_boolean') {
      const checked = stateObj?.state === 'on';
      return html`<label class="ctrl-wrap"><input class="ctrl-switch" type="checkbox" .checked=${checked}
        @change=${(e) => this._onToggleBoolean(entityId, !!e.target.checked)} /></label>`;
    }
    if (domain === 'input_number') {
      const attrs = stateObj?.attributes || {};
      const min = Number(attrs.min ?? 0);
      const max = Number(attrs.max ?? 100);
      const stepRaw = attrs.step;
      const step = (stepRaw === 'any' || stepRaw == null) ? 1 : Number(stepRaw) || 1;
      const val = Number(stateObj?.state) || 0;
      return html`<span class="ctrl-wrap">
        <input class="ctrl-range" type="range" min="${min}" max="${max}" step="${step}" .value=${String(val)}
          @change=${(e) => this._onSetNumber(entityId, Number(e.target.value))} />
        <span class="ctrl-value">${this._formatEntityCell(cell, stateObj)}</span>
      </span>`;
    }
    if (domain === 'input_select') {
      const rawOpts = stateObj?.attributes?.options;
      const opts = Array.isArray(rawOpts) ? rawOpts.map(o => String(o)) : [];
      const cur = String(stateObj?.state ?? '');
      return html`<select class="ctrl-select" .value=${cur}
        @change=${(e) => this._onSelectOption(entityId, e.target.value)}>
        ${opts.map(o => html`<option value="${o}" ?selected=${o === cur}>${o}</option>`)}
      </select>`;
    }
    if (domain === 'input_text') {
      const cur = String(stateObj?.state ?? '');
      return html`<input class="ctrl-input" type="text" .value=${cur}
    @change=${(e) => this._onSetText(entityId, e.target.value)} />`;
    }
    if (domain === 'input_datetime') {
      const attrs = stateObj?.attributes || {};
      const hasDate = !!attrs.has_date;
      const hasTime = !!attrs.has_time;
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

    if (domain === 'input_button') {
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
  _onToggleBoolean(entityId, isOn) {
    const svc = isOn ? 'turn_on' : 'turn_off';
    try { this.hass?.callService('input_boolean', svc, { entity_id: entityId }); } catch (e) { /* noop */ }
  }
  _onSetNumber(entityId, value) {
    try { this.hass?.callService('input_number', 'set_value', { entity_id: entityId, value }); } catch (e) { /* noop */ }
  }
  _onSelectOption(entityId, option) {
    try { this.hass?.callService('input_select', 'select_option', { entity_id: entityId, option }); } catch (e) { /* noop */ }
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
      if (domain === 'input_button') {
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

    for (const r of rules) {
      if (!r || typeof r !== 'object') continue;
      const op = r.op || '=';
      let sourceVal;
      let isThisEntity = false; // for rescale

      if (r.entity) {
        // NEW: always read from selected entity/attribute
        const stObj = this.hass?.states?.[r.entity];
        sourceVal = r.attr ? readAttr(stObj, r.attr) : stObj?.state;
        isThisEntity = (type === 'entity' && r.entity === cell?.value);
      } else if (r.src) {
        // LEGACY support
        const src = r.src || 'this_display';
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
            sourceVal = readAttr(stObj, r.attr);
          }
        } else if (src === 'other_state') {
          const stObj = this.hass?.states?.[r.entity];
          sourceVal = stObj?.state;
        } else if (src === 'other_attr') {
          const stObj = this.hass?.states?.[r.entity];
          sourceVal = readAttr(stObj, r.attr);
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

      // numeric operators
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
          const a = this._coerceNumber(r.val);
          const b = this._coerceNumber(r.val2);
          if (Number.isFinite(a) && Number.isFinite(b)) {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            match = (num >= min && num <= max);
          } else {
            match = false;
          }
        } else {
          const ref = this._coerceNumber(r.val);
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
        const needle = String(r.val ?? '').toLowerCase();
        match = s.includes(needle);
        if (op === 'not_contains') match = !match;
      } else {
        // '=' or '!=' : try numeric if both numeric, else case-insensitive string
        const leftNum = this._coerceNumber(sourceVal);
        const rightNum = this._coerceNumber(r.val);
        if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) {
          match = (leftNum === rightNum);
        } else {
          const a = String(sourceVal ?? '').toLowerCase();
          const b = String(r.val ?? '').toLowerCase();
          match = (a === b);
        }
        if (op === '!=') match = !match;
      }

      if (match) {
        if (r.bg) res.bg = r.bg;
        if (r.fg) res.fg = r.fg;
        if (r.visibility) {
          const visRaw = String(r.visibility).toLowerCase();
          if (visRaw === 'visible' || visRaw === 'hidden') res.visibility = visRaw;
        }
        // New overwrite API
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
          res.hide = true; // hide original
          res.overwrite = 'icon';
          res.icon = r.icon || '';
        } else if (ow === 'entity') {
          res.hide = true;
          res.overwrite = 'entity';
          if (r.overwrite_entity !== undefined) res.overwrite_entity = r.overwrite_entity;
          else if (r.entity !== undefined) res.overwrite_entity = r.entity;
          if (r.overwrite_attr !== undefined) res.overwrite_attr = r.overwrite_attr;
          else if (r.attr !== undefined) res.overwrite_attr = r.attr;
          if (r.overwrite_unit !== undefined) res.overwrite_unit = r.overwrite_unit;
        } else {
          // Legacy support
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
      const dynamicValue = this._getDynamicEntityOverwriteValue(cell, dyn);
      if (dynamicValue !== undefined && dynamicValue !== null && dynamicValue !== '') {
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
    } else if (!this._hasCellActions(cell) && cell?.type === 'entity' && entityId) {
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
        } else if (!this._hasCellActions(cell) && cell?.type === 'entity' && entityId) {
          this._openMoreInfo(entityId);
        }
      }, dblWindow);
      return;
    }

    if (hasTap) {
      this._runAction(tap, entityId);
    } else if (!this._hasCellActions(cell) && cell?.type === 'entity' && entityId) {
      this._openMoreInfo(entityId);
    }
  }

  // ---------- render ----------

  _renderHeaderCell(cell, colSpan = 1) {
    const numericSpan = Number(colSpan);
    const span = Number.isFinite(numericSpan) && numericSpan > 1 ? numericSpan : 1;
    const type = cell?.type || 'string';
    const val = cell?.value ?? '';
    const align = cell?.align || 'left';

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
        const dynValue = this._getDynamicEntityOverwriteValue(cell, dyn);
        content = dynValue !== undefined && dynValue !== null && dynValue !== ''
          ? dynValue
          : (dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '');
      } else if (dyn && dyn.hide) {
        content = dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '';
      } else {
        content = display ? html`<ha-icon style=${iconStyle} icon="${display}"></ha-icon>` : '';
      }

      if (hasActions) {
        const aria = display || 'icon';
        return html`
          <th class="icon clickable"
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
      return html`<th class="icon" colspan=${span} style=${thStyle}>${content}</th>`;
    }

    if (type === 'entity') {
      const stateObj = this.hass?.states?.[val];
      const domain = val?.split?.('.')?.[0];
      if (cell?.show_control && stateObj && (domain === 'input_boolean' || domain === 'input_number' || domain === 'input_select' || domain === 'input_button' || domain === 'input_datetime' || domain === 'input_text')) {
        const _disp = this._formatEntityCell(cell, stateObj);
        const _dyn = this._evaluateDynColor(cell, type, _disp);
        const { style: _thStyle } = this._buildTextStyle(cell, type, align, _dyn);
        return html`<th colspan=${span} style=${_thStyle}>${this._renderEntityControl(cell, stateObj, val)}</th>`;
      }
      const display = stateObj ? this._formatEntityCell(cell, stateObj) : 'n/a';
      const dyn = this._evaluateDynColor(cell, type, display);
      const mode = this._getEntityDisplayMode(cell);
      const { style: thStyle, textDecoration } = this._buildTextStyle(cell, type, align, dyn, { skipTextDecoration: mode === 'icon_value' });
      const hasActions = this._hasCellActions(cell);
      const shown = this._buildEntityDisplayContent(cell, stateObj, display, dyn, textDecoration, mode);
      const aria = stateObj ? `${val}: ${display}` : val;
      const cls = mode === 'icon' ? 'icon clickable' : 'clickable';

      if (hasActions) {
        return html`
          <th class=${cls}
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

      // Default 'more-info' for header entity if no actions
      return html`
        <th class=${cls}
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

    const display = val ?? '';
    const dyn = this._evaluateDynColor(cell, type, display);
    const { style: thStyle } = this._buildTextStyle(cell, type, align, dyn);
    const hasActions = this._hasCellActions(cell);
    let shown;
    if (dyn && dyn.overwrite === 'icon') {
      shown = html`<ha-icon style=${this._buildIconStyle(cell, dyn)} icon="${dyn.icon || ''}"></ha-icon>`;
    } else if (dyn && dyn.overwrite === 'entity') {
      const dynValue = this._getDynamicEntityOverwriteValue(cell, dyn);
      shown = (dynValue !== undefined && dynValue !== null && dynValue !== '') ? dynValue : (dyn?.mask || '');
    } else if (dyn && dyn.hide) {
      shown = dyn.mask || '';
    } else {
      shown = val ?? '';
    }

    if (hasActions) {
      const aria = String(val || 'text');
      return html`
        <th class="clickable"
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

    return html`<th colspan=${span} style=${thStyle}>${shown}</th>`;
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
        const dynValue = this._getDynamicEntityOverwriteValue(cell, dyn);
        content = dynValue !== undefined && dynValue !== null && dynValue !== ''
          ? dynValue
          : (dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '');
      } else if (dyn && dyn.hide) {
        content = dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '';
      } else {
        content = display ? html`<ha-icon style=${iconStyle} icon="${display}"></ha-icon>` : '';
      }

      descriptor.className = hasActions ? 'icon clickable' : 'icon';
      descriptor.style = tdStyle;
      descriptor.content = content;

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
      if (cell?.show_control && stateObj && !cell?.attribute && (domain === 'input_boolean' || domain === 'input_number' || domain === 'input_select' || domain === 'input_button' || domain === 'input_datetime' || domain === 'input_text')) {
        const display = this._formatEntityCell(cell, stateObj);
        const cellDyn = this._evaluateDynColor(cell, type, display);
        const dyn = mergeDyn(cellDyn);
        const { style: tdStyle } = this._buildTextStyle(cell, type, align, dyn);
        descriptor.style = tdStyle;
        descriptor.content = this._renderEntityControl(cell, stateObj, val);
        return descriptor;
      }

      const display = stateObj ? this._formatEntityCell(cell, stateObj) : 'n/a';
      const cellDyn = this._evaluateDynColor(cell, type, display);
      const dyn = mergeDyn(cellDyn);
      const mode = this._getEntityDisplayMode(cell);
      const { style: tdStyle, textDecoration } = this._buildTextStyle(cell, type, align, dyn, { skipTextDecoration: mode === 'icon_value' });
      const hasActions = this._hasCellActions(cell);
      const shown = this._buildEntityDisplayContent(cell, stateObj, display, dyn, textDecoration, mode);
      const aria = stateObj ? `${val}: ${display}` : val;
      const cls = mode === 'icon' ? 'icon clickable' : 'clickable';

      descriptor.className = cls;
      descriptor.style = tdStyle;
      descriptor.title = val;
      descriptor.role = 'button';
      descriptor.tabIndex = 0;
      descriptor.ariaLabel = aria;
      descriptor.content = shown;

      if (hasActions) {
        descriptor.onContextMenu = (e) => e.preventDefault();
        descriptor.onPointerDown = (e) => this._onCellPointerDown(e, cell, val);
        descriptor.onPointerUp = (e) => this._onCellPointerUp(e, cell, val);
        descriptor.onPointerCancel = (e) => this._onCellPointerCancel(e);
        descriptor.onMouseLeave = (e) => this._onCellPointerCancel(e);
        descriptor.onKeydown = (e) => this._onCellKeydown(e, cell);
      } else {
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
      const dynValue = this._getDynamicEntityOverwriteValue(cell, dyn);
      shown = (dynValue !== undefined && dynValue !== null && dynValue !== '') ? dynValue : (dyn?.mask || '');
    } else if (dyn && dyn.hide) {
      shown = dyn.mask || '';
    } else {
      shown = val ?? '';
    }

    descriptor.className = hasActions ? 'clickable' : '';
    descriptor.style = tdStyle;
    descriptor.content = shown;

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

  _renderBodyCell(cell, rowDyn = null, colSpan = 1) {
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

    return html`
      <td
        class=${className ? className : nothing}
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

  _renderStandaloneCell(cell, rowDyn = null, colSpan = 1, extraStyle = '') {
    const descriptor = this._describeBodyCell(cell, rowDyn, colSpan);
    if (!descriptor) return html``;
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
    const classes = ['fcc-template-cell'];
    if (className) classes.push(className);
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
    return html`
      <span
        class=${classes.join(' ') || nothing}
        style=${finalStyle || nothing}
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

  _renderTemplateCell(templateRows, rowNumber, colNumber, inlineStyle = '') {
    if (!Number.isInteger(rowNumber) || rowNumber <= 0) return html``;
    if (!Number.isInteger(colNumber) || colNumber <= 0) return html``;
    const entry = templateRows[rowNumber - 1];
    if (!entry) return html``;
    if (entry.mergeColumns) {
      if (colNumber !== 1) return html``;
      const cell = entry.cells[0] ?? { type: 'string', value: '', align: 'right' };
      return this._renderStandaloneCell(cell, entry.rowDyn, entry.colSpan, inlineStyle);
    }
    const idx = colNumber - 1;
    if (idx < 0 || idx >= entry.cells.length) return html``;
    const cell = entry.cells[idx] ?? { type: 'string', value: '', align: 'right' };
    return this._renderStandaloneCell(cell, entry.rowDyn, 1, inlineStyle);
  }

  _renderCustomTemplate(templateHtml, templateRows) {
    const raw = typeof templateHtml === 'string' ? templateHtml : '';
    if (!raw) return html``;
    const regex = /<fcc\b([^>]*)\/>/gi;
    const strings = [];
    const rawStrings = [];
    const values = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      const before = raw.slice(lastIndex, match.index);
      strings.push(before);
      rawStrings.push(before);

      const attrs = match[1] || '';
      const rowMatch = attrs.match(/row\s*=\s*"(\d+)"/i);
      const colMatch = attrs.match(/col\s*=\s*"(\d+)"/i);
      const styleMatch =
        attrs.match(/style\s*=\s*"([^"]*)"/i) ||
        attrs.match(/style\s*=\s*'([^']*)'/i);
      const rowNumber = rowMatch ? parseInt(rowMatch[1], 10) : NaN;
      const colNumber = colMatch ? parseInt(colMatch[1], 10) : NaN;
      const styleValue = styleMatch ? styleMatch[1] : '';

      if (Number.isInteger(rowNumber) && rowNumber > 0 && Number.isInteger(colNumber) && colNumber > 0) {
        values.push(this._renderTemplateCell(templateRows, rowNumber, colNumber, styleValue));
      } else {
        const idx = strings.length - 1;
        strings[idx] = strings[idx] + match[0];
        rawStrings[idx] = rawStrings[idx] + match[0];
        lastIndex = regex.lastIndex;
        continue;
      }

      lastIndex = regex.lastIndex;
    }

    const tail = raw.slice(lastIndex);
    strings.push(tail);
    rawStrings.push(tail);

    if (!values.length) {
      return html`${unsafeHTML(raw)}`;
    }

    const stringsCopy = strings.slice(0);
    const rawCopy = rawStrings.slice(0);
    const templateStrings = stringsCopy;
    templateStrings.raw = rawCopy;
    Object.freeze(rawCopy);
    Object.freeze(templateStrings);
    return html(templateStrings, ...values);
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
    const rows = Array.isArray(cfg.rows) ? cfg.rows : [];
    const colCount = cfg.column_count ?? 1;
    const padVal = this._resolveCardPadding();
    const customTemplateEnabled = !!cfg.custom_template_enabled;
    const customTemplateRaw = typeof cfg.custom_template_html === 'string' ? cfg.custom_template_html : '';
    const customTemplateHasContent = customTemplateEnabled && customTemplateRaw.trim() !== '';

    if (!rows.length) {
      const defaultCard = html`<div class="card" style="padding:${padVal}px;">${t(this.hass, "card.no_rows")}</div>`;
      if (!customTemplateHasContent) {
        return defaultCard;
      }
      const templateCard = html`
        <div class="card fcc-template-card" style="padding:${padVal}px;">
          ${this._renderCustomTemplate(customTemplateRaw, [])}
        </div>
      `;
      return this._isInEditorPreview()
        ? html`<div class="fcc-preview-stack">${defaultCard}${templateCard}</div>`
        : templateCard;
    }

    const headerIndex = cfg.header_from_first_row
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
        return this._renderSeparatorRow(separatorRow, colCount);
      }
      const rowDyn = this._evaluateRowRules(row);
      if (rowDyn?.visibility === 'hidden') {
        return html``;
      }
      if (cfg.zebra) {
        zebraCounter += 1;
      }
      const zebraClass = (cfg.zebra && zebraCounter % 2 === 0) ? 'fc-zebra-alt' : '';
      const cells = Array.isArray(row?.cells) ? row.cells : [];
      if (row?.merge_columns) {
        const cell = cells[0] ?? { type: 'string', value: '', align: 'right' };
        templateRows.push({
          row,
          rowDyn,
          mergeColumns: true,
          cells: [cell],
          colSpan: Math.max(1, colCount || 1),
        });
        return html`<tr class=${zebraClass}>${this._renderBodyCell(cell, rowDyn, Math.max(1, colCount || 1))}</tr>`;
      }
      const filled = Array.from({ length: colCount }, (_, i) =>
        cells[i] ?? { type: 'string', value: '', align: 'right' }
      );
      templateRows.push({
        row,
        rowDyn,
        mergeColumns: false,
        cells: filled,
        colSpan: 1,
      });
      return html`<tr class=${zebraClass}>${filled.map((cell) => this._renderBodyCell(cell, rowDyn))}</tr>`;
    });

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
              ${(() => {
      const cells = Array.isArray(headerRow?.cells) ? headerRow.cells : [];
      if (headerRow?.merge_columns) {
        const cell = cells[0] ?? { type: 'string', value: '', align: 'left', style: { bold: true } };
        const withBold = cell.style?.bold === undefined
          ? { ...cell, style: { ...(cell.style || {}), bold: true } }
          : cell;
        return this._renderHeaderCell(withBold, Math.max(1, colCount || 1));
      }
      return Array.from({ length: colCount }, (_, i) => {
        const cell = cells[i] ?? { type: 'string', value: '', align: 'left', style: { bold: true } };
        const withBold = cell.style?.bold === undefined
          ? { ...cell, style: { ...(cell.style || {}), bold: true } }
          : cell;
        return this._renderHeaderCell(withBold);
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

    const defaultCard = html`
      <div class="card" style="padding:${padVal}px;">
        ${cfg.overflow_x
        ? html`<div class="wrap"><div class="scroller" style="overflow-x:auto; overflow-y:hidden">${table}</div></div>`
        : html`<div class="wrap">${table}</div>`}
      </div>
    `;

    if (!customTemplateHasContent) {
      return defaultCard;
    }

    const templateCard = html`
      <div class="card fcc-template-card" style="padding:${padVal}px;">
        ${this._renderCustomTemplate(customTemplateRaw, templateRows)}
      </div>
    `;

    return this._isInEditorPreview()
      ? html`<div class="fcc-preview-stack">${defaultCard}${templateCard}</div>`
      : templateCard;
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
      this.hass?.callService('input_text', 'set_value', { entity_id: entityId, value: value ?? '' });
    } catch (e) { /* noop */ }
  }
  _onSetDatetime(entityId, raw) {
    try {
      const st = this.hass?.states?.[entityId];
      const attrs = st?.attributes || {};
      const hasDate = !!attrs.has_date;
      const hasTime = !!attrs.has_time;
      const data = { entity_id: entityId };
      if (hasDate && hasTime) {
        const s = String(raw || '').replace(' ', 'T');
        const m = s.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}:[0-9]{2})(?::[0-9]{2})?$/);
        if (m) { data.date = m[1]; data.time = m[2] + ':00'; }
      } else if (hasDate) {
        const m = String(raw || '').match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})$/);
        if (m) data.date = m[1];
      } else if (hasTime) {
        let time = String(raw || '');
        if (/^[0-9]{2}:[0-9]{2}$/.test(time)) time += ':00';
        if (/^[0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(time)) data.time = time;
      }
      this.hass?.callService('input_datetime', 'set_datetime', data);
    } catch (e) { /* noop */ }
  }
  _onPressButton(entityId) {
    try {
      // Legacy helper; not used if cell actions are configured.
      this.hass?.callService('input_button', 'press', { entity_id: entityId });
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