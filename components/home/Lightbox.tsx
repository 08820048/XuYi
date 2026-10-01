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
  type VideoHTMLAttributes,
} from "react";

type Media = { src: string; alt: string; video: boolean };
type OpenFn = (src: string, alt: string, video?: boolean) => void;

const LightboxContext = createContext<OpenFn>(() => {});

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [media, setMedia] = useState<Media | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const open = useCallback<OpenFn>((src, alt, video = false) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setMedia({ src, alt, video });
  }, []);

  const close = useCallback(() => {
    setMedia(null);
    lastFocus.current?.focus();
  }, []);

  useEffect(() => {
    if (!media) {
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
  }, [media, close]);

  return (
    <LightboxContext.Provider value={open}>
      {children}
      <div
        className="pf-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="媒体预览"
        hidden={!media}
        onClick={close}
      >
        <button ref={closeBtnRef} className="pf-lightbox-close" type="button" aria-label="关闭预览" onClick={close}>
          ×
        </button>
        {media &&
          (media.video ? (
            <video src={media.src} controls autoPlay loop playsInline onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={media.src} alt={media.alt} />
          ))}
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

export function ZoomVideo({ alt = "", ...rest }: VideoHTMLAttributes<HTMLVideoElement> & { alt?: string }) {
  const open = useContext(LightboxContext);

  return (
    <video
      {...rest}
      muted
      loop
      autoPlay
      playsInline
      tabIndex={0}
      role="button"
      aria-label={`${alt || "视频"}，点击放大查看`}
      onClick={(e) => {
        const el = e.currentTarget;
        open(el.currentSrc || el.src, alt, true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const el = e.currentTarget;
          open(el.currentSrc || el.src, alt, true);
        }
      }}
    />
  );
}
