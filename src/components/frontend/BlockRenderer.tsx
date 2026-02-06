"use client";

// ============================================================
// BLOCK RENDERER
// ============================================================
// This is the heart of the public frontend. It takes a Block
// and renders the correct component based on its content type.
// Because the parent uses useQuery, this re-renders instantly
// when content changes in the CMS.
// ============================================================

import type { Block, BlockLayout } from "@/types/cms";

// ── Layout wrapper ─────────────────────────────────────────
function BlockWrapper({
  layout,
  children,
}: {
  layout: BlockLayout;
  children: React.ReactNode;
}) {
  const widthClass = {
    narrow: "max-w-2xl",
    medium: "max-w-4xl",
    full: "max-w-full",
  }[layout.width ?? "medium"];

  const paddingClass = {
    none: "py-0",
    sm: "py-4",
    md: "py-8",
    lg: "py-16",
  }[layout.padding ?? "md"];

  return (
    <section
      className={`mx-auto px-4 ${widthClass} ${paddingClass}`}
      style={layout.background ? { backgroundColor: layout.background } : undefined}
    >
      {children}
    </section>
  );
}

// ── Hero Block ─────────────────────────────────────────────
function HeroBlock({ content }: { content: Extract<Block["content"], { type: "hero" }> }) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[content.alignment ?? "center"];

  return (
    <div
      className={`relative min-h-[60vh] flex items-center justify-center ${alignClass}`}
      style={
        content.backgroundImage
          ? {
              backgroundImage: `url(${content.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {content.backgroundImage && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10 px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          {content.heading}
        </h1>
        {content.subheading && (
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            {content.subheading}
          </p>
        )}
        {content.ctaText && content.ctaLink && (
          <a
            href={content.ctaLink}
            className="inline-block px-8 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            {content.ctaText}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Text Block ─────────────────────────────────────────────
function TextBlock({ content }: { content: Extract<Block["content"], { type: "text" }> }) {
  return (
    <div
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: content.body }}
    />
  );
}

// ── Image Block ────────────────────────────────────────────
function ImageBlock({ content }: { content: Extract<Block["content"], { type: "image" }> }) {
  return (
    <figure>
      <img
        src={content.src}
        alt={content.alt}
        width={content.width}
        height={content.height}
        className="w-full h-auto rounded-lg"
        loading="lazy"
      />
      {content.caption && (
        <figcaption className="mt-2 text-sm text-gray-500 text-center">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}

// ── CTA Block ──────────────────────────────────────────────
function CTABlock({ content }: { content: Extract<Block["content"], { type: "cta" }> }) {
  const variantClass = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-800 text-white hover:bg-gray-900",
    outline: "border-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white",
  }[content.variant ?? "primary"];

  return (
    <div className="text-center py-8">
      {content.heading && (
        <h2 className="text-3xl font-bold mb-4">{content.heading}</h2>
      )}
      {content.description && (
        <p className="text-lg text-gray-600 mb-6 max-w-xl mx-auto">
          {content.description}
        </p>
      )}
      <a
        href={content.buttonLink}
        className={`inline-block px-8 py-3 font-semibold rounded-lg transition-colors ${variantClass}`}
      >
        {content.buttonText}
      </a>
    </div>
  );
}

// ── Main Renderer ──────────────────────────────────────────
export function BlockRenderer({ block }: { block: Block }) {
  const { content, layout } = block;

  let inner: React.ReactNode;
  switch (content.type) {
    case "hero":
      // Hero blocks ignore the wrapper — they're full-bleed
      return <HeroBlock content={content} />;
    case "text":
      inner = <TextBlock content={content} />;
      break;
    case "image":
      inner = <ImageBlock content={content} />;
      break;
    case "cta":
      inner = <CTABlock content={content} />;
      break;
    default:
      inner = <div className="text-red-500">Unknown block type</div>;
  }

  return <BlockWrapper layout={layout}>{inner}</BlockWrapper>;
}

// ── Global Section Renderer ────────────────────────────────
export function GlobalSectionRenderer({
  section,
}: {
  section: { content: Block["content"] } | null;
}) {
  if (!section) return null;
  const { content } = section;

  // Render based on content type with appropriate wrapper styling
  switch (content.type) {
    case "cta":
      return (
        <nav className="w-full bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <span className="font-bold text-lg">{content.heading ?? ""}</span>
            {content.buttonText && (
              <a
                href={content.buttonLink}
                className="px-4 py-2 bg-white text-gray-900 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                {content.buttonText}
              </a>
            )}
          </div>
        </nav>
      );
    case "text":
      return (
        <footer className="w-full bg-gray-100 border-t">
          <div
            className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-600"
            dangerouslySetInnerHTML={{ __html: content.body }}
          />
        </footer>
      );
    default:
      return null;
  }
}
