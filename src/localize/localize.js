// localize/localize.js
const DICTS = {
  en: {
  editor: {
    appearance: "Appearance & Style",
    card_title: "Flex Cells card configuration",
    columns_count: "Columns",
    text_size_global: "Text size (default)",
    card_padding: "Card padding",
    cell_padding_top: "Cell padding - top",
    cell_padding_right: "Cell padding - right",
    cell_padding_bottom: "Cell padding - bottom",
    cell_padding_left: "Cell padding - left",
    widths_label: "Column widths (px/%/rem/auto), e.g. \"80px, auto, 25%, 12rem\"",
    hide_cols_label: "Columns to hide below breakpoint (e.g. 1,4)",
    breakpoint: "Breakpoint (px)",
    overflow_x: "Horizontal scroll (overflow-x)",
    header_from_first: "Use first row as header",
    zebra: "Zebra stripes",
    row: "Row",
    header_suffix: " - header",
    tab_first: "Column 1",
    copy: "Copy configuration",
    paste: "Paste configuration",
    clipboard_empty: "Clipboard empty",
    align: "Alignment",
    unit_from_entity: "Use unit from entity",
    precision: "Precision",
    show_control: "Show control",
    press: "Press",
    text_color: "Text color",
    text_size: "Text size",
    text_transform: "Text transform",
    letter_spacing: "Letter spacing",
    icon_color: "Icon color",
    icon_size: "Icon size",
    add_row: "Add row",
    delete_row: "Delete row",
    column: "Column",
    drag_to_reorder: "Drag to reorder",
    move_left: "Move left",
    move_right: "Move right",
    up: "Move up",
    down: "Move down",
    toggle: "Collapse/Expand",
    delete_column: "Delete column",
    cell_type: "Cell type",
    entity_label: "Entity",
    string_label: "Text",
    icon_label: "Icon",
    tap_action: "Tap action",
    hold_action: "Hold action",
    double_tap_action: "Double-tap action",
    advanced: "Tap & Hold Actions",
    actions_hint: "If any action is set, the default 'more-info' for an entity will be disabled.",
    scale_title: "Rescale",
    scale_in_min: "Input min",
    scale_in_max: "Input max",
    scale_out_min: "Output min",
    scale_out_max: "Output max",
    scale_hint: "Map a numeric value from one range to another (e.g., 0-255 → 0-100).",
    dynamic_title: "Dynamic Rules: Color & Content Overrides",
    dynamic_hint: "Evaluate rules from top to bottom, the last match wins.",
    value: "Value"
  },
  placeholder: {
    entity: "Select entity",
    string: "Text to display",
    icon: "mdi:icon-name",
    attribute_path: "Attribute path (e.g. a.b[0].c)"
  },
  dynamic: {
    operator: "Operator",
    add_rule: "Add rule",
    delete_rule: "Delete",
    op_between: "between",
    op_contains: "contains",
    op_not_contains: "does not contain",
    min: "Min",
    max: "Max",
    bg: "Background color",
    fg: "Content color",
    overwrite_label: "Overwrite content",
    overwrite_hide: "Hide",
    overwrite_text: "Overwrite with text",
    overwrite_icon: "Overwrite with icon",
    text: "Text",
  },
  align: {
    left: "left",
    center: "center",
    right: "right"
  },
  precision: {
    two: "two decimals",
    one: "one decimal",
    int: "integer"
  },
  style: {
    bold: "bold",
    italic: "italic",
    underline: "underline",
    strike: "strikethrough"
  },
  card: {
    no_rows: "No rows to display."
  }
},

  pl: {
  editor: {
    appearance: "Wygląd i styl",
    card_title: "Konfiguracja karty Flex Cells",
    columns_count: "Liczba kolumn",
    text_size_global: "Rozmiar tekstu (domyślny)",
    card_padding: "Padding karty",
    cell_padding_top: "Padding komórki - góra",
    cell_padding_right: "Padding komórki - prawa",
    cell_padding_bottom: "Padding komórki - dół",
    cell_padding_left: "Padding komórki - lewa",
    widths_label: "Szerokości kolumn (px/%/rem/auto), np. \"80px, auto, 25%, 12rem\"",
    hide_cols_label: "Kolumny do ukrycia poniżej breakpointu (np. 1,4)",
    breakpoint: "Breakpoint (px)",
    overflow_x: "Poziomy scroll (overflow-x)",
    header_from_first: "Użyj pierwszego wiersza jako nagłówka",
    zebra: "Zebra stripes",
    row: "Wiersz",
    header_suffix: " - nagłówek",
    tab_first: "Kolumna 1",
    copy: "Kopiuj konfigurację",
    paste: "Wklej konfigurację",
    clipboard_empty: "Schowek pusty",
    align: "Wyrównanie",
    unit_from_entity: "Jednostka z encji",
    precision: "Precyzja",
    show_control: "Pokaż kontrolkę",
    press: "Wciśnij",
    text_color: "Tekst kolor",
    text_size: "Tekst rozmiar",
    text_transform: "Tekst transformacja",
    letter_spacing: "Odstępy między literami",
    icon_color: "Ikona kolor",
    icon_size: "Ikona rozmiar",
    add_row: "Dodaj wiersz",
    delete_row: "Usuń wiersz",
    column: "Kolumna",
    drag_to_reorder: "Przeciągnij, aby zmienić kolejność",
    move_left: "Przenieś w lewo",
    move_right: "Przenieś w prawo",
    up: "Przenieś w górę",
    down: "Przenieś w dół",
    toggle: "Zwiń/Rozwiń",
    delete_column: "Usuń kolumnę",
    cell_type: "Typ komórki",
    entity_label: "Encja",
    string_label: "Tekst",
    icon_label: "Ikona",
    tap_action: "Akcja po kliknięciu",
    hold_action: "Akcja po przytrzymaniu",
    double_tap_action: "Akcja po dwukliku",
    advanced: "Akcje dotknięcia i przytrzymania",
    actions_hint: "Jeśli ustawisz jakąkolwiek akcję, domyślne 'more-info' dla encji zostanie wyłączone.",
    scale_title: "Przeskalowanie",
    scale_in_min: "Wejście min",
    scale_in_max: "Wejście max",
    scale_out_min: "Wyjście min",
    scale_out_max: "Wyjście max",
    scale_hint: "Mapuj wartość z jednego zakresu na inny (np. 0-255 → 0-100).",
    dynamic_title: "Reguły dynamiczne: kolor i nadpisywanie treści",
    dynamic_hint: "Reguły sprawdzane są od góry do dołu, ostatnia dopasowana wygrywa.",
    value: "Wartość"
  },
  placeholder: {
    entity: "Wybierz encję",
    string: "Tekst do wyświetlenia",
    icon: "mdi:nazwa-ikony",
    attribute_path: "Ścieżka atrybutu (np. a.b[0].c)"
  },
  dynamic: {
    operator: "Operator",
    add_rule: "Dodaj regułę",
    delete_rule: "Usuń",
    op_between: "pomiędzy",
    op_contains: "zawiera",
    op_not_contains: "nie zawiera",
    min: "Min",
    max: "Max",
    bg: "Kolor tła",
    fg: "Kolor zawartości",
    overwrite_label: "Nadpisz zawartość",
    overwrite_hide: "Ukryj",
    overwrite_text: "Nadpisz tekstem",
    overwrite_icon: "Nadpisz ikoną",
    text: "Tekst",
  },
  align: {
    left: "lewo",
    center: "środek",
    right: "prawo"
  },
  precision: {
    two: "dwa miejsca",
    one: "jedno miejsce",
    int: "liczba całkowita"
  },
  style: {
    bold: "pogrubienie",
    italic: "kursywa",
    underline: "podkreślenie",
    strike: "przekreślenie"
  },
  card: {
    no_rows: "Brak wierszy do wyświetlenia."
  }
}
};

export function t(hass, key) {
  const lang = (hass?.locale?.language || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
  const parts = key.split(".");
  let node = DICTS[lang];
  for (const p of parts) {
    node = node?.[p];
    if (node === undefined) break;
  }
  if (node !== undefined) return node;

  // fallback to EN
  node = DICTS.en;
  for (const p of parts) {
    node = node?.[p];
    if (node === undefined) break;
  }
  return node ?? key;
}
