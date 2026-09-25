-- ============================================================
-- PANCHO DA FRONTEIRA — SCHEMA SUPABASE
-- Execute no Supabase SQL Editor
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM (
      'recebido',
      'confirmado',
      'preparando',
      'pronto',
      'saiu_para_entrega',
      'entregue',
      'cancelado'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_type') THEN
    CREATE TYPE public.delivery_type AS ENUM ('entrega', 'retirada');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM (
      'dinheiro',
      'pix',
      'cartao_debito',
      'cartao_credito'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('customer', 'admin', 'manager');
  END IF;
END $$;

-- ============================================================
-- TABELA: PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome        TEXT,
    telefone    TEXT,
    avatar_url  TEXT,
    role        user_role NOT NULL DEFAULT 'customer',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,
    image_url   TEXT,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    description TEXT,
    price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    image_url   TEXT,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    featured    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: ADDRESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label           TEXT,
    street          TEXT NOT NULL,
    number          TEXT NOT NULL,
    complement      TEXT,
    neighborhood    TEXT NOT NULL,
    city            TEXT NOT NULL DEFAULT 'Uruguaiana',
    state           TEXT NOT NULL DEFAULT 'RS',
    zip_code        TEXT,
    reference       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number        TEXT NOT NULL UNIQUE,
    user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name       TEXT NOT NULL,
    customer_phone      TEXT NOT NULL,
    delivery_type       delivery_type NOT NULL DEFAULT 'entrega',
    address_id          UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    address_snapshot    JSONB,
    payment_method      payment_method NOT NULL DEFAULT 'dinheiro',
    subtotal            NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
    total               NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes               TEXT,
    status              order_status NOT NULL DEFAULT 'recebido',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: ORDER_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name    TEXT NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price      NUMERIC(10,2) NOT NULL,
    subtotal        NUMERIC(10,2) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: ORDER_STATUS_HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status      order_status NOT NULL,
    notes       TEXT,
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: STORE_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                TEXT NOT NULL DEFAULT 'Pancho da Fronteira',
    phone               TEXT,
    whatsapp            TEXT,
    email               TEXT,
    address             TEXT,
    city                TEXT,
    state               TEXT,
    instagram           TEXT,
    facebook            TEXT,
    description         TEXT,
    logo_url            TEXT,
    delivery_fee        NUMERIC(10,2) NOT NULL DEFAULT 6.90,
    min_order_value     NUMERIC(10,2) NOT NULL DEFAULT 0,
    opening_hours       JSONB DEFAULT '{"segunda":{"open":"18:00","close":"23:00","active":true},"terca":{"open":"18:00","close":"23:00","active":true},"quarta":{"open":"18:00","close":"23:00","active":true},"quinta":{"open":"18:00","close":"23:00","active":true},"sexta":{"open":"18:00","close":"23:00","active":true},"sabado":{"open":"18:00","close":"23:00","active":true},"domingo":{"open":"18:00","close":"23:00","active":true}}',
    store_open          BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNÇÃO: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_store_settings_updated_at
    BEFORE UPDATE ON public.store_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNÇÃO: Criar profile automaticamente ao criar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nome, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        'customer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNÇÃO: Gerar número amigável do pedido (#PF-XXXX)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := '#PF-' || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- ============================================================
-- FUNÇÃO: Registrar histórico de status automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_history (order_id, status)
        VALUES (NEW.id, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_status_change
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_status_history_order ON public.order_status_history(order_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- HELPER: verificar se usuário é admin
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'manager')
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- POLICIES: PROFILES
-- ============================================================
DROP POLICY IF EXISTS "Usuário pode ver próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin pode ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuário pode atualizar próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin pode atualizar qualquer perfil" ON public.profiles;

CREATE POLICY "Usuário pode ver próprio perfil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admin pode ver todos os perfis"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Usuário pode atualizar próprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = 'customer');

CREATE POLICY "Admin pode atualizar qualquer perfil"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());

-- ============================================================
-- POLICIES: CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "Qualquer um pode ver categorias ativas" ON public.categories;
DROP POLICY IF EXISTS "Admin pode ver todas as categorias" ON public.categories;
DROP POLICY IF EXISTS "Admin pode inserir categorias" ON public.categories;
DROP POLICY IF EXISTS "Admin pode atualizar categorias" ON public.categories;
DROP POLICY IF EXISTS "Admin pode excluir categorias" ON public.categories;

CREATE POLICY "Qualquer um pode ver categorias ativas"
    ON public.categories FOR SELECT
    USING (active = TRUE);

CREATE POLICY "Admin pode ver todas as categorias"
    ON public.categories FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admin pode inserir categorias"
    ON public.categories FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode atualizar categorias"
    ON public.categories FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admin pode excluir categorias"
    ON public.categories FOR DELETE
    USING (public.is_admin());

-- ============================================================
-- POLICIES: PRODUCTS
-- ============================================================
DROP POLICY IF EXISTS "Qualquer um pode ver produtos ativos" ON public.products;
DROP POLICY IF EXISTS "Admin pode ver todos os produtos" ON public.products;
DROP POLICY IF EXISTS "Admin pode inserir produtos" ON public.products;
DROP POLICY IF EXISTS "Admin pode atualizar produtos" ON public.products;
DROP POLICY IF EXISTS "Admin pode excluir produtos" ON public.products;

CREATE POLICY "Qualquer um pode ver produtos ativos"
    ON public.products FOR SELECT
    USING (active = TRUE);

CREATE POLICY "Admin pode ver todos os produtos"
    ON public.products FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admin pode inserir produtos"
    ON public.products FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode atualizar produtos"
    ON public.products FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admin pode excluir produtos"
    ON public.products FOR DELETE
    USING (public.is_admin());

-- ============================================================
-- POLICIES: ADDRESSES
-- ============================================================
DROP POLICY IF EXISTS "Usuário pode ver próprios endereços" ON public.addresses;
DROP POLICY IF EXISTS "Admin pode ver todos os endereços" ON public.addresses;
DROP POLICY IF EXISTS "Usuário pode criar endereço" ON public.addresses;
DROP POLICY IF EXISTS "Usuário pode atualizar próprio endereço" ON public.addresses;
DROP POLICY IF EXISTS "Usuário pode excluir próprio endereço" ON public.addresses;

CREATE POLICY "Usuário pode ver próprios endereços"
    ON public.addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin pode ver todos os endereços"
    ON public.addresses FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Usuário pode criar endereço"
    ON public.addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode atualizar próprio endereço"
    ON public.addresses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuário pode excluir próprio endereço"
    ON public.addresses FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: ORDERS
-- ============================================================
DROP POLICY IF EXISTS "Usuário pode ver próprios pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admin pode ver todos os pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuário autenticado ou visitante pode criar pedido" ON public.orders;
DROP POLICY IF EXISTS "Admin pode atualizar qualquer pedido" ON public.orders;

CREATE POLICY "Usuário pode ver próprios pedidos"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin pode ver todos os pedidos"
    ON public.orders FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Usuário autenticado ou visitante pode criar pedido"
    ON public.orders FOR INSERT
    WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Admin pode atualizar qualquer pedido"
    ON public.orders FOR UPDATE
    USING (public.is_admin());

-- ============================================================
-- POLICIES: ORDER_ITEMS
-- ============================================================
DROP POLICY IF EXISTS "Usuário pode ver próprios itens" ON public.order_items;
DROP POLICY IF EXISTS "Admin pode ver todos os itens" ON public.order_items;
DROP POLICY IF EXISTS "Usuário pode inserir itens em seu pedido ou pedido sem conta" ON public.order_items;

CREATE POLICY "Usuário pode ver próprios itens"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin pode ver todos os itens"
    ON public.order_items FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Usuário pode inserir itens em seu pedido ou pedido sem conta"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id IS NULL OR orders.user_id = auth.uid())
        )
    );

-- ============================================================
-- POLICIES: ORDER_STATUS_HISTORY
-- ============================================================
DROP POLICY IF EXISTS "Usuário pode ver histórico de seus pedidos" ON public.order_status_history;
DROP POLICY IF EXISTS "Admin pode ver todo o histórico" ON public.order_status_history;
DROP POLICY IF EXISTS "Admin pode inserir histórico" ON public.order_status_history;

CREATE POLICY "Usuário pode ver histórico de seus pedidos"
    ON public.order_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_status_history.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin pode ver todo o histórico"
    ON public.order_status_history FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admin pode inserir histórico"
    ON public.order_status_history FOR INSERT
    WITH CHECK (public.is_admin());

-- ============================================================
-- POLICIES: STORE_SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "Qualquer um pode ver configurações da loja" ON public.store_settings;
DROP POLICY IF EXISTS "Admin pode atualizar configurações" ON public.store_settings;
DROP POLICY IF EXISTS "Admin pode inserir configurações" ON public.store_settings;

CREATE POLICY "Qualquer um pode ver configurações da loja"
    ON public.store_settings FOR SELECT
    USING (TRUE);

CREATE POLICY "Admin pode atualizar configurações"
    ON public.store_settings FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admin pode inserir configurações"
    ON public.store_settings FOR INSERT
    WITH CHECK (public.is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Execute no painel do Supabase Storage:
-- Criar buckets: products, avatars, branding
-- Configurar como público: products, branding
-- Configurar como privado: avatars (com signed URLs)

-- ============================================================
-- DADOS INICIAIS: STORE SETTINGS
-- ============================================================
INSERT INTO public.store_settings (
    name, phone, whatsapp, address, city, state,
    description, delivery_fee, min_order_value
) VALUES (
    'Pancho da Fronteira',
    NULL,
    NULL,
    'Rua das Fronteiras, 245 • Centro',
    'Uruguaiana',
    'RS',
    'Panchos preparados com carinho, sabor e aquele toque especial que faz você querer voltar.',
    6.90,
    0
);
