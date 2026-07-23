'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import {
  createEditorSystem,
  boldExtension,
  italicExtension,
  underlineExtension,
  strikethroughExtension,
  codeFormatExtension,
  blockFormatExtension,
  listExtension,
  linkExtension,
  imageExtension,
  tableExtension,
  codeExtension,
  historyExtension,
  horizontalRuleExtension,
  htmlExtension,
  RichText,
} from '@lexkit/editor';
import {
  $getSelection,
  $isRangeSelection,
  $getNearestNodeFromDOMNode,
} from 'lexical';
import { notify } from '@/lib/notifications';

// ── Editor system ──────────────────────────────────────────────────────────────

const EXTENSIONS = [
  boldExtension,
  italicExtension,
  underlineExtension,
  strikethroughExtension,
  codeFormatExtension,
  blockFormatExtension,
  listExtension,
  linkExtension,
  imageExtension,
  tableExtension,
  codeExtension,
  historyExtension,
  horizontalRuleExtension,
  htmlExtension,
] as const;

const { Provider, useEditor } = createEditorSystem<typeof EXTENSIONS>();

// ── Props ──────────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  /** Callback to upload a file to the server; return the public URL. */
  onImageUpload?: (file: File) => Promise<string>;
  /**
   * Callback fired when an image URL is no longer present in the content.
   * Use this to delete orphaned files from the server.
   */
  onImageRemove?: (src: string) => Promise<void>;
}

// ── Icons (inline SVGs for toolbar) ────────────────────────────────────────────

const icons = {
  bold: <path d="M 7 4 L 14 4 C 16 4 17 5 17 7 C 17 9 16 10 14 10 L 7 10 Z M 7 10 L 15 10 C 17 10 18 11 18 13 C 18 15 17 16 15 16 L 7 16 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  italic: <path d="M 13 4 L 9 16 M 15 4 L 11 16 M 6 4 L 10 4 M 10 16 L 14 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  underline: <path d="M 5 16 L 15 16 M 10 4 L 10 12 C 10 13.5 11 14.5 12 14.5 C 13 14.5 14 13.5 14 12 L 14 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  strikethrough: <path d="M 4 10 L 16 10 M 6 7 L 6 6 C 6 4 7 3.5 8 3.5 L 12 3.5 C 13 3.5 14 4 14 6 M 14 14 L 14 15 C 14 16 13 16.5 12 16.5 L 8 16.5 C 7 16.5 6 16 6 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  code: <path d="M 9 5 L 4 11 L 9 17 M 11 5 L 16 11 L 11 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  link: <path d="M 7 12 L 7 9 C 7 5.5 9 4 12 4 C 15 4 17 5.5 17 9 L 17 12 M 13 12 L 13 15 C 13 18.5 11 20 8 20 C 5 20 3 18.5 3 15 L 3 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  image: <path d="M 3 4 L 17 4 C 18 4 19 5 19 6 L 19 18 C 19 19 18 20 17 20 L 3 20 C 2 20 1 19 1 18 L 1 6 C 1 5 2 4 3 4 Z M 7 9 C 7 10 6 11 5 11 C 4 11 3 10 3 9 C 3 8 4 7 5 7 C 6 7 7 8 7 9 Z M 19 14 L 14 10 L 7 17 L 4 15 L 1 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  table: <path d="M 3 4 L 17 4 C 18 4 19 5 19 6 L 19 18 C 19 19 18 20 17 20 L 3 20 C 2 20 1 19 1 18 L 1 6 C 1 5 2 4 3 4 Z M 1 10 L 19 10 M 1 14 L 19 14 M 10 4 L 10 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  listUl: <path d="M 3 6 L 5 6 M 3 10 L 5 10 M 3 14 L 5 14 M 7 6 L 17 6 M 7 10 L 17 10 M 7 14 L 17 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  listOl: <path d="M 3 5 L 4 5 L 4 7 M 3 7 L 5 7 M 3 11 C 3 10 4 10 4 10 C 5 10 5 11 4 12 L 3 13 L 5 13 M 7 6 L 17 6 M 7 10 L 17 10 M 7 14 L 17 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  blockquote: <path d="M 3 6 L 8 6 M 3 10 L 8 10 M 3 14 L 8 14 M 12 8 C 12 8 14 8 14 10 C 14 12 12 14 12 14 M 16 8 C 16 8 18 8 18 10 C 18 12 16 14 16 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  codeBlock: <path d="M 5 4 L 6.5 4 L 6.5 6 L 5 6 Z M 6.5 4 L 8 4 L 8 6 L 6.5 6 Z M 6 6 L 6 12 L 16 12 L 16 6 Z M 14 4 L 15.5 4 L 15.5 6 L 14 6 Z M 15.5 4 L 17 4 L 17 6 L 15.5 6 Z" fill="currentColor" />,
  hr: <path d="M 3 10 L 17 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  undo: <path d="M 8 5 L 3 10 L 8 15 M 3 10 L 14 10 C 16 10 17 12 17 14 L 17 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  redo: <path d="M 12 5 L 17 10 L 12 15 M 17 10 L 6 10 C 4 10 3 12 3 14 L 3 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  clean: <path d="M 3 3 L 17 17 M 17 3 L 3 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  paragraph: <path d="M 5 5 L 5 15 M 5 5 L 12 5 C 14 5 15 6 15 8 C 15 10 14 11 12 11 L 5 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  quote: <path d="M 3 3 L 7 3 M 3 7 L 7 7 M 3 11 L 7 11 M 3 15 L 7 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
};

// ── Utility component: Toolbar button ──────────────────────────────────────────

function Tb({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`lexkit-toolbar-btn${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────────

function Toolbar({
  uploadingImage,
  onTriggerImageUpload,
}: {
  uploadingImage: boolean;
  onTriggerImageUpload?: () => void;
}) {
  const { commands, activeStates, editor } = useEditor();

  // Determine current block type
  const currentBlock = useMemo(() => {
    if (activeStates.isH1) return 'h1';
    if (activeStates.isH2) return 'h2';
    if (activeStates.isH3) return 'h3';
    if (activeStates.isH4) return 'h4';
    if (activeStates.isH5) return 'h5';
    if (activeStates.isH6) return 'h6';
    if (activeStates.isQuote) return 'quote';
    if (activeStates.isInCodeBlock) return 'code';
    return 'p';
  }, [activeStates]);

  // ── Link handler ─────────────────────────────────────────────────────────────

  const handleLink = useCallback(() => {
    commands.insertLink(undefined);
  }, [commands]);

  // ── Image upload trigger ────────────────────────────────────────────────────

  const handleImageUpload = useCallback(() => {
    onTriggerImageUpload?.();
  }, [onTriggerImageUpload]);

  // ── Table handler ───────────────────────────────────────────────────────────

  const handleTable = useCallback(() => {
    commands.insertTable({ rows: 3, columns: 3, includeHeaders: false });
  }, [commands]);

  // ── Clear formatting ────────────────────────────────────────────────────────

  const handleClearFormatting = useCallback(() => {
    if (!editor) return;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Reset format bitmask to clear all text formatting
        (selection as unknown as { format: number }).format = 0;
      }
    });
  }, [editor]);

  // ── Code block toggle ───────────────────────────────────────────────────────

  const handleCodeBlock = useCallback(() => {
    commands.toggleCodeBlock();
  }, [commands]);

  // ── Block format handler ────────────────────────────────────────────────────

  const handleBlockFormat = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === 'p') commands.toggleParagraph();
      else if (val === 'quote') commands.toggleQuote();
      else if (val === 'code') commands.toggleCodeBlock();
      else commands.toggleHeading(val as any);
    },
    [commands],
  );

  return (
    <div className="lexkit-toolbar">
      {/* ── Block Format ── */}
      <span className="lexkit-toolbar-group">
        <select
          className="lexkit-toolbar-select"
          value={currentBlock}
          onChange={handleBlockFormat}
          title="Block format"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
          <option value="quote">Quote</option>
          <option value="code">Code Block</option>
        </select>
      </span>

      {/* ── Text Formatting ── */}
      <span className="lexkit-toolbar-group">
        <Tb active={activeStates.bold} onClick={() => commands.toggleBold()} title="Bold (Ctrl+B)">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.bold}</svg>
        </Tb>
        <Tb active={activeStates.italic} onClick={() => commands.toggleItalic()} title="Italic (Ctrl+I)">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.italic}</svg>
        </Tb>
        <Tb active={activeStates.underline} onClick={() => commands.toggleUnderline()} title="Underline (Ctrl+U)">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.underline}</svg>
        </Tb>
        <Tb active={activeStates.strikethrough} onClick={() => commands.toggleStrikethrough()} title="Strikethrough">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.strikethrough}</svg>
        </Tb>
        <Tb active={activeStates.code} onClick={() => commands.toggleCode()} title="Inline code">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.code}</svg>
        </Tb>
        <Tb onClick={handleClearFormatting} title="Clear formatting">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.clean}</svg>
        </Tb>
      </span>

      {/* ── Lists ── */}
      <span className="lexkit-toolbar-group">
        <Tb active={activeStates.unorderedList} onClick={() => commands.toggleUnorderedList()} title="Bullet list">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.listUl}</svg>
        </Tb>
        <Tb active={activeStates.orderedList} onClick={() => commands.toggleOrderedList()} title="Ordered list">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.listOl}</svg>
        </Tb>
      </span>

      {/* ── Inserts ── */}
      <span className="lexkit-toolbar-group">
        <Tb onClick={handleLink} title="Insert link">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.link}</svg>
        </Tb>
        <Tb disabled={!onTriggerImageUpload} onClick={handleImageUpload} title="Insert image">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.image}</svg>
        </Tb>
        <Tb onClick={handleTable} title="Insert table">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.table}</svg>
        </Tb>
      </span>

      {/* ── Blocks ── */}
      <span className="lexkit-toolbar-group">
        <Tb active={currentBlock === 'quote'} onClick={() => commands.toggleQuote()} title="Blockquote">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.blockquote}</svg>
        </Tb>
        <Tb active={currentBlock === 'code'} onClick={handleCodeBlock} title="Code block">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.codeBlock}</svg>
        </Tb>
        <Tb onClick={() => commands.insertHorizontalRule()} title="Horizontal rule">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.hr}</svg>
        </Tb>
      </span>

      {/* ── History ── */}
      <span className="lexkit-toolbar-group">
        <Tb onClick={() => commands.undo()} title="Undo (Ctrl+Z)">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.undo}</svg>
        </Tb>
        <Tb onClick={() => commands.redo()} title="Redo (Ctrl+Shift+Z)">
          <svg viewBox="0 0 20 20" width="16" height="16">{icons.redo}</svg>
        </Tb>
      </span>
    </div>
  );
}

// ── Extract image URLs from HTML ──────────────────────────────────────────────

function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

// ── Editor inner component (runs inside Provider) ─────────────────────────────

function EditorInner({
  value,
  onChange,
  placeholder,
  minHeight,
  maxHeight,
  onImageUpload,
  onImageRemove,
}: RichTextEditorProps) {
  const { commands, activeStates, editor } = useEditor();

  // Refs for callbacks (stable across renders)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onImageRemoveRef = useRef(onImageRemove);
  onImageRemoveRef.current = onImageRemove;
  const onImageUploadRef = useRef(onImageUpload);
  onImageUploadRef.current = onImageUpload;

  // Refs for controlled-value management
  const prevHtmlRef = useRef<string | undefined>(undefined);
  const isApplyingExternalValue = useRef(false);
  const isInitialized = useRef(false);

  // Image hover delete
  const [hoveredImageEl, setHoveredImageEl] = useState<HTMLElement | null>(null);
  const [deleteBtnPos, setDeleteBtnPos] = useState<{ top: number; left: number } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const hoveredImageRef = useRef<HTMLElement | null>(null);
  const hideDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  const cancelHideDelete = useCallback(() => {
    if (hideDeleteTimerRef.current) {
      clearTimeout(hideDeleteTimerRef.current);
      hideDeleteTimerRef.current = null;
    }
  }, []);

  // ── Controlled value: initial import ──────────────────────────────────────

  useEffect(() => {
    if (value && editor) {
      isApplyingExternalValue.current = true;
      commands.importFromHTML(value).then(() => {
        prevHtmlRef.current = value;
        isInitialized.current = true;
      });
    } else {
      prevHtmlRef.current = value || '';
      isInitialized.current = true;
    }
  }, []); // only on mount

  // ── Controlled value: external changes ────────────────────────────────────

  useEffect(() => {
    if (!isInitialized.current) return;
    if (value === prevHtmlRef.current) return;

    isApplyingExternalValue.current = true;
    commands.importFromHTML(value || '').then(() => {
      prevHtmlRef.current = value || '';
    });
  }, [value]);

  // ── Listen for user edits ─────────────────────────────────────────────────

  useEffect(() => {
    if (!editor) return;

    const unregister = editor.registerUpdateListener(() => {
      if (!isInitialized.current) return;
      if (isApplyingExternalValue.current) {
        isApplyingExternalValue.current = false;
        return;
      }

      const html = commands.exportToHTML();
      const htmlNormalized = html || '';

      if (htmlNormalized !== prevHtmlRef.current) {
        // Detect removed images
        const removeFn = onImageRemoveRef.current;
        if (removeFn && prevHtmlRef.current) {
          const oldUrls = new Set(extractImageUrls(prevHtmlRef.current));
          const newUrls = new Set(extractImageUrls(htmlNormalized));
          for (const url of oldUrls) {
            if (!newUrls.has(url)) {
              removeFn(url).catch(() => {});
            }
          }
        }

        prevHtmlRef.current = htmlNormalized;
        onChangeRef.current(htmlNormalized);
      }
    });

    return unregister;
  }, [editor, commands]);

  // ── Upload an image file and insert into editor ───────────────────────────

  const uploadAndInsert = useCallback(
    async (file: File) => {
      const upload = onImageUploadRef.current;
      if (!upload) return;
      if (!file.type.startsWith('image/')) return;

      setUploadingImage(true);
      try {
        const url = await upload(file);
        commands.insertImage({ src: url, alt: file.name });
      } catch {
        notify.error('Failed to upload image');
      } finally {
        setUploadingImage(false);
      }
    },
    [commands],
  );

  // ── Open file picker, upload, and insert ────────────────────────────────────

  const handleToolbarImageUpload = useCallback(() => {
    const upload = onImageUploadRef.current;
    if (!upload) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml';
    input.multiple = false;

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) uploadAndInsert(file);
    };
    input.click();
  }, [uploadAndInsert]);

  // ── Handle paste: intercept image DataTransfer ────────────────────────────

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();
          const file = item.getAsFile();
          if (file) uploadAndInsert(file);
          return;
        }
      }
    },
    [uploadAndInsert],
  );

  // ── Handle drop: intercept dragged images ─────────────────────────────────

  const handleDrop = useCallback(
    (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();
          uploadAndInsert(file);
          return;
        }
      }
    },
    [uploadAndInsert],
  );

  // ── Image hover delete ────────────────────────────────────────────────────

  const handleEditorMouseOver = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;

      cancelHideDelete();

      const wrapper = editorWrapperRef.current;
      if (!wrapper) return;

      const imgRect = target.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();

      hoveredImageRef.current = target;
      setHoveredImageEl(target);
      setDeleteBtnPos({
        top: imgRect.top - wrapperRect.top + 4,
        left: imgRect.right - wrapperRect.left - 28,
      });
    },
    [cancelHideDelete],
  );

  const handleEditorMouseOut = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;

      const related = e.relatedTarget as HTMLElement | null;
      if (related && deleteBtnRef.current?.contains(related)) return;

      cancelHideDelete();
      hideDeleteTimerRef.current = setTimeout(() => {
        setHoveredImageEl(null);
        setDeleteBtnPos(null);
        hoveredImageRef.current = null;
      }, 200);
    },
    [cancelHideDelete],
  );

  const handleDeleteBtnClick = useCallback(() => {
    const img = hoveredImageRef.current;
    if (!img) return;
    if (!editor) return;

    editor.update(() => {
      // Try to find the Lexical image container div (created by ImageNode.createDOM)
      const container = img.closest('.lexical-image-container');
      if (container) {
        const node = $getNearestNodeFromDOMNode(container);
        if (node) {
          node.remove();
          return;
        }
      }

      // Fallback: try walking up to a block element and using the key
      const rootEl = editor.getRootElement();
      if (!rootEl) return;

      let current: HTMLElement | null = img;
      while (current && current.parentElement && current.parentElement !== rootEl) {
        current = current.parentElement;
      }
      if (current && current.parentElement === rootEl) {
        const node = $getNearestNodeFromDOMNode(current);
        if (node) {
          node.remove();
        }
      }
    });

    setHoveredImageEl(null);
    setDeleteBtnPos(null);
    hoveredImageRef.current = null;
  }, [editor]);

  // ── Attach event listeners to editor root element ─────────────────────────

  useEffect(() => {
    const rootEl = editor?.getRootElement();
    if (!rootEl) return;

    // Image hover events (passive)
    rootEl.addEventListener('mouseover', handleEditorMouseOver);
    rootEl.addEventListener('mouseout', handleEditorMouseOut);
    // Paste / drop (capture to intercept before Lexical)
    rootEl.addEventListener('paste', handlePaste, true);
    rootEl.addEventListener('drop', handleDrop, true);

    // Focus / blur
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    rootEl.addEventListener('focusin', onFocus);
    rootEl.addEventListener('focusout', onBlur);

    return () => {
      cancelHideDelete();
      rootEl.removeEventListener('mouseover', handleEditorMouseOver);
      rootEl.removeEventListener('mouseout', handleEditorMouseOut);
      rootEl.removeEventListener('paste', handlePaste, true);
      rootEl.removeEventListener('drop', handleDrop, true);
      rootEl.removeEventListener('focusin', onFocus);
      rootEl.removeEventListener('focusout', onBlur);
    };
  }, [editor, handleEditorMouseOver, handleEditorMouseOut, handlePaste, handleDrop, cancelHideDelete]);

  // ── Cleanup hide timer on unmount ─────────────────────────────────────────

  useEffect(() => cancelHideDelete, [cancelHideDelete]);

  return (
    <div
      ref={editorWrapperRef}
      className={`rich-text-editor-wrapper${isFocused ? ' rich-text-editor-focused' : ''}`}
    >
      {/* Image hover delete button */}
      {hoveredImageEl && deleteBtnPos && (
        <button
          ref={deleteBtnRef}
          className="image-delete-btn"
          style={{
            position: 'absolute',
            top: deleteBtnPos.top,
            left: deleteBtnPos.left,
            zIndex: 10,
          }}
          onClick={handleDeleteBtnClick}
          onMouseLeave={() => {
            cancelHideDelete();
            hideDeleteTimerRef.current = setTimeout(() => {
              setHoveredImageEl(null);
              setDeleteBtnPos(null);
              hoveredImageRef.current = null;
            }, 200);
          }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
          </svg>
        </button>
      )}

      {/* Toolbar */}
      <Toolbar uploadingImage={uploadingImage} onTriggerImageUpload={handleToolbarImageUpload} />

      {/* RichText editing area (upload overlay lives inside this container) */}
      <div className="lexkit-editor-container" style={{ minHeight, maxHeight, position: 'relative' }}>
        {/* Upload overlay — fills the content area when active */}
        {uploadingImage && (
          <div className="rich-text-editor-uploading-overlay">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading image…
          </div>
        )}
        <RichText
          placeholder={placeholder}
          classNames={{
            contentEditable: 'lexkit-content-editable',
            placeholder: 'lexkit-placeholder',
          }}
          styles={{
            contentEditable: {
              minHeight: minHeight || '300px',
              maxHeight: maxHeight || '800px',
            },
          }}
        />
      </div>

      {/* ── ── Inline styles ── ── */}
      <style>{`
        /* ============ Wrapper ============ */
        .rich-text-editor-wrapper {
          position: relative;
        }

        /* ============ Uploading overlay ============ */
        .rich-text-editor-uploading-overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(2px);
          color: #4f46e5;
          font-size: 0.8125rem;
          font-weight: 500;
          pointer-events: none;
        }
        .dark .rich-text-editor-uploading-overlay {
          background: rgba(17, 24, 39, 0.85);
          color: #a5b4fc;
        }

        /* ============ Image hover delete button ============ */
        .rich-text-editor-wrapper .image-delete-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          border: 2px solid rgba(255, 255, 255, 0.8);
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: background 0.15s, transform 0.15s, opacity 0.15s;
          opacity: 0.85;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
        .rich-text-editor-wrapper .image-delete-btn:hover {
          background: #ef4444;
          opacity: 1;
          transform: scale(1.1);
        }
        .dark .rich-text-editor-wrapper .image-delete-btn {
          background: rgba(0, 0, 0, 0.7);
          border-color: rgba(255, 255, 255, 0.5);
        }
        .dark .rich-text-editor-wrapper .image-delete-btn:hover {
          background: #dc2626;
        }

        /* ============ Toolbar ============ */
        .lexkit-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          border: 1px solid #d1d5db;
          border-bottom: none;
          border-radius: 0.375rem 0.375rem 0 0;
          background: #f9fafb;
          padding: 0.375rem 0.5rem;
          align-items: center;
        }
        .lexkit-toolbar-group {
          display: inline-flex;
          align-items: center;
          gap: 1px;
          margin-right: 0.5rem;
          padding-right: 0.5rem;
          border-right: 1px solid #e5e7eb;
        }
        .lexkit-toolbar-group:last-child {
          margin-right: 0;
          padding-right: 0;
          border-right: none;
        }
        .lexkit-toolbar-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 3px;
          border-radius: 0.25rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #374151;
          transition: background 0.15s;
          line-height: 1;
        }
        .lexkit-toolbar-btn:hover {
          background: #e5e7eb;
        }
        .lexkit-toolbar-btn.active {
          background: #e0e7ff;
          color: #4f46e5;
        }
        .lexkit-toolbar-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .lexkit-toolbar-btn.disabled:hover {
          background: transparent;
        }
        .lexkit-toolbar-select {
          height: 28px;
          padding: 0 0.25rem;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          background: #fff;
          color: #374151;
          font-size: 0.75rem;
          cursor: pointer;
          outline: none;
        }
        .lexkit-toolbar-select:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 1px #818cf8;
        }

        /* ============ Editor Container ============ */
        .lexkit-editor-container {
          border: 1px solid #d1d5db;
          border-radius: 0 0 0.375rem 0.375rem;
          background: #fff;
          transition: border-color 0.15s;
          overflow: hidden;
        }
        .rich-text-editor-wrapper.rich-text-editor-focused .lexkit-editor-container {
          border-color: #818cf8;
        }
        .lexkit-content-editable {
          min-height: inherit;
          max-height: inherit;
          overflow-y: auto;
          padding: 1.25rem 1.5rem;
          font-size: 0.9375rem;
          font-family: inherit;
          line-height: 1.6;
          color: inherit;
          outline: none;
          position: relative;
        }
        .lexkit-content-editable p {
          margin-bottom: 0.5rem;
        }
        .lexkit-content-editable h1 { font-size: 2rem; font-weight: 700; margin: 1rem 0 0.5rem; }
        .lexkit-content-editable h2 { font-size: 1.5rem; font-weight: 600; margin: 0.875rem 0 0.5rem; }
        .lexkit-content-editable h3 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.375rem; }
        .lexkit-content-editable h4 { font-size: 1.125rem; font-weight: 600; margin: 0.5rem 0 0.25rem; }
        .lexkit-content-editable h5 { font-size: 1rem;    font-weight: 600; margin: 0.5rem 0 0.25rem; }
        .lexkit-content-editable h6 { font-size: 0.875rem;font-weight: 600; margin: 0.5rem 0 0.25rem; }

        /* ── Placeholder ── */
        .lexkit-placeholder {
          position: absolute;
          top: 1.25rem;
          left: 1.5rem;
          pointer-events: none;
          color: #9ca3af;
          font-style: normal;
          z-index: 1;
        }

        /* ── Images ── */
        .lexkit-content-editable img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1.5rem 0;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
          cursor: default;
        }
        .lexkit-content-editable img:hover {
          box-shadow: 0 0 0 2px #818cf8, 0 4px 12px rgb(0 0 0 / 0.12);
        }

        /* ── Figure (image wrapper from lexkit) ── */
        .lexkit-content-editable figure {
          margin: 1.5rem 0;
          text-align: center;
        }
        .lexkit-content-editable figure img {
          display: inline-block;
          margin: 0;
        }
        .lexkit-content-editable figcaption {
          font-size: 0.9em;
          color: #6b7280;
          font-style: italic;
          margin-top: 0.5rem;
          text-align: center;
        }

        /* ── Video embeds (from exported HTML iframes) ── */
        .lexkit-content-editable iframe {
          max-width: 100%;
          width: 100%;
          height: 400px;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        @media (max-width: 640px) {
          .lexkit-content-editable iframe { height: 240px; }
        }

        /* ── Code blocks ── */
        .lexkit-content-editable pre {
          background: #1e293b;
          color: #e2e8f0;
          border-radius: 0.375rem;
          padding: 1rem;
          overflow-x: auto;
          font-size: 0.8125rem;
          font-family: ui-monospace, monospace;
        }
        .lexkit-content-editable code {
          background: #f1f5f9;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.8125rem;
          font-family: ui-monospace, monospace;
          color: #7c3aed;
        }

        /* ── Blockquote ── */
        .lexkit-content-editable blockquote {
          border-left: 3px solid #818cf8;
          padding: 0.5rem 0 0.5rem 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
          background: #f9fafb;
          border-radius: 0 0.25rem 0.25rem 0;
        }

        /* ── Link ── */
        .lexkit-content-editable a {
          color: #4f46e5;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .lexkit-content-editable a:hover {
          color: #4338ca;
        }

        /* ── Lists ── */
        .lexkit-content-editable ul,
        .lexkit-content-editable ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .lexkit-content-editable li {
          margin-bottom: 0.25rem;
        }

        /* ── Table ── */
        .lexkit-content-editable table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        .lexkit-content-editable table td,
        .lexkit-content-editable table th {
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          vertical-align: top;
        }
        .lexkit-content-editable table th {
          background: #f9fafb;
          font-weight: 600;
        }

        /* ── Horizontal rule ── */
        .lexkit-content-editable hr {
          border: none;
          border-top: 2px solid #d1d5db;
          margin: 1.5rem 0;
        }

        /* ============ Dark Mode ============ */
        .dark .lexkit-toolbar {
          background: #1f2937;
          border-color: #4b5563;
        }
        .dark .lexkit-toolbar-btn {
          color: #d1d5db;
        }
        .dark .lexkit-toolbar-btn:hover {
          background: #374151;
        }
        .dark .lexkit-toolbar-btn.active {
          background: #312e81;
          color: #a5b4fc;
        }
        .dark .lexkit-toolbar-select {
          background: #374151;
          color: #d1d5db;
          border-color: #4b5563;
        }
        .dark .lexkit-toolbar-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 1px #6366f1;
        }
        .dark .lexkit-toolbar-group {
          border-right-color: #4b5563;
        }
        .dark .lexkit-editor-container {
          background: #111827;
          border-color: #4b5563;
          color: #d1d5db;
        }
        .dark .rich-text-editor-wrapper.rich-text-editor-focused .lexkit-editor-container {
          border-color: #6366f1;
        }
        .dark .lexkit-placeholder {
          color: #6b7280;
        }
        .dark .lexkit-content-editable pre {
          background: #0f172a;
          color: #e2e8f0;
        }
        .dark .lexkit-content-editable code {
          background: #1e293b;
          color: #a78bfa;
        }
        .dark .lexkit-content-editable blockquote {
          background: #1f2937;
          color: #9ca3af;
        }
        .dark .lexkit-content-editable a {
          color: #818cf8;
        }
        .dark .lexkit-content-editable table td,
        .dark .lexkit-content-editable table th {
          border-color: #4b5563;
        }
        .dark .lexkit-content-editable table th {
          background: #1f2937;
        }
        .dark .lexkit-content-editable img:hover {
          box-shadow: 0 0 0 2px #6366f1, 0 4px 12px rgb(0 0 0 / 0.3);
        }
        .dark .lexkit-content-editable figcaption {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RichTextEditor(props: RichTextEditorProps) {
  return (
    <Provider extensions={EXTENSIONS}>
      <EditorInner {...props} />
    </Provider>
  );
}
