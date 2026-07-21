'use client';

import { useMemo, useRef, useCallback, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { notify } from '@/lib/notifications';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onImageUpload?: (file: File) => Promise<string>;
  onImageRemove?: (src: string) => Promise<void>;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write content here...',
  minHeight = '300px',
  onImageUpload,
  onImageRemove,
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill | null>(null);
  const lastHtmlRef = useRef(value);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Track image URLs in content to detect removals
  const extractImageUrls = (html: string): string[] => {
    const urls: string[] = [];
    const regex = /<img[^>]+src=["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  };

  const handleChange = (html: string) => {
    // Detect removed images
    if (onImageRemove && lastHtmlRef.current) {
      const oldUrls = new Set(extractImageUrls(lastHtmlRef.current));
      const newUrls = new Set(extractImageUrls(html));

      for (const url of oldUrls) {
        if (!newUrls.has(url)) {
          onImageRemove(url).catch(() => {
            // Silent fail — file delete is best-effort
          });
        }
      }
    }

    lastHtmlRef.current = html;
    onChange(html);
  };

  // Custom image upload handler
  const handleImageUpload = useCallback(async () => {
    if (!onImageUpload) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setUploadingImage(true);
      try {
        const url = await onImageUpload(file);
        const editor = quillRef.current?.getEditor();
        if (!editor) return;

        const range = editor.getSelection() || { index: editor.getLength() - 1, length: 0 };
        editor.insertEmbed(range.index, 'image', url);
        editor.setSelection(range.index + 1, 0);
      } catch {
        notify.error('Failed to upload image');
      } finally {
        setUploadingImage(false);
      }
    };
    input.click();
  }, [onImageUpload]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'bullet' }, { list: 'ordered' }],
        ['blockquote', 'code-block'],
        [{ align: ['left', 'center', 'right'] }],
        ['image', 'undo', 'redo'],
      ],
      handlers: {
        image: handleImageUpload,
        undo: () => {
          const quill = quillRef.current?.getEditor();
          if (quill) quill.history.undo();
        },
        redo: () => {
          const quill = quillRef.current?.getEditor();
          if (quill) quill.history.redo();
        },
      },
    },
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true,
    },
  }), [handleImageUpload]);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'ordered',
    'blockquote', 'code-block',
    'align',
    'image',
  ];

  return (
    <div className="rich-text-editor-wrapper">
      {uploadingImage && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 bg-indigo-600 text-white text-xs rounded shadow">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Uploading image...
        </div>
      )}

      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight }}
      />

      <style>{`
        .rich-text-editor-wrapper {
          position: relative;
        }

        /* === Toolbar === */
        .rich-text-editor-wrapper .ql-toolbar {
          border: 1px solid #d1d5db;
          border-bottom: none;
          border-radius: 0.375rem 0.375rem 0 0;
          background: #f9fafb;
          padding: 0.375rem 0.5rem;
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
        }
        .rich-text-editor-wrapper .ql-toolbar button:hover {
          background: #e5e7eb;
        }
        .rich-text-editor-wrapper .ql-toolbar button.ql-active {
          background: #e0e7ff;
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
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 0.25rem;
        }
        .rich-text-editor-wrapper .ql-picker-item {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          cursor: pointer;
        }
        .rich-text-editor-wrapper .ql-picker-item:hover {
          background: #f3f4f6;
        }
        .rich-text-editor-wrapper .ql-picker-item.ql-selected {
          background: #e0e7ff;
          color: #4f46e5;
        }

        /* === Editor Container === */
        .rich-text-editor-wrapper .ql-container {
          min-height: ${minHeight};
          font-size: 0.875rem;
          font-family: inherit;
          border: 1px solid #d1d5db;
          border-radius: 0 0 0.375rem 0.375rem;
          background: #fff;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          max-height: 600px;
          overflow-y: auto;
          line-height: 1.6;
        }
        .rich-text-editor-wrapper .ql-editor img {
          max-width: 50%;
          height: auto;
          display: block;
          margin: 1rem 0;
          border-radius: 0.375rem;
        }
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
          left: 0.75rem;
        }

        /* === Dark Mode === */
        :global(.dark) .rich-text-editor-wrapper .ql-toolbar,
        .dark .rich-text-editor-wrapper .ql-toolbar {
          background: #1f2937;
          border-color: #4b5563;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-toolbar button:hover,
        .dark .rich-text-editor-wrapper .ql-toolbar button:hover {
          background: #374151;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-toolbar button.ql-active,
        .dark .rich-text-editor-wrapper .ql-toolbar button.ql-active {
          background: #312e81;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-container,
        .dark .rich-text-editor-wrapper .ql-container {
          background: #1f2937;
          border-color: #4b5563;
          color: #d1d5db;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-editor.ql-blank::before,
        .dark .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #6b7280;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-picker,
        .dark .rich-text-editor-wrapper .ql-picker {
          color: #d1d5db;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-picker-options,
        .dark .rich-text-editor-wrapper .ql-picker-options {
          background: #1f2937;
          border-color: #4b5563;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-picker-item:hover,
        .dark .rich-text-editor-wrapper .ql-picker-item:hover {
          background: #374151;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-picker-item.ql-selected,
        .dark .rich-text-editor-wrapper .ql-picker-item.ql-selected {
          background: #312e81;
          color: #a5b4fc;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-stroke,
        .dark .rich-text-editor-wrapper .ql-stroke {
          stroke: #d1d5db;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-fill,
        .dark .rich-text-editor-wrapper .ql-fill {
          fill: #d1d5db;
        }
        :global(.dark) .rich-text-editor-wrapper .ql-picker-label,
        .dark .rich-text-editor-wrapper .ql-picker-label {
          color: #d1d5db;
        }
      `}</style>
    </div>
  );
}
