import { LitElement, html, css } from 'lit';
import { t } from './localize/localize.js';

class FlexCellsCardEditor extends LitElement {
  static properties = { config: {}, hass: {} };

  static styles = css`
    .row { margin-bottom: 16px; }
    ha-textfield, ha-select { width: 100%; box-sizing: border-box; margin-bottom: 8px; }
    input[list], select, .text-input {
      width: 100%; padding: 10px 12px; font-size: 14px;
      border: 1px solid var(--divider-color,#ccc); border-radius: 8px; box-sizing: border-box;
      background: var(--card-background-color, white);
      transition: border 0.2s, box-shadow 0.2s;
    }
    input[list]:focus, select:focus, .text-input:focus {
      border-color: var(--primary-color, #03a9f4);
      outline: none; box-shadow: 0 0 4px rgba(3,169,244,.4);
    }
    .cols3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .cols2 > * { min-width: 0; }
    .cols2 {
      /* prevent overflow from MWC internals */
       display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 8px; }
    .cols2 > * { min-width: 0; }
    .option.group .cols1, .option.group .cols2, .option.group .cols3 { width: 100%; }
    .cols1 { display: grid; grid-template-columns: 1fr; gap: 8px; }
    .cols2 > * { min-width: 0; }
    .cols4 {
      display: grid;
      grid-template-columns: 1fr 1fr; /* było: repeat(4, 1fr) */
      gap: 8px;
    }
    .cols21 { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; }
    .cols2 > * { min-width: 0; }

    .cell-grid { display: grid; grid-template-columns: 160px 1fr; gap: 8px; align-items: center; margin-bottom: 8px; }
    .cell-wide { grid-template-columns: 1fr; }

    .flex { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .inline { display: inline-flex; align-items: center; gap: 8px; }
    .cols2 > * { min-width: 0; }
    .muted { color: #888; font-size: 12px; margin-top: -4px; margin-bottom: 8px; }
    .rulehdr { color: #888; font-size: 12px; margin: 0 0 4px; }
    .mini { width: 140px; padding: 6px 8px; font-size: 13px; margin: 0; }
    .mini-wide { width: 220px; padding: 6px 8px; font-size: 13px; margin: 0; }
    button { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--divider-color, #ddd); background: var(--card-background-color, #fff); cursor: pointer; }

    .options { display: grid; grid-template-columns: 1fr; gap: 8px; margin: 8px 0; }
    .option {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border: 1px solid var(--divider-color, #ddd);
      border-radius: 10px; background: var(--card-background-color, #fff);
      cursor: pointer; user-select: none;
    }
    .option input { margin: 0; }
    .option.unit { align-items: center; gap: 12px; }
    .option.unit span.label { flex: 0 0 auto; }
    .option.unit ha-textfield { flex: 1 1 auto; margin: 0; }
    .option.group { display:block; cursor: default; margin-bottom:12px; }
    .option.full { width: 100%; box-sizing: border-box; }

    .tabs { display: flex; gap: 6px; margin: 8px 0 12px; flex-wrap: wrap; }
    .tab {
      padding: 6px 10px; border-radius: 8px; border: 1px solid var(--divider-color,#ddd);
      background: var(--card-background-color,#fff); cursor: pointer; font-size: 13px;
    }
    .tab.active {
      border-color: var(--primary-color,#03a9f4);
      box-shadow: 0 0 0 2px rgba(3,169,244,0.15);
    }

    .rowbox { touch-action: pan-y; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 10px; background: var(--card-background-color, #fff); overflow: unset; }
    .rowhdr { display: grid; grid-template-columns: auto auto auto 1fr auto; gap: 8px; align-items: center; padding: 10px 8px; border-bottom: 1px solid var(--divider-color, #e0e0e0);
      user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
    }

    .handle {
      cursor: grab; padding: 6px 8px; border-radius: 8px;
      border: 1px dashed var(--divider-color, #ddd);
      font-family: system-ui, sans-serif; font-size: 14px; line-height: 1;
      color: var(--primary-text-color, #000);
      touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
    }

    .toggle { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--divider-color,#ddd); background: var(--card-background-color,#fff); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; line-height: 1; }
    .title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .preview { color: #777; min-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rowtools { display: inline-flex; gap: 6px; margin-left: auto; }
    .rowtools button { padding: 6px 10px; }
    .rowtools button.danger { color: var(--error-color, #d32f2f); }
    .rowbody { padding: 10px; }

    .dragover { outline: 2px dashed var(--primary-color, #03a9f4); outline-offset: 4px; }

    .colbar { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 10px; background: var(--card-background-color, #fff); margin: 8px 0 12px; overflow: hidden; }
    .colstrip { display: flex; gap: 8px; padding: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .colchip { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 10px; background: var(--card-background-color, #fff); padding: 8px; min-width: 120px; box-sizing: border-box; overflow: hidden; }
    .colchip.is-over { outline: 2px dashed var(--primary-color,#03a9f4); outline-offset: -4px; }

    .chiplabel { font-weight: 600; font-size: 13px; text-align: center; white-space: nowrap; }
    .chiptools { display: flex; gap: 6px; justify-content: center; align-items: center; width: 100%; }
    .chiptools button { display: inline-flex; align-items: center; justify-content: center; padding: 4px 8px; height: 28px; line-height: 1; box-sizing: border-box; flex: 0 0 auto; }
    .chiptools button.danger { color: var(--error-color, #d32f2f); }

    .colhandle {
      margin-top: 4px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      border: 1px dashed var(--divider-color,#ddd); border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #000);
      cursor: grab; user-select: none; touch-action: none;
      padding: 0 6px;
    }
    .colhandle:active { cursor: grabbing; }
    .dots {
      display: grid; grid-template-columns: repeat(5, min-content);
      column-gap: 6px; row-gap: 4px; align-items: center; justify-content: center;
    }
    .dot { width: 2px; height: 2px; border-radius: 50%; background: currentColor; }

    .addrow { margin: 6px 0 16px; }

    /* Sekcja przeskalowania: 4 rzędy, 2 kolumny */
    .option.group.scale {
      display: grid;
      grid-template-columns: repeat(2, minmax(140px, 1fr));
      gap: 8px 12px;
      padding: 12px;
      border: 1px solid var(--divider-color, #ddd);
      border-radius: 12px;
      background: var(--card-background-color, #fff);
      margin: 8px 0 12px; /* odstęp pod ramką przed "Alignment" */
    }

    .option.group.scale .label,
    .option.group.scale .muted {
      grid-column: 1 / -1; /* pierwszy i czwarty wiersz na pełną szerokość */
    }

    .option.group.scale ha-textfield.mini {
      width: 100%;
      margin: 0;
    }

    @media (max-width: 680px) {
      .cols3, .cols21 { grid-template-columns: 1fr; }
      .cols4 { grid-template-columns: 1fr 1fr; }
      .rowhdr { gap: 6px; padding: 8px 8px; }
      .handle { padding: 4px 6px; }
      .toggle { width: 28px; height: 28px; }
      .rowtools { gap: 6px; }
      .rowtools button, .chiptools button { padding: 4px 8px; height: 28px; }
      .preview { display: none; }
      .option.group.scale { grid-template-columns: 1fr; }
    }

    .toggle, .rowtools button { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }

    .rowhdr *:not(input):not(textarea):not(select) { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }

    /* Mobile scroll + selection fixes */
    .rowbox, .rowhdr, .rowbody,
    .rowhdr > *:not(.handle),
    .rowbody * { touch-action: pan-y; }
    .handle, .colhandle { touch-action: none; }
    .rowbox *:not(input):not(textarea):not(select) {
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .rowtools button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      color: var(--disabled-text-color, var(--secondary-text-color, #999));
      border-color: var(--divider-color, #ddd);
      box-shadow: none;
    }
    .chiptools button:disabled { opacity:.5; cursor:not-allowed; }
  
    .right { display: flex; justify-content: flex-end; }
    .dyn-hint { margin-top: 6px; }
    .option.group .attr-input { margin-top: 8px; margin-bottom: 8px; }
    .option.group button.danger { margin-top: 8px; }
    .option.group button.danger.mini { width: auto; }

    .option.group .mask-input { margin-top: 8px; }
`;

  _isSimpleControlEntity(cell) {
    const id = cell?.value || '';
    // Require entity id present and no attribute override
    if (!id || cell?.attribute) return false;
    const domain = (id.split ? id.split('.')[0] : '');
    const allowed = [
      'input_boolean',
      'input_number',
      'input_select',
      'input_button',
      'input_datetime',
      'input_text'
    ];
    return allowed.includes(domain);
  }
  _cellShowControlChanged(r, c, e) {
    const val = !!(e?.target?.checked);
    const rows = [ ...(this.config.rows || []) ];
    const row = { ...(rows[r] || {}) };
    const cells = [ ...(row.cells || []) ];
    const cell = { ...(cells[c] || {}) };
    if (val) cell.show_control = true; else delete cell.show_control;
    cells[c] = cell; rows[r] = { ...row, cells };
    this.config = { ...this.config, rows };
    this._fireConfigChanged?.();
  }


  constructor() {
    super();
    this.config = {
      rows: [],
      column_count: 2,
      card_padding: '',
      overflow_x: true,
      header_from_first_row: false,
      zebra: false,
      narrow_breakpoint: '',
      text_size: '',
      cell_padding: { top: 4, right: 0, bottom: 4, left: 0 }
    };
    this._activeTabs = {};
    this._clipboardCell = null;
    this._collapsed = [];
    this._dragIndex = null;
    this._dragOverIndex = null;

    this._fullCells = []; // bufor pełnych komórek

    // DnD kolumn
    this._colDragFrom = null;
    this._colDragOver = null;
    this._colDragActive = false;
    this._boundPointerMove = (e)=>this._onColPointerMove(e);
    this._boundPointerUp = (e)=>this._onColPointerUp(e);

    // DnD wierszy (bez autoscrolla)
    this._rowDragFrom = null;
    this._rowDragActive = false;
    this._boundRowPointerMove = (e)=>this._onRowPointerMove(e);
    this._boundRowPointerUp = (e)=>this._onRowPointerUp(e);

    this._isTouchDevice =
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      (navigator.maxTouchPoints || 0) > 0;
    this._preventContextMenu = (ev)=>{ try { ev.preventDefault(); } catch(_) {} };
    this._boundRowPointerCancel = (e)=>this._onRowPointerCancel?.(e);
    this._boundColPointerCancel = (e)=>this._onColPointerCancel?.(e);
  }
  /* === Attribute suggestions helpers === */
  _getEntityAttributesObject(rIdx, cIdx) {
    try {
      const id = this.config?.rows?.[rIdx]?.cells?.[cIdx]?.value;
      return this.hass?.states?.[id]?.attributes || {};
    } catch (_) { return {}; }
  }

  _resolvePath(obj, path) {
    if (!obj) return undefined;
    const parts = String(path || "").replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    let cur = obj;
    for (const raw of parts) {
      const key = (Array.isArray(cur) && /^\d+$/.test(raw)) ? Number(raw) : raw;
      if (cur == null || !(key in cur)) return undefined;
      cur = cur[key];
    }
    return cur;
  }

  _listKeys(node) {
    if (node == null) return [];
    if (Array.isArray(node)) return node.map((_, i) => String(i));
    if (typeof node === 'object') return Object.keys(node);
    return [];
  }

  _buildAttrSuggestions(rIdx, cIdx, inputValue) {
    const attrs = this._getEntityAttributesObject(rIdx, cIdx);
    const val = String(inputValue || '');
    // If nothing typed -> top-level keys
    if (val === '') return Object.keys(attrs).sort();

    // Split into path and last segment
    const norm = val.replace(/\[(\d+)\]/g, '.$1');
    const parts = norm.split('.');
    const endsWithDot = norm.endsWith('.');
    const head = endsWithDot ? parts.slice(0, -1) : parts.slice(0, -1);
    const last = endsWithDot ? '' : parts[parts.length - 1];
    const basePath = parts.length > 1 ? parts.slice(0, -1).join('.') : '';

    let node = attrs;
    if (parts.length > 1) {
      node = this._resolvePath(attrs, parts.slice(0, -1).join('.'));
      if (node === undefined) return []; // unknown base
    }

    // When endsWithDot -> show *all* children of base
    // Else -> filter children by prefix 'last'
    const children = this._listKeys(node).sort();
    const filtered = last ? children.filter(k => k.startsWith(last)) : children;

    return filtered.map(k => (basePath ? basePath + '.' : '') + k);
  }
  _buildAttrSuggestionsForEntity(entityId, inputValue) {
    const attrs = (this.hass?.states?.[entityId]?.attributes) || {};
    const val = String(inputValue || '');
    if (val === '') return Object.keys(attrs).sort();
    const norm = val.replace(/\[(\d+)\]/g, '.$1');
    const parts = norm.split('.');
    const endsWithDot = norm.endsWith('.');
    const last = endsWithDot ? '' : parts[parts.length - 1];
    const basePath = parts.length > 1 ? parts.slice(0, -1).join('.') : '';
    let node = attrs;
    if (parts.length > 1) {
      node = this._resolvePath(attrs, parts.slice(0, -1).join('.'));
      if (node === undefined) return [];
    }
    const children = this._listKeys(node).sort();
    const filtered = last ? children.filter(k => k.startsWith(last)) : children;
    return filtered.map(k => (basePath ? basePath + '.' : '') + k);
  }

  

  async _ensureEntityPickerLoaded() {
    try {
      if (!customElements.get("ha-entity-picker")) {
        const helpers = await (window.loadCardHelpers ? window.loadCardHelpers() : undefined);
        if (helpers) {
          const ent = await helpers.createCardElement({ type: "entities", entities: [] });
          if (ent?.constructor?.getConfigElement) await ent.constructor.getConfigElement();
        }
      }
    } catch (_e) {}
  }

  _clone(x){ return JSON.parse(JSON.stringify(x)); }

  setConfig(config) {
    const columnCount =
      Number.isInteger(config.column_count) && config.column_count > 0
        ? config.column_count
        : (config.rows?.[0]?.cells?.length || 1);

    const defaultPad = { top: 4, right: 0, bottom: 4, left: 0 };
    const cell_padding = { ...defaultPad, ...(config.cell_padding || {}) };
    const normalizedRows = (config.rows || []).map((r) => this._ensureCells(r, columnCount));

    if (!Array.isArray(this._fullCells) || this._fullCells.length === 0) {
      this._fullCells = normalizedRows.map(r => r.cells.map(c => this._clone(c)));
    } else {
      const newLen = normalizedRows.length;
      const oldLen = this._fullCells.length;
      if (newLen > oldLen) {
        for (let i = oldLen; i < newLen; i++) this._fullCells.push((normalizedRows[i]?.cells || []).map(c => this._clone(c)));
      } else if (newLen < oldLen) {
        this._fullCells.length = newLen;
      }
      for (let i = 0; i < newLen; i++) {
        const incoming = normalizedRows[i]?.cells || [];
        const full = Array.isArray(this._fullCells[i]) ? this._fullCells[i] : [];
        const maxCols = Math.max(full.length, incoming.length);
        const merged = new Array(maxCols);
        for (let c = 0; c < maxCols; c++) merged[c] = full[c] || (incoming[c] && this._clone(incoming[c])) || undefined;
        this._fullCells[i] = merged;
      }
    }

    const newTabs = {};
    normalizedRows.forEach((_, i) => newTabs[i] = Math.min(this._activeTabs[i] || 0, columnCount - 1));

    let collapsed = this._collapsed;
    if (!Array.isArray(collapsed) || collapsed.length !== normalizedRows.length) {
      collapsed = Array.from({ length: normalizedRows.length }, () => true);
    }

    this.config = { ...this.config, ...config, column_count: columnCount, rows: normalizedRows, cell_padding };
    this._activeTabs = newTabs;
    this._collapsed = collapsed;
  }

  getConfig() { return this.config; }
  _fireConfigChanged() { this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true })); }

  _ensureCells(row, count) {
    const cells = Array.isArray(row?.cells) ? [...row.cells] : [];
    for (let i = cells.length; i < count; i++) cells.push({ type: 'string', value: '', align: 'right' });
    if (cells.length > count) cells.length = count;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i] || {};
      if (!c.align) c.align = 'right';
      if (c.type === 'entity' && c.use_entity_unit === undefined) c.use_entity_unit = true;
      cells[i] = c;
    }
    return { ...row, cells };
  }

  _upd(k,v){ this.config = { ...this.config, [k]: v }; this._fireConfigChanged(); }
  _toggle(k,e){ this._upd(k, !!e.target.checked); }
  _parseCsvList(s){ return s.split(',').map(x=>x.trim()).filter(Boolean); }
  _parseCsvIntList(s){ return s.split(',').map(x=>parseInt(x.trim())).filter(n=>Number.isInteger(n)&&n>0); }

  _inputNumberAllowEmpty(k, e) {
    const raw = (e.target.value ?? '').trim();
    if (raw === '') { this._upd(k, ''); return; }
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) this._upd(k, n);
  }

  _updateTextSize(e){ const v=(e.target.value||'').trim(); this._upd('text_size', v||''); }
  _updateCardPadding(e){ this._inputNumberAllowEmpty('card_padding', e); }

  _updateColumnCount(e){
    let value=parseInt(e.target.value,10);
    if(!Number.isInteger(value) || value<1) return;
    const ensured = (this.config.rows||[]).map(r => this._ensureCells(r, value));
    const restored = ensured.map((r, i) => {
      const full = this._fullCells?.[i] || [];
      const cells = r.cells.slice(0, value);
      for (let c = 0; c < value; c++) if (full[c]) cells[c] = this._clone(full[c]);
      return { ...r, cells };
    });
    const tabs = {}; restored.forEach((_, i) => tabs[i] = Math.min(this._activeTabs[i] || 0, value - 1));
    this.config={...this.config, column_count:value, rows: restored};
    this._activeTabs=tabs;
    this._fireConfigChanged();
  }

  _updateCellPadding(side,e){
    const raw=(e.target.value??'').trim();
    const cp={...(this.config.cell_padding||{})};
    if (raw==='') { cp[side] = (side==='top'||side==='bottom') ? 4 : 0; }
    else {
      const n=parseInt(raw,10);
      if (Number.isFinite(n)) cp[side]=n;
    }
    this._upd('cell_padding',cp);
  }

  _updateBreakpoint(e){ this._inputNumberAllowEmpty('narrow_breakpoint', e); }

  /* ==== DnD kolumn (jak wcześniej) ==== */
  __mapIndexAfterMove(oldIndex, from, to){
    if (from === to) return oldIndex;
    if (to > from) {
      if (oldIndex === from) return to;
      if (oldIndex > from && oldIndex <= to) return oldIndex - 1;
      return oldIndex;
    } else {
      if (oldIndex === from) return to;
      if (oldIndex >= to && oldIndex < from) return oldIndex + 1;
      return oldIndex;
    }
  }
  __reorderColumn(from, to){
    const count = this.config.column_count || 1;
    if (from === null || to === null || from < 0 || to < 0 || from >= count || to >= count || from === to) return;
    const rows = (this.config.rows || []).map(r=>{
      const cells=[...(r.cells||[])];
      const [m]=cells.splice(from,1);
      cells.splice(to,0,m);
      return { ...r, cells };
    });
    if (Array.isArray(this._fullCells) && this._fullCells.length === rows.length) {
      this._fullCells = this._fullCells.map(arr => {
        const a=[...arr]; const [m]=a.splice(from,1); a.splice(to,0,m); return a;
      });
    }
    let widths = this.config.column_widths;
    if (Array.isArray(widths) && widths.length){ widths=[...widths]; const [w]=widths.splice(from,1); widths.splice(to,0,w); }
    let hide = this.config.hide_on_narrow;
    if (Array.isArray(hide) && hide.length){
      hide = hide.map(v => this.__mapIndexAfterMove(v-1, from, to) + 1).filter((v,i,self)=> self.indexOf(v)===i).sort((a,b)=>a-b);
    }
    const tabs = {}; rows.forEach((_, ri) => { const cur=this._activeTabs[ri]||0; tabs[ri] = this.__mapIndexAfterMove(cur, from, to); });
    this.config = { ...this.config, rows, column_widths: widths, hide_on_narrow: hide };
    this._activeTabs = tabs;
    this._fireConfigChanged();
  }
  _moveColumn(i, d){ this.__reorderColumn(i, i+d); }
  _deleteColumn(idx){
    const count=this.config.column_count||1; if(count<=1) return;
    const newCount=count-1;
    const rows=(this.config.rows||[]).map(r=>{
      const cells=[...r.cells]; cells.splice(idx,1);
      while(cells.length<newCount) cells.push({ type:'string', value:'', align:'right' });
      return { ...r, cells };
    });
    if (Array.isArray(this._fullCells) && this._fullCells.length === rows.length)
      this._fullCells = this._fullCells.map(a=>{ const b=[...a]; b.splice(idx,1); return b; });
    let widths=this.config.column_widths; if(Array.isArray(widths)&&widths.length){ widths=[...widths]; widths.splice(idx,1); }
    let hide=this.config.hide_on_narrow;
    if(Array.isArray(hide)&&hide.length){
      hide=hide.filter(v=>v!==idx+1).map(v=> v>idx+1 ? v-1 : v).filter((v,i,self)=> self.indexOf(v)===i).sort((a,b)=>a-b);
    }
    const tabs={}; rows.forEach((_,ri)=>{ const cur=this._activeTabs[ri]||0; tabs[ri]=Math.min(cur, newCount-1); });
    this.config={...this.config, rows, column_count:newCount, column_widths: widths, hide_on_narrow: hide};
    this._activeTabs=tabs; this._fireConfigChanged();
  }
  _onColDragStart(i, e){ this._colDragFrom = i; this._colDragOver = i; this._colDragActive = true; try { e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', String(i)); } catch {} this.requestUpdate(); }
  _onColDragOver(i, e){ e.preventDefault(); this._colDragOver = i; this.requestUpdate(); this._autoScrollColstrip(e.clientX); }
  _onColDragLeave(i,_e){ if(this._colDragOver===i){ this._colDragOver=null; this.requestUpdate(); } }
  _onColDrop(i,e){ e.preventDefault(); this.__reorderColumn(this._colDragFrom, i); this._colDragFrom=null; this._colDragActive=false; this._colDragOver=null; }
  _onColDragEnd(){ this._colDragFrom=null; this._colDragActive=false; this._colDragOver=null; }
  _onColPointerDown(i,e){
    if (e.pointerType!=='touch' && e.pointerType!=='pen') return;
    e.preventDefault(); e.stopPropagation();
    this._colDragFrom=i; this._colDragOver=i; this._colDragActive=true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    window.addEventListener('pointermove', this._boundPointerMove, { passive: false });
    window.addEventListener('pointerup', this._boundPointerUp, { passive: false });
    this.requestUpdate();
  }
  _onColPointerMove(e){
    if(!this._colDragActive) return;
    e.preventDefault();
    const chips = Array.from(this.renderRoot.querySelectorAll('.colstrip .colchip'));
    const x=e.clientX,y=e.clientY; let over=null;
    for(let idx=0; idx<chips.length; idx++){
      const r=chips[idx].getBoundingClientRect();
      if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){ over=idx; break; }
    }
    this._colDragOver=over; this.requestUpdate(); this._autoScrollColstrip(e.clientX);
  }
  _onColPointerUp(e){
    if (this._colDragActive && this._colDragFrom!==null && this._colDragOver!==null)
      this.__reorderColumn(this._colDragFrom, this._colDragOver);
    try { e.currentTarget?.releasePointerCapture?.(e.pointerId); } catch {}
    this._colDragFrom=null; this._colDragActive=false; this._colDragOver=null;
    window.removeEventListener('pointermove', this._boundPointerMove);
    window.removeEventListener('pointerup', this._boundPointerUp);
  }
  _autoScrollColstrip(clientX){
    const strip=this.renderRoot.querySelector('.colstrip'); if(!strip) return;
    const r=strip.getBoundingClientRect(); const t=24;
    if (clientX < r.left + t) strip.scrollLeft -= 16; else if (clientX > r.right - t) strip.scrollLeft += 16;
  }

  /* ==== Wiersze – DnD bez autoscrolla ==== */
  __reorderRows(from,to){
    if(from===null||to===null||from===to) return;
    const rows=[...(this.config.rows||[])];
    const collapsed=Array.from(this._collapsed||[]);
    const tabsArr=rows.map((_,ix)=>this._activeTabs[ix]||0);
    const move=(arr,a,b)=>{ const x=arr.splice(a,1)[0]; arr.splice(b,0,x); };
    move(rows,from,to); move(collapsed,from,to); move(tabsArr,from,to);
    if (Array.isArray(this._fullCells) && this._fullCells.length) {
      const move2=(arr,a,b)=>{ const x=arr.splice(a,1)[0]; arr.splice(b,0,x); };
      move2(this._fullCells, from, to);
    }
    const newTabs={}; rows.forEach((_,ix)=>newTabs[ix]=Math.min(tabsArr[ix],(this.config.column_count||1)-1));
    this.config={...this.config, rows}; this._collapsed=collapsed; this._activeTabs=newTabs; this._fireConfigChanged();
  }
  _onDragStart(i,e){ this._dragIndex=i; this._dragOverIndex=i; e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain', String(i)); }catch{} this.requestUpdate(); }
  _onDragOver(i,e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; this._dragOverIndex=i; this.requestUpdate(); }
  _onDragLeave(i,_e){ if(this._dragOverIndex===i){ this._dragOverIndex=null; this.requestUpdate(); } }
  _onDrop(i,e){ e.preventDefault(); this.__reorderRows(this._dragIndex, i); this._dragIndex=null; this._dragOverIndex=null; this.requestUpdate(); }
  _onDragEnd(){ this._dragIndex=null; this._dragOverIndex=null; this.requestUpdate(); }
  _onRowPointerDown(i,e){
    if (e.pointerType!=='touch' && e.pointerType!=='pen') return;
    e.preventDefault(); e.stopPropagation();
    this._rowDragFrom=i; this._rowDragActive=true; this._dragOverIndex=i;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    window.addEventListener('pointermove', this._boundRowPointerMove, { passive: false });
    window.addEventListener('pointerup', this._boundRowPointerUp, { passive: false });
    this.requestUpdate();
  }
  _onRowPointerMove(e){
    if(!this._rowDragActive) return;
    e.preventDefault();
    const boxes = Array.from(this.renderRoot.querySelectorAll('.rowbox'));
    const x=e.clientX,y=e.clientY; let over=null;
    for(let idx=0; idx<boxes.length; idx++){
      const r=boxes[idx].getBoundingClientRect();
      if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){ over=idx; break; }
    }
    this._dragOverIndex=over; this.requestUpdate();
  }
  _onRowPointerUp(e){
    if(this._rowDragActive && this._rowDragFrom!==null && this._dragOverIndex!==null)
      this.__reorderRows(this._rowDragFrom, this._dragOverIndex);
    try { e.currentTarget?.releasePointerCapture?.(e.pointerId); } catch {}
    this._rowDragFrom=null; this._rowDragActive=false; this._dragOverIndex=null;
    window.removeEventListener('pointermove', this._boundRowPointerMove);
    window.removeEventListener('pointerup', this._boundRowPointerUp);
    this.requestUpdate();
  }

  /* ====== patchowanie komórek + bufor ====== */
  _patchCell(r,c,patch){
    const rows=[...this.config.rows]; const row={...rows[r]}; const cells=[...row.cells];
    const current={...(cells[c]||{})}; const next={...current, ...patch};
    cells[c]=next; rows[r]={...row,cells}; this.config={...this.config, rows}; this._fireConfigChanged();
    if (Array.isArray(this._fullCells) && this._fullCells[r]) {
      const full=[...this._fullCells[r]]; if (c>=full.length) { for(let i=full.length;i<=c;i++) full[i]={type:'string',value:'',align:'right'}; }
      full[c]=this._clone(next); this._fullCells[r]=full;
    }
  }
  _patchCellStyle(r,c,stylePatch){
    const rows=[...this.config.rows]; const row={...rows[r]}; const cells=[...row.cells];
    const current={...(cells[c]||{})}; const style={...(current.style||{}), ...stylePatch};
    const next={...current, style}; cells[c]=next; rows[r]={...row,cells}; this.config={...this.config, rows}; this._fireConfigChanged();
    if (Array.isArray(this._fullCells) && this._fullCells[r]) {
      const full=[...this._fullCells[r]]; if (c>=full.length) { for(let i=full.length;i<=c;i++) full[i]={type:'string',value:'',align:'right'}; }
      full[c]=this._clone(next); this._fullCells[r]=full;
    }
  }

  _cellTypeChanged(r,c,e){
    const type=e.target.value; const patch={ type };
    if (type==='icon' && !this.config.rows?.[r]?.cells?.[c]?.value) patch.value='mdi:information-outline';
    if (type!=='entity') {
      patch.use_entity_unit=undefined; patch.unit=undefined; patch.precision=undefined; patch.entity_display=undefined;
    } else {
      if (this.config.rows?.[r]?.cells?.[c]?.use_entity_unit===undefined) patch.use_entity_unit=true;
    }
    this._patchCell(r,c,patch);
  }

  _cellValueChanged(r,c,e){ this._patchCell(r,c,{ value:e.target.value }); }
  _cellAlignChanged(r,c,e){ this._patchCell(r,c,{ align:e.target.value }); }
  _cellUseEntityUnitChanged(r,c,e){
    const checked = !!e.target.checked;
    const patch = { use_entity_unit: checked };
    if (checked) {
      const cell = this.config?.rows?.[r]?.cells?.[c];
      if (cell?.attribute) patch.unit = undefined;
    }
    this._patchCell(r,c,patch);
  }
  _cellUnitChanged(r,c,e){ this._patchCell(r,c,{ unit:e.target.value }); }
  _cellAttributeChanged(r,c,e){
    const raw = (e && e.target && typeof e.target.value === 'string') ? e.target.value : '';
    const v = raw.trim();
    this._patchCell(r,c,{ attribute: v ? v : undefined });
  }
  _cellEntityDisplayChanged(r,c,e){
    const raw = e?.target?.value;
    const value = (typeof raw === 'string' && raw.trim()) ? raw.trim() : 'value';
    const entityDisplay = value === 'value' ? undefined : value;
    this._patchCell(r,c,{ entity_display: entityDisplay });
  }
  _cellPrecisionChanged(r,c,e){ const v=e.target.value; const precision=v===''?undefined:parseInt(v); this._patchCell(r,c,{ precision }); }
  _cellScaleChanged(r,c,key,e){
    const raw = (e.target.value ?? '').trim();
    const val = raw === '' ? undefined : Number(String(raw).replace(',', '.'));
    if (val === undefined || Number.isFinite(val)) {
      this._patchCell(r, c, { [key]: val });
    }
  }
  _isEntityNumeric(cell){
    const id = cell?.value;
    if (!id || !this.hass?.states?.[id]) return false;
    const st = this.hass.states[id];
    // if attribute path provided, resolve it on attributes supporting dot/bracket notation
    let raw;
    if (cell?.attribute) {
      const path = String(cell.attribute);
      const norm = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
      let cur = st.attributes;
      for (const kRaw of norm) {
        if (cur == null) break;
        const k = Array.isArray(cur) && /^\d+$/.test(kRaw) ? Number(kRaw) : kRaw;
        cur = cur?.[k];
      }
      raw = cur;
    } else {
      raw = st.state;
    }
    const num = Number(raw);
    return Number.isFinite(num);
  }
  _styleToggle(r,c,key,e){ this._patchCellStyle(r,c,{ [key]: !!e.target.checked }); }
  _styleValue(r,c,key,e){ this._patchCellStyle(r,c,{ [key]: e.target.value }); }

  _ruleTitle(idx) {
    const lang = (this.hass?.locale?.language || 'en').toLowerCase();
    const isPl = lang.startsWith('pl');
    return isPl ? `Reguła ${idx + 1}` : `Rule ${idx + 1}`;
  }

  // === Dynamic coloring: simple rules ===
  _getCellRules(r,c){
    try { return Array.isArray(this.config?.rows?.[r]?.cells?.[c]?.dyn_color) ? [...this.config.rows[r].cells[c].dyn_color] : []; }
    catch(_) { return []; }
  }
  _setCellRules(r,c,rules){
    const rows = [...(this.config.rows||[])];
    const row = { ...rows[r] };
    const cells = [...(row.cells||[])];
    const cell = { ...cells[c], dyn_color: rules };
    cells[c] = cell; rows[r] = { ...row, cells };
    this.config = { ...this.config, rows };
    this._fireConfigChanged();
  }
  _addRule(r,c){
    const rules = this._getCellRules(r,c);
    rules.push({ entity:'', attr:'', op:'=', val:'', bg:'', fg:'', overwrite:'' });
    this._setCellRules(r,c,rules);
  }
  _removeRule(r,c,idx){
    const rules = this._getCellRules(r,c);
    rules.splice(idx,1);
    this._setCellRules(r,c,rules);
  }
  _updateRule(r,c,idx,patch){
    const rules = this._getCellRules(r,c);
    rules[idx] = { ...(rules[idx]||{}), ...(patch||{}) };
    this._setCellRules(r,c,rules);
  }


  _setActiveTab(rowIdx,tab){ this._activeTabs={...this._activeTabs,[rowIdx]:tab}; this.requestUpdate(); }
  _copyActiveCell(rowIdx){
    const colCount=this.config.column_count||1; const active=Math.min(this._activeTabs[rowIdx]||0,colCount-1);
    const cell=this.config.rows?.[rowIdx]?.cells?.[active]; if(!cell) return;
    this._clipboardCell=this._clone(cell); this.requestUpdate();
  }
  _pasteToActiveCell(rowIdx){
    if(!this._clipboardCell) return;
    const colCount=this.config.column_count||1; const active=Math.min(this._activeTabs[rowIdx]||0,colCount-1);
    const clone=this._clone(this._clipboardCell);
    const rows=[...this.config.rows]; const row={...rows[rowIdx]}; const cells=[...row.cells]; cells[active]=clone; rows[rowIdx]={...row,cells};
    this.config={...this.config, rows}; this._fireConfigChanged();
    if (Array.isArray(this._fullCells) && this._fullCells[rowIdx]) {
      const full=[...this._fullCells[rowIdx]]; if (active>=full.length) { for(let i=full.length;i<=active;i++) full[i]={type:'string',value:'',align:'right'}; }
      full[active]=this._clone(clone); this._fullCells[rowIdx]=full;
    }
  }

  _toggleCollapse(i){ const a=Array.from(this._collapsed||[]); a[i]=!a[i]; this._collapsed=a; this.requestUpdate(); }
  _moveRow(i,dir){ const target=i+dir; if(target<0 || target>=(this.config.rows||[]).length) return; this.__reorderRows(i,target); }

  /* podgląd wiersza – wersja "po kolei" */
  _rowPreview(row) {
    const cells = Array.isArray(row?.cells) ? row.cells : [];
    const out = [];
    let textCount = 0; // liczymy tylko elementy tekstowe (string/entity), żeby wstawić " • " pomiędzy nimi

    for (const c of cells) {
      if (!c || !c.value) continue;

      if (c.type === 'icon') {
        out.push(html`<ha-icon
          .icon=${c.value}
          style="--mdc-icon-size:18px; margin-right:6px;"
        ></ha-icon>`);
        continue;
      }

      if (c.type === 'string') {
        const v = String(c.value);
        if (!v) continue;
        if (textCount > 0) out.push(html`<span> • </span>`);
        out.push(html`<span>${v}</span>`);
        textCount++;
        continue;
      }

      if (c.type === 'entity') {
        const st = this.hass?.states?.[c.value];
        const name = st?.attributes?.friendly_name || c.value;
        if (!name) continue;
        if (textCount > 0) out.push(html`<span> • </span>`);
        out.push(html`<span>${name}</span>`);
        textCount++;
        continue;
      }
    }

    return out.length ? html`${out}` : html`—`;
  }

  firstUpdated() { this._ensureEntityPickerLoaded(); }
  _onEntityPicked(rIdx, cIdx, e) {
    const value = e?.detail?.value ?? e?.target?.value ?? '';
    this._patchCell(rIdx, cIdx, { type: 'entity', value });
  }
  _onTypeSelect(rIdx, cIdx, e) { this._cellTypeChanged(rIdx, cIdx, { target: { value: e.target.value } }); }

  // === Actions (Tap/Hold/Double) ===

  // Dozwolone akcje dla danego typu komórki (dla icon/string usuwamy 'more-info' i 'toggle')
  _allowedUiActionsForCellType(cellType) {
    if (cellType === 'icon' || cellType === 'string') {
      return ['navigate', 'url', 'assist', 'perform-action', 'none'];
    }
    // entity — pełna lista domyślna (nie narzucamy)
    return undefined;
  }

  _onActionsChanged(rIdx, cIdx, ev) {
    const v = ev.detail?.value || {};
    const cellType = this.config?.rows?.[rIdx]?.cells?.[cIdx]?.type;
    const isIconOrString = cellType === 'icon' || cellType === 'string';

    const clean = (obj) => {
      if (!obj || !obj.action || obj.action === 'none') return undefined;
      const out = JSON.parse(JSON.stringify(obj));

      // SANETYZACJA: dla icon/string blokujemy 'more-info' i 'toggle'
      if (isIconOrString && (out.action === 'more-info' || out.action === 'toggle')) {
        return { action: 'none' };
      }

      if (!out.service) delete out.service;
      if (!out.data && !out.service_data) { delete out.data; delete out.service_data; }
      if (out.target && !Object.keys(out.target).length) delete out.target;
      if (!out.entity) delete out.entity;
      return out;
    };

    this._patchCell(rIdx, cIdx, {
      tap_action: clean(v.tap_action),
      hold_action: clean(v.hold_action),
      double_tap_action: clean(v.double_tap_action),
    });
  }

  _computeActionLabel = (schema) => {
    switch (schema.name) {
      case 'tap_action': return t(this.hass, 'editor.tap_action');
      case 'hold_action': return t(this.hass, 'editor.hold_action');
      case 'double_tap_action': return t(this.hass, 'editor.double_tap_action');
      default: return '';
    }
  };

  _onPaletteClick(ev, rIdx, cIdx, prop = "color") {
    const style = this.config?.rows?.[rIdx]?.cells?.[cIdx]?.style || {};
    const current = style?.[prop] || "#ffffff";

    const toHex = (v) => {
      const s = String(v || "").trim();
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) {
        return s.length === 4 ? "#" + s.slice(1).split("").map(c => c + c).join("") : s;
      }
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      return m ? "#" + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2,"0")).join("") : "#ffffff";
    };

    // Pozycja: kursor lub rect klikniętego elementu
    const tgt  = ev?.currentTarget || ev?.target;
    const rect = tgt?.getBoundingClientRect?.();
    let x = (typeof ev?.clientX === "number") ? ev.clientX : (rect ? rect.right - 8 : 24);
    let y = (typeof ev?.clientY === "number") ? ev.clientY : (rect ? rect.bottom + 8 : 24);

    // Kotwiczenie w ha-dialog (jeśli jest)
    const dialog = this.closest?.("ha-dialog");
    let container = document.body;
    let position = "fixed";
    if (dialog?.shadowRoot) {
      const surface =
        dialog.shadowRoot.querySelector(".mdc-dialog__surface") ||
        dialog.shadowRoot.querySelector(".mdc-dialog") ||
        dialog.shadowRoot.querySelector(".mdc-dialog__container");
      if (surface) {
        const srect = surface.getBoundingClientRect();
        x -= srect.left; y -= srect.top;
        container = surface; position = "absolute";
      }
    }

    const input = document.createElement("input");
    input.type = "color";
    input.value = toHex(current);
    input.tabIndex = -1;

    Object.assign(input.style, {
      position,
      left: `${Math.round(x)}px`,
      top: `${Math.round(y)}px`,
      transform: "translate(-10px, -10px)",
      width: "18px",
      height: "18px",
      opacity: "0.001",         // nie 0!
      pointerEvents: "auto",     // pozwól pułapce focusu zaakceptować element
      border: "0",
      padding: "0",
      margin: "0",
      zIndex: "2147483647",
    });

    // (opcjonalnie) live preview
    const scope = dialog || document;
    const previewCard = scope.querySelector?.("flex-cells-card") || null;
    const varName = `--fcc-cell-r${rIdx}-c${cIdx}-${prop}`;

    let raf = 0, lastHex = null;
    const pushThrottled = (hex) => {
      lastHex = hex;
      if (!raf) {
        raf = requestAnimationFrame(() => { raf = 0; this._patchCellStyle(rIdx, cIdx, { [prop]: lastHex }); });
      }
    };
    const setLive = (hex) => { if (previewCard) previewCard.style.setProperty(varName, hex); else pushThrottled(hex); };

    // --- Sprzątanie: bez "blur" / bez "window.focus" ---
    let cleaned = false, armed = false;
    const cleanup = () => {
      if (cleaned) return; cleaned = true;
      input.removeEventListener("input", onInput);
      input.removeEventListener("change", onChange);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onOutsidePointer, true);
      if (previewCard) previewCard.style.removeProperty(varName);
      input.remove();
    };

    const onInput = (e) => setLive(e.target.value);                // podgląd
    const onChange = (e) => { this._patchCellStyle(rIdx, cIdx, { [prop]: e.target.value }); cleanup(); };
    const onKeyDown = (e) => { if (e.key === "Escape") cleanup(); };
    const onOutsidePointer = (e) => { if (!armed) return; if (e.target !== input) cleanup(); };

    input.addEventListener("input", onInput);
    input.addEventListener("change", onChange);
    window.addEventListener("keydown", onKeyDown, true);
    // uzbrój „klik poza” dopiero po chwili, żeby nie wyłapać kliknięcia, które otworzyło picker
    setTimeout(() => { armed = true; window.addEventListener("pointerdown", onOutsidePointer, true); }, 250);

    container.appendChild(input);
    void input.offsetWidth;                     // wymuś layout
    try { input.focus({ preventScroll: true }); } catch {}

    // otwórz picker po klatce
    requestAnimationFrame(() => {
      try { (typeof input.showPicker === "function" ? input.showPicker() : input.click()); }
      catch { input.click(); }
    });

    // awaryjne sprzątanie po 60s (gdyby user anulował gestami systemowymi itd.)
    setTimeout(() => cleanup(), 60000);
  }

  // Picker dla reguł dynamicznego kolorowania (bg/fg) – płynny i zakotwiczony przy przycisku
  _onRuleColorPicker(ev, rIdx, cIdx, ruleIdx, key /* 'bg' | 'fg' */) {
    ev.stopPropagation();

    const rules = this._getCellRules?.(rIdx, cIdx) || (this.config?.rows?.[rIdx]?.cells?.[cIdx]?.dyn_color) || [];
    const current = rules?.[ruleIdx]?.[key] || '#ff0000';

    // Pozycjonowanie przy przycisku + wsparcie dla ha-dialog
    const btn  = ev.currentTarget || ev.target;
    const rect = btn?.getBoundingClientRect?.();
    let x = rect ? rect.right - 8 : 24;
    let y = rect ? rect.bottom + 8 : 24;

    let container = document.body;
    let position  = 'fixed';
    const dialog  = this.closest?.('ha-dialog');
    if (dialog?.shadowRoot) {
      const surface = dialog.shadowRoot.querySelector('.mdc-dialog__surface') || dialog;
      if (surface) {
        const srect = surface.getBoundingClientRect();
        x -= srect.left; y -= srect.top;
        container = surface; position = 'absolute';
      }
    }

    const input = document.createElement('input');
    input.type = 'color';
    input.value = current;
    Object.assign(input.style, {
      position,
      left: `${Math.round(x)}px`,
      top: `${Math.round(y)}px`,
      transform: 'translate(-10px,-10px)',
      width: '18px',
      height: '18px',
      opacity: '0.001',       // nie 0 – musi łapać focus
      pointerEvents: 'auto',
      border: '0', padding: '0', margin: '0',
      zIndex: '2147483647',
    });

    // Podgląd w polu obok (bez pełnego re-renderu)
    const textfield = btn.parentElement?.querySelector('ha-textfield') || null;

    let pending = null;
    let tid = 0;
    const commit = () => {
      tid = 0;
      if (pending != null) this._updateRule(rIdx, cIdx, ruleIdx, { [key]: pending });
    };

    const onInput  = (e) => {
      pending = e.target.value;
      if (textfield) { textfield.value = pending; textfield.requestUpdate?.(); }
      if (!tid) tid = setTimeout(commit, 50);      // throttle
    };
    const onChange = (e) => { pending = e.target.value; clearTimeout(tid); commit(); cleanup(); };
    const onKey    = (e) => { if (e.key === 'Escape') cleanup(); };

    const cleanup = () => {
      input.removeEventListener('input', onInput);
      input.removeEventListener('change', onChange);
      window.removeEventListener('keydown', onKey, true);
      input.remove();
    };

    input.addEventListener('input', onInput);
    input.addEventListener('change', onChange);
    window.addEventListener('keydown', onKey, true);

    container.appendChild(input);
    void input.offsetWidth;
    try { input.showPicker?.(); } catch { input.click(); }
    setTimeout(cleanup, 60000);
  }

  render(){
    if(!this.config || !Array.isArray(this.config.rows)) return html`<div>—</div>`;
    const colCount=this.config.column_count||1;
    const widthsStr=Array.isArray(this.config.column_widths)?this.config.column_widths.join(', '):'';
    const hideStr=Array.isArray(this.config.hide_on_narrow)?this.config.hide_on_narrow.join(','):'';
    const sortStr=Array.isArray(this.config.sort_columns)?this.config.sort_columns.join(','):'';
    const cp=this.config.cell_padding||{top:4,right:0,bottom:4,left:0};

    const dclone = (o)=> (o ? JSON.parse(JSON.stringify(o)) : undefined);

    return html`
      <div class="row">
        <h3>${t(this.hass,"editor.card_title")}</h3>

        <div class="cols3">
          <ha-textfield label=${t(this.hass,"editor.columns_count")} type="number" min="1" .value=${colCount}
            @input=${(e)=>this._updateColumnCount(e)}></ha-textfield>

          <ha-textfield label=${t(this.hass,"editor.text_size_global")}
            .value=${this.config.text_size || ''} placeholder="14px | 1.1rem | 120%"
            @input=${(e)=>this._updateTextSize(e)}></ha-textfield>

          <ha-textfield label=${t(this.hass,"editor.card_padding")} type="number"
            .value=${this.config.card_padding ?? ''} placeholder="16"
            @input=${(e)=>this._updateCardPadding(e)}></ha-textfield>
        </div>

        <div class="cols4">
          <ha-textfield label=${t(this.hass,"editor.cell_padding_top")} type="number" .value=${cp.top ?? 4}
            @input=${(e)=>this._updateCellPadding('top',e)}></ha-textfield>
          <ha-textfield label=${t(this.hass,"editor.cell_padding_right")} type="number" .value=${cp.right ?? 0}
            @input=${(e)=>this._updateCellPadding('right',e)}></ha-textfield>
          <ha-textfield label=${t(this.hass,"editor.cell_padding_bottom")} type="number" .value=${cp.bottom ?? 4}
            @input=${(e)=>this._updateCellPadding('bottom',e)}></ha-textfield>
          <ha-textfield label=${t(this.hass,"editor.cell_padding_left")} type="number" .value=${cp.left ?? 0}
            @input=${(e)=>this._updateCellPadding('left',e)}></ha-textfield>
        </div>

        <ha-textfield
          label=${t(this.hass,"editor.widths_label")}
          .value=${widthsStr}
          @input=${(e)=> this._upd('column_widths', this._parseCsvList(e.target.value)) }>
        </ha-textfield>

        <div class="cols21">
          <ha-textfield
            label=${t(this.hass,"editor.hide_cols_label")}
            .value=${hideStr}
            @input=${(e)=> this._upd('hide_on_narrow', this._parseCsvIntList(e.target.value)) }>
          </ha-textfield>

          <ha-textfield
            label=${t(this.hass,"editor.breakpoint")} type="number"
            .value=${this.config.narrow_breakpoint ?? ''} placeholder="600"
            @input=${(e)=> this._updateBreakpoint(e)}>
          </ha-textfield>
        </div>


        <div class="cols21">
          <ha-textfield
            label=${t(this.hass,"editor.sort_cols_label")}
            .value=${sortStr}
            @input=${(e)=> this._upd('sort_columns', this._parseCsvIntList(e.target.value)) }>
          </ha-textfield>

          <label class="option full">
            <input type="checkbox" .checked=${!!this.config.sort_desc} @change=${(e)=>this._toggle('sort_desc',e)} />
            ${t(this.hass,"editor.sort_desc_label")}
          </label>
        </div>

        <div class="options">
          <label class="option"><input type="checkbox" .checked=${!!this.config.overflow_x} @change=${(e)=>this._toggle('overflow_x',e)} /> ${t(this.hass,"editor.overflow_x")}</label>
          <label class="option"><input type="checkbox" .checked=${!!this.config.header_from_first_row} @change=${(e)=>this._toggle('header_from_first_row',e)} /> ${t(this.hass,"editor.header_from_first")}</label>
          <label class="option"><input type="checkbox" .checked=${!!this.config.zebra} @change=${(e)=>this._toggle('zebra',e)} /> ${t(this.hass,"editor.zebra")}</label>
        </div>

        ${colCount>=2 ? html`
          <div class="colbar">
            <div class="colstrip">
              ${Array.from({length: colCount}, (_,i)=> html`
                <div class="colchip ${this._colDragOver===i?'is-over':''}"
                     @dragover=${(e)=>this._onColDragOver(i,e)}
                     @dragleave=${(e)=>this._onColDragLeave(i,e)}
                     @drop=${(e)=>this._onColDrop(i,e)}>
                  <div class="chiplabel">${t(this.hass,"editor.column")} ${i+1}</div>
                  <div class="chiptools">
                    <button title=${t(this.hass,"editor.move_left")} ?disabled=${i===0} @click=${()=>this._moveColumn(i,-1)}>◀</button>
                    <button title=${t(this.hass,"editor.move_right")} ?disabled=${i===colCount-1} @click=${()=>this._moveColumn(i, 1)}>▶</button>
                    <button class="danger" title=${t(this.hass,"editor.delete_column")} @click=${()=>this._deleteColumn(i)}>✖</button>
                  </div>
                  <div class="colhandle"
                       role="button"
                       aria-label=${t(this.hass,"editor.drag_to_reorder")}
                       title=${t(this.hass,"editor.drag_to_reorder")}
                       draggable=${!this._isTouchDevice}
                       @contextmenu=${(e)=>e.preventDefault()}
                       @dragstart=${(e)=>this._onColDragStart(i,e)}
                       @dragend=${(e)=>this._onColDragEnd(e)}
                       @pointerdown=${(e)=>this._onColPointerDown(i,e)}>
                    <div class="dots">${Array.from({length:10},()=>html`<span class="dot"></span>`)}</div>
                  </div>
                </div>
              `)}
            </div>
          </div>
        `: ''}
      </div>

      ${this.config.rows.map((row, rIdx) => {
        const colCountNow=this.config.column_count||1;
        const active = Math.min(this._activeTabs[rIdx] || 0, colCountNow - 1);
        const isHeaderRow = !!this.config.header_from_first_row && rIdx === 0;
        const rowTitle = `${t(this.hass, "editor.row")} ${rIdx + 1}${isHeaderRow ? t(this.hass,"editor.header_suffix") : ""}`;
        const collapsed = !!this._collapsed?.[rIdx];
        const rowClass = this._dragOverIndex === rIdx ? 'dragover' : '';

        return html`
          <div class="row">
            <div class="rowbox ${rowClass}"
                 @dragover=${(e)=>this._onDragOver(rIdx,e)}
                 @dragleave=${(e)=>this._onDragLeave(rIdx,e)}
                 @drop=${(e)=>this._onDrop(rIdx,e)}
                 @contextmenu=${(e)=>e.preventDefault()}>
              <div class="rowhdr">
                <button class="handle"
                        title=${t(this.hass,"editor.drag_to_reorder")}
                        draggable=${!this._isTouchDevice}
                        @contextmenu=${(e)=>e.preventDefault()}
                        @dragstart=${(e)=>this._onDragStart(rIdx,e)}
                        @dragend=${()=>this._onDragEnd()}
                        @pointerdown=${(e)=>this._onRowPointerDown(rIdx,e)}>
                  ⋮⋮
                </button>

                <button class="toggle" title=${t(this.hass,"editor.toggle")}
                        @click=${()=>this._toggleCollapse(rIdx)}
                        @keydown=${(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); this._toggleCollapse(rIdx);} }}>
                  ${collapsed ? '▶' : '▼'}
                </button>

                <div class="title">${rowTitle}</div>
                <div class="preview">${this._rowPreview(row)}</div>

                <div class="rowtools">
                  <button title=${t(this.hass,"editor.up")} ?disabled=${rIdx===0} @click=${()=>this._moveRow(rIdx,-1)}>▲</button>
                  <button title=${t(this.hass,"editor.down")} ?disabled=${rIdx===(this.config.rows?.length||0)-1} @click=${()=>this._moveRow(rIdx, 1)}>▼</button>
                  <button class="danger" title="${t(this.hass,"editor.delete_row")}" @click=${() => this._removeRow?.(rIdx)}>❌</button>
                </div>
              </div>

              ${collapsed ? '' : html`
                <div class="rowbody">
                  <div class="tabs">
                    ${Array.from({ length: colCountNow }, (_, i) => html`
                      <button class="tab ${i===active?'active':''}" @click=${() => this._setActiveTab(rIdx, i)}>
                        ${i===0 ? t(this.hass,"editor.tab_first") : String(i+1)}
                      </button>
                    `)}
                  </div>

                  <div class="flex" style="gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 10px;">
                    <button @click=${() => this._copyActiveCell(rIdx)}>${t(this.hass,"editor.copy")}</button>
                    <button ?disabled=${!this._clipboardCell} @click=${() => this._pasteToActiveCell(rIdx)}>${t(this.hass,"editor.paste")}</button>
                    <span class="muted">${this._clipboardCell ? `Clipboard: ${this._clipboardCell.type}` : t(this.hass,"editor.clipboard_empty")}</span>
                  </div>

                  ${(() => {
                    const cIdx = active;
                    const cell = row.cells?.[cIdx] ?? { type: 'string', value: '', align: 'right' };
                    const isEntity = cell.type === 'entity';
                    const isIcon = cell.type === 'icon';
                    const isNumeric = isEntity && this._isEntityNumeric(cell);
                    const st = cell.style || {};

                    // selektory akcji (dla icon/string z ograniczoną listą)
                    const allowed = this._allowedUiActionsForCellType(cell.type);
                    const mkSelector = () => allowed
                      ? { ui_action: { actions: allowed, allowed_actions: allowed } }
                      : { ui_action: {} };

                    return html`
                      <!-- TYP KOMÓRKI -->
                      <div class="cell-grid cell-wide">
                        <ha-select
                          .label=${t(this.hass,"editor.cell_type")}
                          .value=${cell.type || 'string'}
                          naturalMenuWidth
                          fixedMenuPosition
                          @selected=${(e)=>this._onTypeSelect(rIdx, cIdx, e)}
                          @closed=${(e)=>e.stopPropagation()}>
                          <mwc-list-item value="entity">${t(this.hass,"editor.entity_label")}</mwc-list-item>
                          <mwc-list-item value="string">${t(this.hass,"editor.string_label")}</mwc-list-item>
                          <mwc-list-item value="icon">${t(this.hass,"editor.icon_label")}</mwc-list-item>
                        </ha-select>
                      </div>

                      <!-- WARTOŚĆ -->
                      ${isEntity ? html`
                        <div class="cell-grid cell-wide">
                          ${customElements.get('ha-entity-picker') ? html`
                            <ha-entity-picker
                              .hass=${this.hass}
                              .value=${cell.value || ''}
                              allow-custom-entity
                              @value-changed=${(e)=>this._onEntityPicked(rIdx,cIdx,e)}>
                            </ha-entity-picker>
                          ` : html`
                            <input list="entities-list" .value=${cell.value || ''} placeholder=${t(this.hass,"placeholder.entity")}
                              @input=${(e) => this._cellValueChanged(rIdx, cIdx, e)} />
                          `}
                        </div>
                        <div class="cell-grid cell-wide">

                          ${ (String(cell.value||'').startsWith('input_datetime.')) ? html`
                            <div class="cell-wide">
                              <ha-textfield
                                .label=${t(this.hass,"editor.datetime_format")}
                                .value=${cell.datetime_format || ''}
                                .placeholder=${t(this.hass,"placeholder.datetime_format")}
                                @input=${(e)=> this._patchCell(rIdx,cIdx,{ datetime_format: (e.target.value||'') || undefined })}
                              ></ha-textfield>
                              <div class="muted">${t(this.hass,"editor.available_tokens")}</div>
                            </div>
                          ` : '' }

                          <input
                            class="text-input mini-wide"
                            list=${`attr-list-${rIdx}-${cIdx}`}
                            .value=${cell.attribute || ''}
                            placeholder=${t(this.hass,"placeholder.attribute_path")}
                            @input=${(e)=>{ this._cellAttributeChanged(rIdx,cIdx,e); }}
                          />
                          <datalist id=${`attr-list-${rIdx}-${cIdx}`}>
                            ${
                              (this._buildAttrSuggestions(rIdx, cIdx, (this.config?.rows?.[rIdx]?.cells?.[cIdx]?.attribute || '')) || [])
                                .map(opt => html`<option value="${opt}"></option>`)
                            }
                          </datalist>

                        </div>

                        <div class="cell-grid cell-wide">
                          <ha-select
                            .label=${t(this.hass,"editor.entity_display_label")}
                            .value=${cell.entity_display || "value"}
                            naturalMenuWidth
                            fixedMenuPosition
                            @selected=${(e)=>this._cellEntityDisplayChanged(rIdx,cIdx,e)}
                            @closed=${(e)=>e.stopPropagation()}>
                            <mwc-list-item value="value">${t(this.hass,"editor.entity_display_option_value")}</mwc-list-item>
                            <mwc-list-item value="icon">${t(this.hass,"editor.entity_display_option_icon")}</mwc-list-item>
                            <mwc-list-item value="icon_value">${t(this.hass,"editor.entity_display_option_icon_value")}</mwc-list-item>
                          </ha-select>
                        </div>
                          
                        <!-- KONTROLKA ZAMIAST WARTOŚCI -->
                        ${ this._isSimpleControlEntity(cell) ? html`
                          <div class="cell-grid cell-wide">
                            <label class="option full" @click=${(ev)=>{ if(ev.target.tagName!=='INPUT') ev.preventDefault(); }}>
                              <input type="checkbox"
                                     .checked=${!!cell.show_control}
                                     @change=${(e)=> this._cellShowControlChanged(rIdx, cIdx, e)} />
                              ${t(this.hass,"editor.show_control")}
                            </label>
                          </div>
                        ` : html`` }

                          <!-- PRZESKALOWANIE -->
                          <div class="option group scale full">
                            <span class="label" style="font-weight:600;">${t(this.hass,"editor.scale_title")}</span>
                            <ha-textfield class="mini"
                              type="number"
                              .label=${t(this.hass,"editor.scale_in_min")}
                              .value=${cell.scale_in_min ?? ''}
                              @input=${(e)=>this._cellScaleChanged(rIdx,cIdx,'scale_in_min',e)}>
                            </ha-textfield>
                            <ha-textfield class="mini"
                              type="number"
                              .label=${t(this.hass,"editor.scale_in_max")}
                              .value=${cell.scale_in_max ?? ''}
                              @input=${(e)=>this._cellScaleChanged(rIdx,cIdx,'scale_in_max',e)}>
                            </ha-textfield>
                            <ha-textfield class="mini"
                              type="number"
                              .label=${t(this.hass,"editor.scale_out_min")}
                              .value=${cell.scale_out_min ?? ''}
                              @input=${(e)=>this._cellScaleChanged(rIdx,cIdx,'scale_out_min',e)}>
                            </ha-textfield>
                            <ha-textfield class="mini"
                              type="number"
                              .label=${t(this.hass,"editor.scale_out_max")}
                              .value=${cell.scale_out_max ?? ''}
                              @input=${(e)=>this._cellScaleChanged(rIdx,cIdx,'scale_out_max',e)}>
                            </ha-textfield>
                            <div class="muted">${t(this.hass,"editor.scale_hint")}</div>
                          </div>
                      ` : isIcon ? html`
                        <div class="cell-grid cell-wide">
                          ${customElements.get('ha-icon-picker') ? html`
                            <ha-icon-picker
                              .hass=${this.hass}
                              .label=${t(this.hass,"editor.icon_label")}
                              .value=${cell.value || ''}
                              @value-changed=${(e)=> this._cellValueChanged(rIdx,cIdx,{target:{value: e.detail?.value || ''}})}>
                            </ha-icon-picker>
                          ` : html`
                            <ha-textfield
                              .label=${t(this.hass,"editor.icon_label")}
                              .value=${cell.value || ''}
                              .placeholder=${t(this.hass,"placeholder.icon")}
                              @input=${(e)=>this._cellValueChanged(rIdx,cIdx,e)}>
                            </ha-textfield>
                          `}
                        </div>
                      ` : html`
                        <div class="cell-grid cell-wide">
                          <ha-textfield
                            .label=${t(this.hass,"editor.string_label")}
                            .value=${cell.value || ''}
                            .placeholder=${t(this.hass,"placeholder.string")}
                            @input=${(e)=>this._cellValueChanged(rIdx,cIdx,e)}>
                          </ha-textfield>
                        </div>
                      `}

                      <!-- APPEARANCE SECTION -->
<details style="margin-top:12px;">
  <summary style="cursor:pointer;font-weight:600;">
    ${t(this.hass, 'editor.appearance')}
  </summary>
                      <!-- WYRÓWNANIE -->
                      <div class="cell-grid cell-wide" style="margin-top: 10px;">
                        <ha-select
                          .label=${t(this.hass, "editor.align")}
                          .value=${cell.align || 'right'}
                          @selected=${(e) => this._cellAlignChanged(rIdx, cIdx, {target:{value:e.target.value}})}
                          @closed=${(e)=>e.stopPropagation()}>
                          <mwc-list-item value="left">${t(this.hass,"align.left")}</mwc-list-item>
                          <mwc-list-item value="center">${t(this.hass,"align.center")}</mwc-list-item>
                          <mwc-list-item value="right">${t(this.hass,"align.right")}</mwc-list-item>
                        </ha-select>
                      </div>

                      <!-- TRANSFORMACJA -->
                      ${(cell.type === 'string' || cell.type === 'entity') ? html`
                        <div class="cell-grid cell-wide">
                          <ha-select
                            .label=${t(this.hass,"editor.text_transform")}
                            .value=${st.text_transform || ''}
                            @selected=${(e)=>this._styleValue(rIdx,cIdx,'text_transform',{target:{value:e.target.value}})}
                            @closed=${(e)=>e.stopPropagation()}>
                            <mwc-list-item value=""></mwc-list-item>
                            <mwc-list-item value="uppercase">uppercase</mwc-list-item>
                            <mwc-list-item value="lowercase">lowercase</mwc-list-item>
                            <mwc-list-item value="capitalize">capitalize</mwc-list-item>
                          </ha-select>
                        </div>
                      ` : ''}

                      ${isEntity ? html`
                        <!-- JEDNOSTKA Z ENCJI -->
                        <div class="cell-grid cell-wide">
                          <label class="option unit" @click=${(ev)=>{ if(ev.target.tagName!=='INPUT') ev.preventDefault(); }}>
                            <input type="checkbox"
                                   .checked=${cell.use_entity_unit !== false}
                                   @change=${(e) => this._cellUseEntityUnitChanged(rIdx, cIdx, e)} />
                            <span class="label">${t(this.hass,"editor.unit_from_entity")}</span>
                            ${cell.use_entity_unit === false ? html`
                              <ha-textfield
                                .label=${""}
                                .placeholder=${"°C"}
                                .value=${cell.unit || ''}
                                @input=${(e) => this._cellUnitChanged(rIdx, cIdx, e)}>
                              </ha-textfield>
                            ` : ''}
                          </label>
                        </div>

                        ${isNumeric ? html`
                          <div class="cell-grid cell-wide" style="margin-bottom: 8px;">
                            <ha-select
                              .label=${t(this.hass,"editor.precision")}
                              .value=${(cell.precision ?? '').toString()}
                              @selected=${(e)=>this._cellPrecisionChanged(rIdx,cIdx,{target:{value:e.target.value}})}
                              @closed=${(e)=>e.stopPropagation()}>
                              <mwc-list-item value=""></mwc-list-item>
                              <mwc-list-item value="2">${t(this.hass,"precision.two")}</mwc-list-item>
                              <mwc-list-item value="1">${t(this.hass,"precision.one")}</mwc-list-item>
                              <mwc-list-item value="0">${t(this.hass,"precision.int")}</mwc-list-item>
                            </ha-select>
                          </div>
                        ` : ''}
                      ` : ''}

                      ${(cell.type === 'string' || cell.type === 'entity') ? html`
                        <!-- TLO -->
                        <div class="cell-grid cell-wide">
                          <div class="inline">
                            <ha-textfield
                            .label=${t(this.hass,"editor.background_color")}
                            .placeholder=${"#ff5722 | red | var(--color)"}
                            .value=${st.background || ''}
                            @input=${(e)=>this._styleValue(rIdx,cIdx,'background',e)}>
                            </ha-textfield>
                            <button class="toggle" title="Palette" @click=${(ev) => this._onPaletteClick(ev, rIdx, cIdx, 'background')}>
                              <ha-icon icon="mdi:palette"></ha-icon>
                            </button>
                          </div>
                        </div>

                        <!-- KOLOR -->
                        <div class="cell-grid cell-wide">
                          <div class="inline">
                            <ha-textfield
                            .label=${t(this.hass,"editor.content_color")}
                            .placeholder=${"#ff5722 | red | var(--color)"}
                            .value=${st.color || ''}
                            @input=${(e)=>this._styleValue(rIdx,cIdx,'color',e)}>
                            </ha-textfield>
                            <button class="toggle" title="Palette" @click=${(ev) => this._onPaletteClick(ev, rIdx, cIdx, 'color')}>
                              <ha-icon icon="mdi:palette"></ha-icon>
                            </button>

                          </div>
                        </div>
                        <!-- ROZMIAR -->
                        <div class="cell-grid cell-wide">
                          <ha-textfield
                            .label=${t(this.hass,"editor.text_size")}
                            .placeholder=${"14px | 1.1rem | 120%"}
                            .value=${st.font_size || ''}
                            @input=${(e)=>this._styleValue(rIdx,cIdx,'font_size',e)}>
                          </ha-textfield>
                        </div>

                        <!-- ODSTĘPY MIĘDZY LITERAMI -->
                        <div class="cell-grid cell-wide">
                          <ha-textfield
                            .label=${t(this.hass,"editor.letter_spacing")}
                            .placeholder=${"0.08em | -0.3px"}
                            .value=${st.letter_spacing || ''}
                            @input=${(e)=>this._styleValue(rIdx,cIdx,'letter_spacing',e)}>
                          </ha-textfield>
                        </div>

                        <!-- POJEDYNCZE CHECKBOXY -->
                        <div class="cell-grid cell-wide">
                          <label class="option full">
                            <input type="checkbox" .checked=${!!st.bold} @change=${(e)=>this._styleToggle(rIdx,cIdx,'bold',e)} />
                            ${t(this.hass,"style.bold")}
                          </label>
                        </div>
                        <div class="cell-grid cell-wide">
                          <label class="option full">
                            <input type="checkbox" .checked=${!!st.italic} @change=${(e)=>this._styleToggle(rIdx,cIdx,'italic',e)} />
                            ${t(this.hass,"style.italic")}
                          </label>
                        </div>
                        <div class="cell-grid cell-wide">
                          <label class="option full">
                            <input type="checkbox" .checked=${st.underline ?? false} @change=${(e)=>this._styleToggle(rIdx,cIdx,'underline',e)} />
                            ${t(this.hass,"style.underline")}
                          </label>
                        </div>
                        <div class="cell-grid cell-wide">
                          <label class="option full">
                            <input type="checkbox" .checked=${!!st.strike} @change=${(e)=>this._styleToggle(rIdx,cIdx,'strike',e)} />
                            ${t(this.hass,"style.strike")}
                          </label>
                        </div>
                      ` : ''}

                      ${isIcon ? html`
                        <div class="cell-grid cell-wide">
                          <div class="inline">
                            <ha-textfield
                            .label=${t(this.hass,"editor.background_color")}
                            .placeholder=${"#ff5722 | red | var(--primary-color)"}
                            .value=${st.background || ''}
                            @input=${(e)=>this._styleValue(rIdx,cIdx,'background',e)}>
                            </ha-textfield>
                            <button class="toggle" title="Palette" @click=${(ev) => this._onPaletteClick(ev, rIdx, cIdx, 'background')}>
                              <ha-icon icon="mdi:palette"></ha-icon>
                            </button>
                          </div>
                        </div>

                        <div class="cell-grid cell-wide">
                          <div class="inline">
                            <ha-textfield
                            .label=${t(this.hass,"editor.icon_color")}
                            .placeholder=${"#ff5722 | red | var(--primary-color)"},
                            .value=${st.color || ''}
                            @input=${(e)=>this._styleValue(rIdx,cIdx,'color',e)}>
                            </ha-textfield>
                            <button class="toggle" title="Palette" @click=${(ev) => this._onPaletteClick(ev, rIdx, cIdx, 'color')}>
                              <ha-icon icon="mdi:palette"></ha-icon>
                            </button>
                          </div>
                        </div>

                        <div class="cell-grid cell-wide">
                          <ha-textfield
                            .label=${t(this.hass,"editor.icon_size")}
                            .placeholder=${"24px | 1.4rem"}
                            .value=${st.icon_size || ''}
                            @input=${(e)=>this._styleValue(rIdx,cIdx,'icon_size',e)}>
                          </ha-textfield>
                        </div>
                      ` : ''}

                                            </details>

                      <!-- Tap & Hold Actions -->
                      <details style="margin-top:12px;">
                        <summary style="cursor:pointer;font-weight:600;">
                          ${t(this.hass, 'editor.advanced')}
                        </summary>

                        <div class="muted dyn-hint">${t(this.hass, 'editor.actions_hint')}</div>


                        <div class="cell-grid cell-wide" style="margin-top:8px;">
                          <ha-form
                            .hass=${this.hass}
                            .data=${{
                              tap_action: dclone(cell.tap_action),
                              hold_action: dclone(cell.hold_action),
                              double_tap_action: dclone(cell.double_tap_action),
                            }}
                            .schema=${[
                              { name: 'tap_action', selector: mkSelector() },
                              { name: 'hold_action', selector: mkSelector() },
                              { name: 'double_tap_action', selector: mkSelector() },
                            ]}
                            .computeLabel=${this._computeActionLabel}
                            @value-changed=${(ev) => this._onActionsChanged(rIdx, cIdx, ev)}
                          ></ha-form>
                        </div>

                        
                      </details>
                      <!-- DYNAMIC COLORING -->
                      <details style="margin-top:12px;">
                        <summary style="cursor:pointer;font-weight:600;">
                          ${t(this.hass, 'editor.dynamic_title')}
                        </summary>

                        <div class="muted dyn-hint">${t(this.hass, 'editor.dynamic_hint')}</div>

                        ${ (Array.isArray(cell?.dyn_color) ? cell.dyn_color : []).map((rule, ridx) => html`
                          <div class="option group full">
                            <!-- Entity full width -->
                            <div class="cols1">
                              <div class="rulehdr">${this._ruleTitle(ridx)}</div>
                              <ha-entity-picker
                                .hass=${this.hass}
                                .value=${rule.entity || ''}
                                allow-custom-entity
                                @value-changed=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ entity: e.detail?.value || e.target.value })}>
                              </ha-entity-picker>
                            </div>

                            <!-- Attribute full width with spacing -->
                            <div class="cols1">
                              <input
                                class="text-input attr-input"
                                list=${`dynattr-list-${rIdx}-${cIdx}-${ridx}`}
                                .value=${rule.attr || ''}
                                placeholder=${t(this.hass,"placeholder.attribute_path")}
                                @input=${(e)=> this._updateRule(rIdx,cIdx,ridx,{ attr: (e.target.value||'') }) }
                              />
                              <datalist id=${`dynattr-list-${rIdx}-${cIdx}-${ridx}`}>
                                ${ (this._buildAttrSuggestionsForEntity(rule.entity, rule.attr || '') || [])
                                    .map(opt => html`<option value="${opt}"></option>`) }
                              </datalist>
                            </div>

                            <!-- Operator + Value row (50/50) -->
                            <div class="cols2">
                              <ha-select
                                .label=${t(this.hass, 'dynamic.operator')}
                                .value=${rule.op || '='}
                                @selected=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ op: e.target.value })}
                                @closed=${(e)=>e.stopPropagation()}>
                                <mwc-list-item value=">">&gt;</mwc-list-item>
                                <mwc-list-item value=">=">&ge;</mwc-list-item>
                                <mwc-list-item value="<">&lt;</mwc-list-item>
                                <mwc-list-item value="<=">&le;</mwc-list-item>
                                <mwc-list-item value="=">=</mwc-list-item>
                                <mwc-list-item value="!=">≠</mwc-list-item>
                                <mwc-list-item value="between">${t(this.hass,'dynamic.op_between')}</mwc-list-item>
                                <mwc-list-item value="contains">${t(this.hass,'dynamic.op_contains')}</mwc-list-item>
                                <mwc-list-item value="not_contains">${t(this.hass,'dynamic.op_not_contains')}</mwc-list-item>
                              </ha-select>

                              ${ rule && rule.op === 'between' ? html`
                                <div class="cols2">
                                  <ha-textfield
                                    .label=${t(this.hass, 'dynamic.min')}
                                    .value=${rule.val || ''}
                                    @input=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ val: e.target.value })}>
                                  </ha-textfield>
                                  <ha-textfield
                                    .label=${t(this.hass, 'dynamic.max')}
                                    .value=${rule.val2 || ''}
                                    @input=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ val2: e.target.value })}>
                                  </ha-textfield>
                                </div>
                              ` : html`
                                <ha-textfield
                                  .label=${t(this.hass, 'editor.value')}
                                  .value=${rule.val || ''}
                                  @input=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ val: e.target.value })}>
                                </ha-textfield>
                              ` }
                            </div>

                            <!-- Colors row: Background + Content 50/50 with pickers -->
                            <div class="cols2">
                              <div class="inline">
                                <ha-textfield
                                  .label=${t(this.hass, 'dynamic.bg')}
                                  .value=${rule.bg || ''}
                                  .placeholder=${"transparent | #ff5722 | red | var(--color)"}
                                  @input=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ bg: e.target.value })}>
                                </ha-textfield>
                                <button class="toggle" title="Palette"
                                  @click=${(ev)=> this._onRuleColorPicker(ev, rIdx, cIdx, ridx, 'bg')}>
                                  <ha-icon icon="mdi:palette"></ha-icon>
                                </button>
                              </div>

                              <div class="inline">
                                <ha-textfield
                                  .label=${t(this.hass, 'dynamic.fg')}
                                  .value=${rule.fg || ''}
                                  .placeholder=${"transparent | #ff5722 | red | var(--color)"}
                                  @input=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ fg: e.target.value })}>
                                </ha-textfield>
                                <button class="toggle" title="Palette"
                                  @click=${(ev)=> this._onRuleColorPicker(ev, rIdx, cIdx, ridx, 'fg')}>
                                  <ha-icon icon="mdi:palette"></ha-icon>
                                </button>
                              </div>
                            </div>

                            <!-- Overwrite select -->
                            <div class="cols1">
                              <ha-select
                                .label=${t(this.hass, 'dynamic.overwrite_label')}
                                .value=${rule.overwrite || ''}
                                @selected=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ overwrite: e.target.value })}
                                @closed=${(e)=>e.stopPropagation()}>
                                <mwc-list-item value=""></mwc-list-item>
                                <mwc-list-item value="hide">${t(this.hass, 'dynamic.overwrite_hide')}</mwc-list-item>
                                <mwc-list-item value="text">${t(this.hass, 'dynamic.overwrite_text')}</mwc-list-item>
                                <mwc-list-item value="icon">${t(this.hass, 'dynamic.overwrite_icon')}</mwc-list-item>
                              </ha-select>
                            </div>

                            ${ (rule.overwrite || '') === 'text' ? html`
                              <div class="cols1">
                                <ha-textfield class="mask-input"
                                  .label=${t(this.hass, 'dynamic.text')}
                                  .value=${rule.text || ''}
                                  @input=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ text: e.target.value })}>
                                </ha-textfield>
                              </div>
                            ` : html`` }

                            ${ (rule.overwrite || '') === 'icon' ? html`
                              <div class="cols1">
                                ${customElements.get('ha-icon-picker') ? html`
                                  <ha-icon-picker
                                    .hass=${this.hass}
                                    .label=${t(this.hass,"editor.icon_label")}
                                    .value=${rule.icon || ''}
                                    @value-changed=${(e)=> this._updateRule(rIdx,cIdx,ridx,{ icon: e.detail?.value || '' })}>
                                  </ha-icon-picker>
                                ` : html`
                                  <ha-textfield
                                    .label=${t(this.hass,"editor.icon_label")}
                                    .value=${rule.icon || ''}
                                    .placeholder=${t(this.hass,"placeholder.icon")}
                                    @input=${(e)=>this._updateRule(rIdx,cIdx,ridx,{ icon: e.target.value })}>
                                  </ha-textfield>
                                `}
                              </div>
                            ` : html`` }

                            <!-- Delete aligned right, auto width -->
                            <div class="cols1 right">
                              <button class="danger mini" @click=${()=>this._removeRule(rIdx,cIdx,ridx)}>
                                ${t(this.hass, 'dynamic.delete_rule')}
                              </button>
                            </div>
                          </div>
                        `)}

                        <div class="flex" style="margin-top:6px;">
                          <button class="mini" @click=${()=>this._addRule(rIdx,cIdx)}>➕ ${t(this.hass,'dynamic.add_rule')}</button>
                          
                        </div>
                      </details>
                    `;
                  })()}
                </div>
              `}
            </div>
          </div>
        `;
      })}

      <div class="addrow">
        <button @click=${() => this._addRow?.()}>➕ ${t(this.hass,"editor.add_row")}</button>
      </div>

      <datalist id="entities-list">
        ${Object.keys(this.hass?.states || {}).map((id) => html`<option value=${id}></option>`)}
      </datalist>
    `;
  }

  // --- dodawanie/usuwanie wierszy ---
  _addRow() {
    const count = this.config.column_count || 1;
    const newCells = Array.from({ length: count }, (_, i) => ({ type: 'string', value: '', align: i === 0 ? 'left' : 'right' }));
    const rows = [...(this.config.rows || []), { cells: newCells }];
    this.config = { ...this.config, rows };
    this._fullCells = [...(this._fullCells || []), newCells.map(c => this._clone(c))];
    this._collapsed = [...(this._collapsed || []), true];
    this._activeTabs = { ...(this._activeTabs || {}), [rows.length - 1]: 0 };
    this._fireConfigChanged();
  }
  _removeRow(idx) {
    const rows = [...(this.config.rows || [])];
    if (idx < 0 || idx >= rows.length) return;
    rows.splice(idx, 1);
    this.config = { ...this.config, rows };
    if (Array.isArray(this._fullCells) && this._fullCells.length) {
      const a = [...this._fullCells]; a.splice(idx, 1); this._fullCells = a;
    }
    if (Array.isArray(this._collapsed) && this._collapsed.length) {
      const c = [...this._collapsed]; c.splice(idx, 1); this._collapsed = c;
    }
    const newTabs = {};
    Object.keys(this._activeTabs || {}).forEach(k => {
      const i = parseInt(k, 10);
      if (i < idx) newTabs[i] = this._activeTabs[i];
      else if (i > idx) newTabs[i - 1] = this._activeTabs[i];
    });
    this._activeTabs = newTabs;
    this._fireConfigChanged();
  }
}

if (!customElements.get('flex-cells-card-editor')) {
  customElements.define('flex-cells-card-editor', FlexCellsCardEditor);
}