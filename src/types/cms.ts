// ============================================================
// CMS TYPE DEFINITIONS
// ============================================================
// Shared types used across admin dashboard and public frontends.
// These mirror the Convex schema but are usable in React components.
// ============================================================

import { Id } from "../../convex/_generated/dataModel";

// ── Block Content Types ────────────────────────────────────
export type HeroContent = {
  type: "hero";
  heading: string;
  subheading?: string;
  backgroundImage?: string;
  ctaText?: string;
  ctaLink?: string;
  alignment?: "left" | "center" | "right";
};

export type TextContent = {
  type: "text";
  body: string;
  maxLength?: number;
};

export type ImageContent = {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

export type CTAContent = {
  type: "cta";
  heading?: string;
  description?: string;
  buttonText: string;
  buttonLink: string;
  variant?: "primary" | "secondary" | "outline";
};

export type BlockContent = HeroContent | TextContent | ImageContent | CTAContent;
export type BlockType = BlockContent["type"];

// ── Layout Config ──────────────────────────────────────────
export type BlockLayout = {
  width?: "narrow" | "medium" | "full";
  padding?: "none" | "sm" | "md" | "lg";
  background?: string;
};

// ── Full Block ─────────────────────────────────────────────
export type Block = {
  _id: Id<"blocks">;
  _creationTime: number;
  pageId: Id<"pages">;
  content: BlockContent;
  layout: BlockLayout;
  isStructureLocked: boolean;
  createdBy: Id<"users">;
  updatedBy?: Id<"users">;
};

// ── Page ───────────────────────────────────────────────────
export type PageSEO = {
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
};

export type Page = {
  _id: Id<"pages">;
  _creationTime: number;
  title: string;
  slug: string;
  description?: string;
  status: "draft" | "published" | "archived";
  seo: PageSEO;
  blockOrder: Id<"blocks">[];
  headerOverride?: Id<"globalSections">;
  footerOverride?: Id<"globalSections">;
  publishedAt?: number;
  createdBy: Id<"users">;
  updatedBy?: Id<"users">;
};

export type HydratedPage = Page & {
  blocks: Block[];
};

// ── Global Sections ────────────────────────────────────────
export type GlobalSection = {
  _id: Id<"globalSections">;
  _creationTime: number;
  name: string;
  slug: string;
  type: "header" | "footer" | "cta" | "custom";
  content: BlockContent;
  isDefault: boolean;
  createdBy: Id<"users">;
  updatedBy?: Id<"users">;
};

// ── User ───────────────────────────────────────────────────
export type UserRole = "admin" | "editor";

export type User = {
  _id: Id<"users">;
  name: string;
  email: string;
  role: UserRole;
};

// ── Project ────────────────────────────────────────────────
export type Project = {
  _id: Id<"projects">;
  _creationTime: number;
  slug: string;
  title: string;
  location?: string;
  year?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  brief?: string;
  solution?: string;
  outcome?: string;
  size?: string;
  stage?: string;
  constraints?: string;
  approach?: string;
  gallery?: string[];
  isPublished: boolean;
  order?: number;
};

// ── Service ────────────────────────────────────────────────
export type Service = {
  _id: Id<"services">;
  _creationTime: number;
  slug: string;
  title: string;
  description?: string;
  deliverables?: string[];
  timeline?: string;
  icon?: string;
  isPublished: boolean;
  order?: number;
};

// ── Testimonial ──────────────────────────────────────────
export type Testimonial = {
  _id: Id<"testimonials">;
  _creationTime: number;
  quote: string;
  author: string;
  project?: string;
  role?: string;
  avatar?: string;
  isPublished: boolean;
  order?: number;
};

// ── FAQ ───────────────────────────────────────────────────
export type FAQ = {
  _id: Id<"faqs">;
  _creationTime: number;
  question: string;
  answer: string;
  category?: string;
  isPublished: boolean;
  order?: number;
};

// ── Site Settings ────────────────────────────────────────
export type SiteSettings = {
  _id: Id<"siteSettings">;
  _creationTime: number;
  key: string;
  siteName?: string;
  tagline?: string;
  description?: string;
  logo?: string;
  favicon?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    youtube?: string;
  };
};

// ── Public Page Response (from getBySlug) ──────────────────
export type PublicPage = {
  _id: Id<"pages">;
  title: string;
  slug: string;
  seo: PageSEO;
  blocks: Block[];
  header: GlobalSection | null;
  footer: GlobalSection | null;
  publishedAt?: number;
};
