'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { notify } from '@/lib/notifications';

// ── Custom font & size whitelists (Quill v2) ────────────────────────────────

const FONT_WHITELIST: string[] = [
  'sans-serif', 'serif', 'monospace', 'arial', 'georgia',
  'courier-new', 'times-new-roman', 'trebuchet', 'verdana',
  'tahoma', 'impact', 'comic-sans',
];
const SIZE_WHITELIST: string[] = [
  '10px', '12px', '13px', '14px', '15px', '16px',
  '18px', '20px', '24px', '28px', '30px',
  '36px', '42px', '48px', '60px', '72px',
];

try {
  const Font = Quill.import('attributors/style/font') as any;
  Font.whitelist = FONT_WHITELIST;
  Quill.register(Font, true);
} catch {
  // Font module not available — skip silently
}

try {
  const Size = Quill.import('attributors/style/size') as any;
  Size.whitelist = SIZE_WHITELIST;
  Quill.register(Size, true);
} catch {
  // Size module not available — skip silently
}

// ── Colour palette ──────────────────────────────────────────────────────────

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc',
  '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff',
  '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3',
  '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9',
  '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af',
  '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e',
  '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c',
  '#1155cc', '#0b5394', '#351c75', '#741b47',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d',
  '#1c4587', '#073763', '#20124d', '#4c1130',
];

const BG_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc',
  '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff',
  '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3',
  '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9',
  '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af',
  '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e',
  '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c',
  '#1155cc', '#0b5394', '#351c75', '#741b47',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d',
  '#1c4587', '#073763', '#20124d', '#4c1130',
];

// ── Props ───────────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write content here...',
  minHeight = '300px',
  maxHeight = '800px',
  onImageUpload,
  onImageRemove,
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill | null>(null);
  const lastHtmlRef = useRef(value);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Stable refs for callback props — prevents editor re-initialization when
  // the parent passes inline handlers that change on every render.
  const onImageUploadRef = useRef(onImageUpload);
  onImageUploadRef.current = onImageUpload;
  const onImageRemoveRef = useRef(onImageRemove);
  onImageRemoveRef.current = onImageRemove;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Image hover delete button state
  const [hoveredImageEl, setHoveredImageEl] = useState<HTMLElement | null>(null);
  const [deleteBtnPos, setDeleteBtnPos] = useState<{ top: number; left: number } | null>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const hoveredImageRef = useRef<HTMLElement | null>(null);
  const hideDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHideDelete = useCallback(() => {
    if (hideDeleteTimerRef.current) {
      clearTimeout(hideDeleteTimerRef.current);
      hideDeleteTimerRef.current = null;
    }
  }, []);

  // Safe editor accessor — getEditor() throws when the editor hasn't been
  // instantiated yet (e.g. after re-render during an async operation).
  const getQuill = useCallback(() => {
    try {
      return quillRef.current?.getEditor() ?? null;
    } catch {
      return null;
    }
  }, []);

  // Keep ref in sync when value changes externally
  useEffect(() => {
    lastHtmlRef.current = value;
  }, [value]);

  // Cleanup hide timer on unmount
  useEffect(() => cancelHideDelete, [cancelHideDelete]);

  // ── Extract image URLs from HTML ───────────────────────────────────────

  const extractImageUrls = useCallback((html: string): string[] => {
    const urls: string[] = [];
    const regex = /<img[^>]+src=["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  }, []);

  // ── Detect removed images and notify parent ────────────────────────────

  const handleChange = useCallback(
    (html: string) => {
      const onImageRemoveFn = onImageRemoveRef.current;
      if (onImageRemoveFn && lastHtmlRef.current) {
        const oldUrls = new Set(extractImageUrls(lastHtmlRef.current));
        const newUrls = new Set(extractImageUrls(html));

        for (const url of oldUrls) {
          if (!newUrls.has(url)) {
            onImageRemoveFn(url).catch(() => {
              // Silent fail — file delete is best-effort
            });
          }
        }
      }

      lastHtmlRef.current = html;
      onChangeRef.current(html);
    },
    [extractImageUrls],
  );

  // ── Image upload handler ───────────────────────────────────────────────

  const handleImageUpload = useCallback(async () => {
    const upload = onImageUploadRef.current;
    if (!upload) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml';
    input.multiple = false;

    const file = await new Promise<File | null>((resolve) => {
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });

    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await upload(file);
      const editor = getQuill();
      if (!editor) return;

      const range = editor.getSelection() ?? { index: editor.getLength() - 1, length: 0 };
      editor.insertEmbed(range.index, 'image', url);
      editor.setSelection(range.index + 1, 0);
    } catch {
      notify.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }, []);

  // ── Custom link handler (prompt for URL) ───────────────────────────────

  const handleLink = useCallback(() => {
    const editor = getQuill();
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection) return;

    const currentUrl = editor.getText(selection.index, selection.length);
    const url = window.prompt(
      'Enter link URL:',
      selection.length > 0
        ? currentUrl.startsWith('http') || currentUrl.startsWith('/')
          ? currentUrl
          : 'https://'
        : 'https://',
    );

    if (!url || url === 'https://') return;

    // If text is selected, wrap it in a link; otherwise insert the URL as linked text
    if (selection.length > 0) {
      editor.format('link', url);
    } else {
      editor.insertText(selection.index, url, 'link', url);
      editor.setSelection(selection.index + url.length, 0);
    }
  }, []);

  // ── Custom video handler (prompt for URL) ──────────────────────────────

  const handleVideo = useCallback(() => {
    const editor = getQuill();
    if (!editor) return;

    const url = window.prompt(
      'Enter video URL:',
      'https://www.youtube.com/watch?v=',
    );
    if (!url) return;

    const range = editor.getSelection() ?? { index: editor.getLength() - 1, length: 0 };
    editor.insertEmbed(range.index, 'video', url);
    editor.setSelection(range.index + 1, 0);
  }, []);

  // ── Remove image on click ──────────────────────────────────────────────

  const handleImageClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;

      const editor = getQuill();
      if (!editor) return;

      // Ask user if they want to delete this image
      const confirmed = window.confirm('Remove this image from the content?');
      if (!confirmed) return;

      // Find the image blot and remove it
      const blot = editor.scroll.find(target);
      if (blot) {
        editor.deleteText(editor.getIndex(blot), blot.length());
      }
    },
    [],
  );

  // ── Hover delete button for images ────────────────────────────────────

  const handleEditorMouseOver = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;

      cancelHideDelete();

      const wrapper = (e.currentTarget as HTMLElement).closest('.rich-text-editor-wrapper') as HTMLElement;
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

      // Don't hide if moving to the delete button
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

    const editor = getQuill();
    if (!editor) return;

    const blot = editor.scroll.find(img);
    if (blot) {
      editor.deleteText(editor.getIndex(blot), blot.length());
    }

    setHoveredImageEl(null);
    setDeleteBtnPos(null);
    hoveredImageRef.current = null;
  }, []);

  // ── Upload an image file and insert into editor ────────────────────────

  const uploadAndInsert = useCallback(
    async (file: File) => {
      const upload = onImageUploadRef.current;
      if (!upload) return;
      if (!file.type.startsWith('image/')) return;

      setUploadingImage(true);
      try {
        const url = await upload(file);
        const editor = getQuill();
        if (!editor) return;

        const range = editor.getSelection() ?? { index: editor.getLength() - 1, length: 0 };
        editor.insertEmbed(range.index, 'image', url);
        editor.setSelection(range.index + 1, 0);
      } catch {
        notify.error('Failed to upload image');
      } finally {
        setUploadingImage(false);
      }
    },
    [],
  );

  // ── Handle paste: intercept image DataTransfer ─────────────────────────

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) uploadAndInsert(file);
          return;
        }
      }
    },
    [uploadAndInsert],
  );

  // ── Handle drop: intercept dragged images ────────────────────────────

  const handleDrop = useCallback(
    (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          uploadAndInsert(file);
          return;
        }
      }
    },
    [uploadAndInsert],
  );

  // ── Attach event listeners to editor root ──────────────────────────────

  useEffect(() => {
    const editor = getQuill();
    const editorEl = editor?.root;
    if (!editorEl) return;

    // Click on image → confirm remove
    editorEl.addEventListener('click', handleImageClick);
    // Hover image → show delete button
    editorEl.addEventListener('mouseover', handleEditorMouseOver);
    editorEl.addEventListener('mouseout', handleEditorMouseOut);
    // Paste image from clipboard
    editorEl.addEventListener('paste', handlePaste, true);
    // Drag-and-drop image
    editorEl.addEventListener('drop', handleDrop, true);

    return () => {
      cancelHideDelete();
      editorEl.removeEventListener('click', handleImageClick);
      editorEl.removeEventListener('mouseover', handleEditorMouseOver);
      editorEl.removeEventListener('mouseout', handleEditorMouseOut);
      editorEl.removeEventListener('paste', handlePaste, true);
      editorEl.removeEventListener('drop', handleDrop, true);
    };
  }, [handleImageClick, handleEditorMouseOver, handleEditorMouseOut, handlePaste, handleDrop, cancelHideDelete]);

  // ── Focus / blur tracking ──────────────────────────────────────────────

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  // ── Toolbar modules ────────────────────────────────────────────────────

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          // ── Font / Size / Header ──
          [{ font: FONT_WHITELIST }],
          [{ size: SIZE_WHITELIST }],
          [{ header: [1, 2, 3, 4, 5, 6, false] }],

          // ── Formatting ──
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: TEXT_COLORS }, { background: BG_COLORS }],
          ['code', 'clean'],

          // ── Inserts ──
          ['link', 'image', 'video'],

          // ── Alignment / Indent / Direction ──
          [{ align: [false, 'center', 'right', 'justify'] }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ direction: 'rtl' }],

          // ── Lists ──
          [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],

          // ── Blocks ──
          ['blockquote', 'code-block'],
          [{ script: 'sub' }, { script: 'super' }],

          // ── History ──
          ['undo', 'redo'],
        ],
        handlers: {
          image: handleImageUpload,
          link: handleLink,
          video: handleVideo,
          undo: () => {
            const q = getQuill();
            if (q) q.history.undo();
          },
          redo: () => {
            const q = getQuill();
            if (q) q.history.redo();
          },
        },
      },
      history: {
        delay: 500,
        maxStack: 200,
        userOnly: true,
      },
      // Enable clipboard paste handling for images
      clipboard: {
        matchVisual: false,
      },
    }),
    [handleImageUpload, handleLink, handleVideo],
  );

  // ── Allowed formats ────────────────────────────────────────────────────

  const formats = [
    'font',
    'size',
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'code',
    'clean',
    'link',
    'image',
    'video',
    'align',
    'indent',
    'direction',
    'list',
    'bullet',
    'ordered',
    'check',
    'blockquote',
    'code-block',
    'script',
    'sub',
    'super',
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className={`rich-text-editor-wrapper ${isFocused ? 'rich-text-editor-focused' : ''}`}
    >
      {/* Upload overlay */}
      {uploadingImage && (
        <div className="rich-text-editor-uploading-overlay">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Uploading image…
        </div>
      )}

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
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
          </svg>
        </button>
      )}

      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight, maxHeight }}
      />

      {/* ── Inline styles (scoped via wrapper class) ─────────────────── */}
      <style>{`
        /* ============ Wrapper ============ */
        .rich-text-editor-wrapper {
          position: relative;
        }

        /* ============ Uploading overlay ============ */
        .rich-text-editor-uploading-overlay {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: #4f46e5;
          color: #fff;
          font-size: 0.75rem;
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.15);
          pointer-events: none;
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
        .rich-text-editor-wrapper .ql-toolbar {
          border: 1px solid #d1d5db;
          border-bottom: none;
          border-radius: 0.375rem 0.375rem 0 0;
          background: #f9fafb;
          padding: 0.375rem 0.5rem;
          flex-wrap: wrap;
        }
        .rich-text-editor-wrapper .ql-toolbar button {
          width: 28px;
          height: 28px;
          padding: 3px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.25rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #374151;
          transition: background 0.15s;
        }
        .rich-text-editor-wrapper .ql-toolbar button:hover {
          background: #e5e7eb;
        }
        .rich-text-editor-wrapper .ql-toolbar button.ql-active {
          background: #e0e7ff;
          color: #4f46e5;
        }
        .rich-text-editor-wrapper .ql-toolbar .ql-formats {
          margin-right: 0.5rem;
        }
        .rich-text-editor-wrapper .ql-picker {
          height: 28px;
          display: inline-flex;
          align-items: center;
          color: #374151;
          font-size: 0.8125rem;
        }
        .rich-text-editor-wrapper .ql-picker-options {
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          box-shadow: 0 4px 12px -2px rgb(0 0 0 / 0.15);
          padding: 0.25rem;
          max-height: 220px;
          overflow-y: auto;
        }
        .rich-text-editor-wrapper .ql-picker-item {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.8125rem;
        }
        .rich-text-editor-wrapper .ql-picker-item:hover {
          background: #f3f4f6;
        }
        .rich-text-editor-wrapper .ql-picker-item.ql-selected {
          background: #e0e7ff;
          color: #4f46e5;
        }

        /* ============ Colour pickers (larger swatches) ============ */
        .rich-text-editor-wrapper .ql-color-picker {
          width: 36px;
        }
        .rich-text-editor-wrapper .ql-color-picker .ql-picker-label {
          padding: 0 2px;
        }
        .rich-text-editor-wrapper .ql-color-picker .ql-picker-options {
          width: 244px;
          padding: 4px;
          flex-wrap: wrap;
          gap: 2px;
        }
        .rich-text-editor-wrapper .ql-color-picker.ql-expanded .ql-picker-options {
          display: flex;
        }
        .rich-text-editor-wrapper .ql-color-picker .ql-picker-item {
          width: 20px;
          height: 20px;
          padding: 0;
          margin: 0;
          border: 1px solid transparent;
          border-radius: 2px;
        }
        .rich-text-editor-wrapper .ql-color-picker .ql-picker-item:hover {
          border-color: #4f46e5;
        }

        /* ============ Editor Container ============ */
        .rich-text-editor-wrapper .ql-container {
          min-height: ${minHeight};
          max-height: ${maxHeight};
          font-size: 0.9375rem;
          font-family: inherit;
          line-height: 1.6;
          border: 1px solid #d1d5db;
          border-radius: 0 0 0.375rem 0.375rem;
          background: #fff;
          transition: border-color 0.15s;
        }
        .rich-text-editor-wrapper.rich-text-editor-focused .ql-container {
          border-color: #818cf8;
          box-shadow: 0 0 0 1px #818cf8;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          max-height: ${maxHeight};
          overflow-y: auto;
          padding: 1rem;
        }
        .rich-text-editor-wrapper .ql-editor p {
          margin-bottom: 0.5rem;
        }
        .rich-text-editor-wrapper .ql-editor h1 { font-size: 2rem; font-weight: 700; margin: 1rem 0 0.5rem; }
        .rich-text-editor-wrapper .ql-editor h2 { font-size: 1.5rem; font-weight: 600; margin: 0.875rem 0 0.5rem; }
        .rich-text-editor-wrapper .ql-editor h3 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.375rem; }
        .rich-text-editor-wrapper .ql-editor h4 { font-size: 1.125rem; font-weight: 600; margin: 0.5rem 0 0.25rem; }
        .rich-text-editor-wrapper .ql-editor h5 { font-size: 1rem;    font-weight: 600; margin: 0.5rem 0 0.25rem; }
        .rich-text-editor-wrapper .ql-editor h6 { font-size: 0.875rem;font-weight: 600; margin: 0.5rem 0 0.25rem; }

        /* ── Images ── */
        .rich-text-editor-wrapper .ql-editor img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1.5rem 0;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
          cursor: default;
        }
        .rich-text-editor-wrapper .ql-editor img:hover {
          box-shadow: 0 0 0 2px #818cf8, 0 4px 12px rgb(0 0 0 / 0.12);
        }

        /* ── Video embeds ── */
        .rich-text-editor-wrapper .ql-editor iframe {
          max-width: 100%;
          width: 100%;
          height: 400px;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        @media (max-width: 640px) {
          .rich-text-editor-wrapper .ql-editor iframe { height: 240px; }
        }

        /* ── Code blocks ── */
        .rich-text-editor-wrapper .ql-editor pre.ql-syntax {
          background: #1e293b;
          color: #e2e8f0;
          border-radius: 0.375rem;
          padding: 1rem;
          overflow-x: auto;
          font-size: 0.8125rem;
          font-family: ui-monospace, monospace;
        }
        .rich-text-editor-wrapper .ql-editor code {
          background: #f1f5f9;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.8125rem;
          font-family: ui-monospace, monospace;
          color: #7c3aed;
        }

        /* ── Blockquote ── */
        .rich-text-editor-wrapper .ql-editor blockquote {
          border-left: 3px solid #818cf8;
          padding: 0.5rem 0 0.5rem 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
          background: #f9fafb;
          border-radius: 0 0.25rem 0.25rem 0;
        }

        /* ── Link ── */
        .rich-text-editor-wrapper .ql-editor a {
          color: #4f46e5;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .rich-text-editor-wrapper .ql-editor a:hover {
          color: #4338ca;
        }

        /* ── Lists ── */
        .rich-text-editor-wrapper .ql-editor ul,
        .rich-text-editor-wrapper .ql-editor ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .rich-text-editor-wrapper .ql-editor li {
          margin-bottom: 0.25rem;
        }

        /* ── Placeholder ── */
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
          left: 1rem;
        }

        /* ── Table support (if quill table module is loaded) ── */
        .rich-text-editor-wrapper .ql-editor table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        .rich-text-editor-wrapper .ql-editor table td,
        .rich-text-editor-wrapper .ql-editor table th {
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          vertical-align: top;
        }
        .rich-text-editor-wrapper .ql-editor table th {
          background: #f9fafb;
          font-weight: 600;
        }

        /* ============ Dark Mode ============ */
        .dark .rich-text-editor-wrapper .ql-toolbar {
          background: #1f2937;
          border-color: #4b5563;
        }
        .dark .rich-text-editor-wrapper .ql-toolbar button {
          color: #d1d5db;
        }
        .dark .rich-text-editor-wrapper .ql-toolbar button:hover {
          background: #374151;
        }
        .dark .rich-text-editor-wrapper .ql-toolbar button.ql-active {
          background: #312e81;
          color: #a5b4fc;
        }
        .dark .rich-text-editor-wrapper .ql-container {
          background: #111827;
          border-color: #4b5563;
          color: #d1d5db;
        }
        .dark .rich-text-editor-wrapper.rich-text-editor-focused .ql-container {
          border-color: #6366f1;
          box-shadow: 0 0 0 1px #6366f1;
        }
        .dark .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #6b7280;
        }
        .dark .rich-text-editor-wrapper .ql-picker {
          color: #d1d5db;
        }
        .dark .rich-text-editor-wrapper .ql-picker-options {
          background: #1f2937;
          border-color: #4b5563;
        }
        .dark .rich-text-editor-wrapper .ql-picker-item:hover {
          background: #374151;
        }
        .dark .rich-text-editor-wrapper .ql-picker-item.ql-selected {
          background: #312e81;
          color: #a5b4fc;
        }
        .dark .rich-text-editor-wrapper .ql-color-picker .ql-picker-item {
          border-color: #374151;
        }
        .dark .rich-text-editor-wrapper .ql-stroke {
          stroke: #d1d5db;
        }
        .dark .rich-text-editor-wrapper .ql-fill {
          fill: #d1d5db;
        }
        .dark .rich-text-editor-wrapper .ql-picker-label {
          color: #d1d5db;
        }
        .dark .rich-text-editor-wrapper .ql-editor pre.ql-syntax {
          background: #0f172a;
          color: #e2e8f0;
        }
        .dark .rich-text-editor-wrapper .ql-editor code {
          background: #1e293b;
          color: #a78bfa;
        }
        .dark .rich-text-editor-wrapper .ql-editor blockquote {
          background: #1f2937;
          color: #9ca3af;
        }
        .dark .rich-text-editor-wrapper .ql-editor a {
          color: #818cf8;
        }
        .dark .rich-text-editor-wrapper .ql-editor table td,
        .dark .rich-text-editor-wrapper .ql-editor table th {
          border-color: #4b5563;
        }
        .dark .rich-text-editor-wrapper .ql-editor table th {
          background: #1f2937;
        }
        .dark .rich-text-editor-wrapper .ql-editor img:hover {
          box-shadow: 0 0 0 2px #6366f1, 0 4px 12px rgb(0 0 0 / 0.3);
        }
      `}</style>
    </div>
  );
}
