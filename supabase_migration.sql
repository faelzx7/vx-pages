-- ──────────────────────────────────────────────────────────
-- VX Pages — Migration: Fase 1 (publicação + links)
-- Rode no SQL Editor do Supabase (uma vez)
-- ──────────────────────────────────────────────────────────

-- 1. Novas colunas na tabela pages
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS slug         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS published    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp     TEXT,
  ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- 2. Índice para busca por slug (rota /p/:slug)
CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_idx ON pages (slug) WHERE slug IS NOT NULL;

-- 3. Função para incrementar views (chamada de forma assíncrona pela rota pública)
--    Se a coluna views não existir, cria antes.
ALTER TABLE pages ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_page_views(page_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pages SET views = views + 1 WHERE slug = page_slug AND published = true;
END;
$$;
