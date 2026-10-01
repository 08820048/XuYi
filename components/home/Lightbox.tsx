"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";

type OpenFn = (src: string, alt: string) => void;

const LightboxContext = createContext<OpenFn>(() => {});

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const open = useCallback<OpenFn>((src, alt) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setImage({ src, alt });
  }, []);

  const close = useCallback(() => {
    setImage(null);
    lastFocus.current?.focus();
  }, []);

  useEffect(() => {
    if (!image) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [image, close]);

  return (
    <LightboxContext.Provider value={open}>
      {children}
      <div
        className="pf-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        hidden={!image}
        onClick={close}
      >
        <button ref={closeBtnRef} className="pf-lightbox-close" type="button" aria-label="关闭预览" onClick={close}>
          ×
        </button>
        {image && <img src={image.src} alt={image.alt} />}
      </div>
    </LightboxContext.Provider>
  );
}

export function ZoomImage({ alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const open = useContext(LightboxContext);

  return (
    <img
      {...rest}
      alt={alt}
      tabIndex={0}
      role="button"
      aria-label={`${alt || "图片"}，点击放大查看`}
      onClick={(e) => {
        const el = e.currentTarget;
        open(el.currentSrc || el.src, alt);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const el = e.currentTarget;
          open(el.currentSrc || el.src, alt);
        }
      }}
    />
  );
}
