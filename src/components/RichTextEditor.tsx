"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string;
  onChange: (nextHtml: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  onUploadImage: (file: File) => Promise<string | null>;
}

export default function RichTextEditor({ value, onChange, placeholder, ariaLabel, onUploadImage }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Only update DOM when external value differs from innerHTML to avoid cursor jumps
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  function exec(cmd: string, valueArg?: string) {
    try {
      document.execCommand(cmd, false, valueArg);
      // sync after exec
      const el = editorRef.current;
      if (el) onChange(el.innerHTML);
    } catch {
      // ignore
    }
  }

  function insertHtmlAtCursor(html: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (document.getSelection && document.getSelection()?.getRangeAt && document.getSelection()!.rangeCount) {
      const range = document.getSelection()!.getRangeAt(0);
      range.deleteContents();
      const temp = document.createElement("div");
      temp.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node: ChildNode | null = null;
      let lastNode: ChildNode | null = null;
      while ((node = temp.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    } else {
      el.innerHTML += html; // fallback
    }
    onChange(editorRef.current?.innerHTML || "");
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items || [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && it.type.startsWith("image/")) {
        e.preventDefault();
        const file = it.getAsFile();
        if (!file) return;
        
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const placeholderId = `img-${Date.now()}`;
          insertHtmlAtCursor(`<img id="${placeholderId}" src="${dataUrl}" alt="Uploading..." style="width:360px;max-width:100%;height:auto;border-radius:8px;" />`);
          
          // Upload in background and replace
          onUploadImage(file).then((url) => {
            if (url && editorRef.current) {
              const placeholder = editorRef.current.querySelector(`#${placeholderId}`) as HTMLImageElement;
              if (placeholder) {
                placeholder.src = url;
                placeholder.style.opacity = "1";
                placeholder.setAttribute("loading", "lazy");
                placeholder.removeAttribute("id");
              }
              onChange(editorRef.current.innerHTML);
            }
          });
        };
        reader.readAsDataURL(file);
        return;
      }
    }
    const files = e.clipboardData?.files || [];
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      e.preventDefault();
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const placeholderId = `img-${Date.now()}`;
        insertHtmlAtCursor(`<img id="${placeholderId}" src="${dataUrl}" alt="Uploading..." style="width:360px;max-width:100%;height:auto;border-radius:8px;" />`);
        
        onUploadImage(file).then((url) => {
          if (url && editorRef.current) {
            const placeholder = editorRef.current.querySelector(`#${placeholderId}`) as HTMLImageElement;
            if (placeholder) {
              placeholder.src = url;
              placeholder.style.opacity = "1";
              placeholder.setAttribute("loading", "lazy");
              placeholder.removeAttribute("id");
            }
            onChange(editorRef.current.innerHTML);
          }
        });
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const placeholderId = `img-${Date.now()}`;
        insertHtmlAtCursor(`<img id="${placeholderId}" src="${dataUrl}" alt="Uploading..." style="width:360px;max-width:100%;height:auto;border-radius:8px;" />`);
        
        onUploadImage(file).then((url) => {
          if (url && editorRef.current) {
            const placeholder = editorRef.current.querySelector(`#${placeholderId}`) as HTMLImageElement;
            if (placeholder) {
              placeholder.src = url;
              placeholder.style.opacity = "1";
              placeholder.setAttribute("loading", "lazy");
              placeholder.removeAttribute("id");
            }
            onChange(editorRef.current.innerHTML);
          }
        });
      };
      reader.readAsDataURL(file);
    }
  }

  function swallowDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function triggerFile() {
    fileInputRef.current?.click();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const placeholderId = `img-${Date.now()}`;
      insertHtmlAtCursor(`<img id="${placeholderId}" src="${dataUrl}" alt="Uploading..." style="max-width:100%;height:auto;border-radius:8px;opacity:0.6;" />`);
      
      onUploadImage(file).then((url) => {
        if (url && editorRef.current) {
          const placeholder = editorRef.current.querySelector(`#${placeholderId}`) as HTMLImageElement;
          if (placeholder) {
            placeholder.src = url;
            placeholder.style.opacity = "1";
            placeholder.removeAttribute("id");
          }
          onChange(editorRef.current.innerHTML);
        }
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" onClick={() => exec("bold")}>Bold</Button>
        <Button type="button" variant="outline" onClick={() => exec("italic")}>Italic</Button>
        <Button type="button" variant="outline" onClick={() => exec("underline")}>Underline</Button>
        <Button type="button" variant="outline" onClick={() => exec("insertUnorderedList")}>• List</Button>
        <Button type="button" variant="outline" onClick={() => exec("insertOrderedList")}>1. List</Button>
        <Button type="button" onClick={triggerFile}>Insert Image</Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      </div>
      <style>{`.rte-content img{width:320px;max-width:100%;height:auto;border-radius:8px;image-rendering:auto}`}</style>
      <div
        ref={editorRef}
        className="rte-content w-full min-h-40 rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        role="textbox"
        aria-label={ariaLabel || placeholder || "Rich text editor"}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={swallowDrag}
      />
      {(!value || value === "<p><br></p>" || value.replace(/<[^>]*>/g, "").trim() === "") && (
        <div className="pointer-events-none -mt-12 ml-4 text-gray-400 text-sm">{placeholder}</div>
      )}
    </div>
  );
}


