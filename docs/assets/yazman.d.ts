// Type definitions for Yazman
// Modular WYSIWYG rich text editor

export default Yazman;

interface YazmanConfig {
  placeholder?: string;
  languageCode?: string;
  toolbar?: Array<string[] | Record<string, string>[]>;
  history?: {
    counterTiming?: number;
    saveCoefficient?: number;
  };
  autosave?: {
    enable?: boolean;
    counterTiming?: number;
    saveCoefficient?: number;
    preventUnload?: boolean;
    adaptor?: () => void;
  };
  ImageUploader?: new (...args: unknown[]) => unknown;
  onError?: (error: Error, context: Record<string, unknown>) => void;
}

interface ContentLine {
  format: Record<string, unknown>;
  children: ContentNode[];
}

interface ContentNode {
  textContent: string;
  format: Record<string, unknown>;
}

interface InsertNodeData {
  textContent?: string | null;
  format?: Record<string, unknown>;
  generateBlock?: boolean;
}

interface Paper {
  getFormat(start: number, end: number): Record<string, unknown>;
  getLine(index: number): LineInfo | undefined;
  getLines(start?: number, end?: number): LineInfo[];
  getNode(index: number): NodeInfo | null;
  getNodes(start?: number, end?: number): NodeInfo[];
  getLength(): number;
}

interface LineInfo {
  format: Record<string, unknown>;
  start: number;
  end: number;
  children: NodeInfo[];
}

interface NodeInfo {
  textContent: string;
  format: Record<string, unknown>;
  start: number;
  end: number;
}

interface Selection {
  getCaretPosition(): [number, number];
  setCaretPosition(caretPosition: [number, number]): [number, number];
  isCollapsed(): boolean;
}

interface Dialog {
  insertModal(modalInnerDom: HTMLElement, options?: { backcloth?: boolean }): void;
  closeModal(): void;
}

interface Autosave {
  saved: boolean;
  setBlock(value?: boolean): void;
  setGlobalUnLoad(value?: boolean): void;
  save(): void;
}

declare class Yazman {
  constructor(container: Element, config?: YazmanConfig);

  // Sub-modules
  paper: Paper;
  selection: Selection;
  dialog: Dialog;
  autosave: Autosave;

  // State
  isSaved: boolean;

  // Formatting
  format(start: number, end: number, format: Record<string, unknown>): void;
  formatLine(start: number, end: number, format: Record<string, unknown>): void;
  formatText(start: number, end: number, format: Record<string, unknown>): void;

  // Content manipulation
  insertNode(nodeData: InsertNodeData, index?: number): unknown | null;
  deleteContent(start: number, end: number): void;

  // Content import/export
  getContent(start?: number, end?: number): ContentLine[];
  setContent(contentArray: ContentLine[]): void;
  getText(): string;
  getLength(): number;

  // Editor state
  update(): void;
  isEmpty(insertWarning?: boolean, message?: string): boolean;

  // Focus
  focus(preventScroll?: boolean): void;
  hasFocus(): boolean;
  scrollIntoView(): void;

  // Enable/Disable
  enable(): void;
  disable(): void;

  // Lifecycle
  destroy(): void;

  // UI
  status(content?: string | HTMLElement, expire?: number): void;

  // Events
  on(event: string, handler: (...args: unknown[]) => void): Yazman;
  off(event: string, handler?: (...args: unknown[]) => void): Yazman;

  // Static methods
  static register(key: string, value: unknown): void;
  static addFormatSet(formatSet: string[]): void;
  static plugin(name: string, fn: (editor: Yazman) => unknown): void;
  static getInstance(element: Element): Yazman | undefined;
  static help(): void;
}
