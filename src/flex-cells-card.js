import { LitElement, html, css } from 'lit';
import { t } from './localize/localize.js';
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
    .wrap { width: 100%; border-radius: inherit; overflow: hidden; }
    .scroller { width: 100%; display: block; }
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
  
    .icon-mask { display:inline-block; vertical-align:middle; }`;

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

  _rescaleIfConfigured(cell, n) {
    const a = Number(cell?.scale_in_min);
    const b = Number(cell?.scale_in_max);
    const c = Number(cell?.scale_out_min);
    const d = Number(cell?.scale_out_max);
    if (![a,b,c,d].every(Number.isFinite) || a === b) return n;
    let t = (n - a) / (b - a);
    // domyślnie: clamp do [0,1] — zachowuje się „intuicyjnie” dla zakresów typu 0–255 -> 0–100
    t = Math.max(0, Math.min(1, t));
    return c + t * (d - c);
  }

  _formatEntityCell(cell, stateObj) {
    // Show attribute value if requested; otherwise show the entity state
    const isAttr = !!cell?.attribute;
    let source;
    if (isAttr) {
      const attr = cell?.attribute;
      if (typeof attr === 'string' && attr.includes('.')) {
        source = this._getByPath(stateObj?.attributes, attr);
      } else {
        source = stateObj?.attributes?.[attr];
      }
    } else {
      source = stateObj?.state;
    }
    const raw = (source !== undefined && source !== null) ? source : 'n/a';
    let text;
    if (this._isNumericState(raw)) {
      let num = Number(raw);
      num = this._rescaleIfConfigured(cell, num);
      if (cell?.precision === 0 || cell?.precision === 1 || cell?.precision === 2) {
        text = num.toFixed(cell.precision);
      } else {
        text = String(num);
      }
    } else {
      text = (typeof raw === 'object' && raw !== null) ? JSON.stringify(raw) : raw;
    }

    // Unit logic:
    // - for attribute: prefer explicit 'unit' on cell; otherwise no automatic unit
    // - for state: allow using the entity's native unit unless disabled
    let unit = '';
    if (isAttr) {
      unit = cell?.unit ?? '';
    } else {
      const useEntityUnit = cell?.use_entity_unit !== false;
      unit = useEntityUnit ? (stateObj?.attributes?.unit_of_measurement ?? '') : (cell?.unit ?? '');
    }

    return `${text}${unit ? ` ${unit}` : ''}`;
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

    const res = { }; // { bg, fg, hide, mask }
    const resolvePath = (obj, path) => {
      if (!obj || !path) return undefined;
      const norm = String(path).replace(/\[(\d+)\]/g, '.$1');
      const parts = norm.split('.').filter(Boolean);
      let cur = obj;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
        else return undefined;
      }
      return cur;
    };
    const getAttr = (stObj, attr) => {
      if (!stObj || !attr) return undefined;
      if (typeof attr === 'string' && attr.includes('.')) {
        return resolvePath(stObj.attributes, attr);
      }
      return stObj.attributes?.[attr];
    };

    for (const r of rules) {
      if (!r || typeof r !== 'object') continue;
      const op = r.op || '=';
      let sourceVal;
      let isThisEntity = false; // for rescale

      if (r.entity) {
        // NEW: always read from selected entity/attribute
        const stObj = this.hass?.states?.[r.entity];
        sourceVal = r.attr ? getAttr(stObj, r.attr) : stObj?.state;
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
            sourceVal = getAttr(stObj, r.attr);
          }
        } else if (src === 'other_state') {
          const stObj = this.hass?.states?.[r.entity];
          sourceVal = stObj?.state;
        } else if (src === 'other_attr') {
          const stObj = this.hass?.states?.[r.entity];
          sourceVal = getAttr(stObj, r.attr);
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
        if (r.hide !== undefined) res.hide = !!r.hide;
        if (r.mask !== undefined) res.mask = r.mask;
      }
    }
    return res;
  }


  _buildTextStyle(cell, type, align, dyn){
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
    if (dyn && dyn.bg) parts.push(`background:${dyn.bg}`);
    if (dyn && dyn.fg) parts.push(`color:${dyn.fg}`);
    return parts.join(';');
  }

  _buildIconStyle(cell, dyn){
    const st = cell?.style || {};
    const parts = [];
    if (st.color) parts.push(`color:${st.color}`);
    if (dyn && dyn.fg) parts.push(`color:${dyn.fg}`);
    const globalSize = this.config?.text_size;
    const iconSize = st.icon_size || globalSize || '';
    if (iconSize) parts.push(`--mdc-icon-size:${iconSize}`);
    return parts.join(';');
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
    try { e.preventDefault(); } catch(_) {}
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
  
  _renderHeaderCell(cell) {
    const type = cell?.type || 'string';
    const val = cell?.value ?? '';
    const align = cell?.align || 'left';

    if (type === 'icon') {
      const display = val;
      const dyn = this._evaluateDynColor(cell, type, display);
      const thStyle = this._buildTextStyle(cell, type, align, dyn);
      const hasActions = this._hasCellActions(cell);
      const iconStyle = this._buildIconStyle(cell, dyn);
      const content = (dyn && dyn.hide) ? (dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '') : (display ? html`<ha-icon style=${iconStyle} icon="${display}"></ha-icon>` : '');

      if (hasActions) {
        const aria = display || 'icon';
        return html`
          <th class="icon clickable"
              style=${thStyle}
              role="button"
              tabindex="0"
              aria-label=${aria}
              @pointerdown=${(e)=>this._onCellPointerDown(e, cell)}
              @pointerup=${(e)=>this._onCellPointerUp(e, cell)}
              @pointercancel=${(e)=>this._onCellPointerCancel(e)}
              @mouseleave=${(e)=>this._onCellPointerCancel(e)}
              @keydown=${(e)=>this._onCellKeydown(e, cell)}>
            ${content}
          </th>
        `;
      }
      return html`<th class="icon" style=${thStyle}>${content}</th>`;
    }

    if (type === 'entity') {
      const stateObj = this.hass?.states?.[val];
      const display = stateObj ? this._formatEntityCell(cell, stateObj) : 'n/a';
      const dyn = this._evaluateDynColor(cell, type, display);
      const thStyle = this._buildTextStyle(cell, type, align, dyn);
      const hasActions = this._hasCellActions(cell);
      const shown = (dyn && dyn.hide) ? (dyn.mask || '') : display;
      const aria = stateObj ? `${val}: ${display}` : val;

      if (hasActions) {
        return html`
          <th class="clickable"
              style=${thStyle}
              title=${val}
              role="button"
              tabindex="0"
              aria-label=${aria}
              @pointerdown=${(e)=>this._onCellPointerDown(e, cell, val)}
              @pointerup=${(e)=>this._onCellPointerUp(e, cell, val)}
              @pointercancel=${(e)=>this._onCellPointerCancel(e)}
              @mouseleave=${(e)=>this._onCellPointerCancel(e)}
              @keydown=${(e)=>this._onCellKeydown(e, cell)}>
            ${shown}
          </th>
        `;
      }

      // Default 'more-info' for header entity if no actions
      return html`
        <th class="clickable"
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
    const thStyle = this._buildTextStyle(cell, type, align, dyn);
    const hasActions = this._hasCellActions(cell);
    const shown = (dyn && dyn.hide) ? (dyn.mask || '') : (val ?? '');

    if (hasActions) {
      const aria = String(val || 'text');
      return html`
        <th class="clickable"
            style=${thStyle}
            role="button"
            tabindex="0"
            aria-label=${aria}
            @pointerdown=${(e)=>this._onCellPointerDown(e, cell)}
            @pointerup=${(e)=>this._onCellPointerUp(e, cell)}
            @pointercancel=${(e)=>this._onCellPointerCancel(e)}
            @mouseleave=${(e)=>this._onCellPointerCancel(e)}
            @keydown=${(e)=>this._onCellKeydown(e, cell)}>
          ${shown}
        </th>
      `;
    }

    return html`<th style=${thStyle}>${shown}</th>`;
  }



  
  _renderBodyCell(cell) {
    const type = cell?.type || 'string';
    const val = cell?.value ?? '';
    const align = cell?.align || 'right';

    if (type === 'icon') {
      const display = val;
      const dyn = this._evaluateDynColor(cell, type, display);
      const tdStyle = this._buildTextStyle(cell, type, align, dyn);
      const hasActions = this._hasCellActions(cell);
      const iconStyle = this._buildIconStyle(cell, dyn);
      const content = (dyn && dyn.hide) ? (dyn?.mask ? html`<span class="icon-mask">${dyn.mask}</span>` : '') : (display ? html`<ha-icon style=${iconStyle} icon="${display}"></ha-icon>` : '');

      if (hasActions) {
        const aria = display || 'icon';
        return html`
          <td class="icon clickable"
              style=${tdStyle}
              role="button"
              tabindex="0"
              aria-label=${aria}
              @contextmenu=${(e)=>e.preventDefault()}
              @pointerdown=${(e)=>this._onCellPointerDown(e, cell)}
              @pointerup=${(e)=>this._onCellPointerUp(e, cell)}
              @pointercancel=${(e)=>this._onCellPointerCancel(e)}
              @mouseleave=${(e)=>this._onCellPointerCancel(e)}
              @keydown=${(e)=>this._onCellKeydown(e, cell)}>
            ${content}
          </td>
        `;
      }
      return html`<td class="icon" style=${tdStyle}>${content}</td>`;
    }

    if (type === 'entity') {
      const stateObj = this.hass?.states?.[val];
      const display = stateObj ? this._formatEntityCell(cell, stateObj) : 'n/a';
      const dyn = this._evaluateDynColor(cell, type, display);
      const tdStyle = this._buildTextStyle(cell, type, align, dyn);
      const hasActions = this._hasCellActions(cell);
      const shown = (dyn && dyn.hide) ? (dyn.mask || '') : display;
      const aria = stateObj ? `${val}: ${display}` : val;

      if (hasActions) {
        return html`
          <td class="clickable"
              style=${tdStyle}
              title=${val}
              role="button"
              tabindex="0"
              aria-label=${aria}
              @contextmenu=${(e)=>e.preventDefault()}
              @pointerdown=${(e)=>this._onCellPointerDown(e, cell, val)}
              @pointerup=${(e)=>this._onCellPointerUp(e, cell, val)}
              @pointercancel=${(e)=>this._onCellPointerCancel(e)}
              @mouseleave=${(e)=>this._onCellPointerCancel(e)}
              @keydown=${(e)=>this._onCellKeydown(e, cell)}>
            ${shown}
          </td>
        `;
      }

      return html`
        <td class="clickable"
            style=${tdStyle}
            title=${val}
            role="button"
            tabindex="0"
            aria-label=${aria}
            @click=${() => this._openMoreInfo(val)}
            @keydown=${(e) => this._onEntityKeydown(e, val)}>
          ${shown}
        </td>
      `;
    }

    // string
    const display = val ?? '';
    const dyn = this._evaluateDynColor(cell, type, display);
    const tdStyle = this._buildTextStyle(cell, type, align, dyn);
    const hasActions = this._hasCellActions(cell);
    const shown = (dyn && dyn.hide) ? (dyn.mask || '') : (val ?? '');

    if (hasActions) {
      const aria = String(val || 'text');
      return html`
        <td class="clickable"
            style=${tdStyle}
            role="button"
            tabindex="0"
            aria-label=${aria}
            @contextmenu=${(e)=>e.preventDefault()}
            @pointerdown=${(e)=>this._onCellPointerDown(e, cell)}
            @pointerup=${(e)=>this._onCellPointerUp(e, cell)}
            @pointercancel=${(e)=>this._onCellPointerCancel(e)}
            @mouseleave=${(e)=>this._onCellPointerCancel(e)}
            @keydown=${(e)=>this._onCellKeydown(e, cell)}>
          ${shown}
        </td>
      `;
    }

    return html`<td style=${tdStyle}>${shown}</td>`;
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
      return html`<div class="card" style="padding:${padVal}px;">${t(this.hass, "card.no_rows")}</div>`;
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
        ${cfg.overflow_x
          ? html`<div class="wrap"><div class="scroller" style="overflow-x:auto; overflow-y:hidden">${table}</div></div>`
          : html`<div class="wrap">${table}</div>`}
      </div>
    `;
  }

  // NEW: fallback import — gdyby przeglądarka wczytała wersję bez edytora lub cache „zgubił” definicję
  static async getConfigElement() {
    if (!customElements.get('flex-cells-card-editor')) {
      try { await import('./flex-cells-card-editor.js'); } catch (_e) {}
    }
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
  description: 'A Lovelace card for Home Assistant that lets you add icons, text, entities, or attributes in flexible cell layouts — fully configurable from a visual editor with no documentation required.',
});
