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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

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
    delivery_fee        NUMERIC(10,2) DEFAULT 0,
    delivery_fee_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (delivery_fee_status IN ('confirmed', 'pending')),
    total               NUMERIC(10,2) DEFAULT 0,
    notes               TEXT,
    status              order_status NOT NULL DEFAULT 'recebido',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_token UUID NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

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
    selected_options JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(selected_options) = 'array'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_options JSONB NOT NULL DEFAULT '[]'::jsonb;

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
    delivery_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery_zones      JSONB NOT NULL DEFAULT '[{"name":"Loteamento Jardins 1","aliases":["Jardins 1","Loteamento Jardins 1"],"fee_type":"FREE","fee":0,"active":true},{"name":"Loteamento Jardins 2","aliases":["Jardins 2","Loteamento Jardins 2"],"fee_type":"FREE","fee":0,"active":true},{"name":"Loteamento Jardins 3","aliases":["Jardins 3","Loteamento Jardins 3"],"fee_type":"FREE","fee":0,"active":true},{"name":"Parque das Rosas","aliases":["Parque das Rosas"],"fee_type":"FREE","fee":0,"active":true},{"name":"Tabuleiro","aliases":["Tabuleiro"],"fee_type":"FREE","fee":0,"active":true},{"name":"Bela Vista","aliases":["Bela Vista"],"fee_type":"FIXED","fee":5,"active":true},{"name":"Demais localidades","aliases":[],"fee_type":"CONSULT","fee":null,"active":true}]'::jsonb,
    min_order_value     NUMERIC(10,2) NOT NULL DEFAULT 0,
    opening_hours       JSONB NOT NULL DEFAULT '{"segunda":{"open":null,"close":null,"active":null,"configured":false},"terca":{"open":null,"close":null,"active":false},"quarta":{"open":null,"close":null,"active":true},"quinta":{"open":null,"close":null,"active":true},"sexta":{"open":null,"close":null,"active":true},"sabado":{"open":null,"close":null,"active":true},"domingo":{"open":null,"close":null,"active":false}}'::jsonb,
    opening_exceptions  JSONB NOT NULL DEFAULT '[{"type":"first_saturday_closed","active":true}]'::jsonb,
    store_open          BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '[{"id":"dinheiro","label":"Dinheiro","enabled":true},{"id":"pix","label":"PIX","enabled":true},{"id":"cartao_debito","label":"Cartão de débito","enabled":true},{"id":"cartao_credito","label":"Cartão de crédito","enabled":true}]'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS whatsapp_settings JSONB NOT NULL DEFAULT '{"provider":"meta","enabled":false,"language":"pt_BR","templates":{}}'::jsonb;

-- Grupos de opções reutilizáveis (molhos, tamanhos, adicionais, acompanhamentos).
CREATE TABLE IF NOT EXISTS public.option_groups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    selection_type  TEXT NOT NULL DEFAULT 'multiple' CHECK (selection_type IN ('single', 'multiple')),
    required        BOOLEAN NOT NULL DEFAULT FALSE,
    min_selection   INTEGER NOT NULL DEFAULT 0 CHECK (min_selection >= 0),
    max_selection   INTEGER NOT NULL DEFAULT 99 CHECK (max_selection >= min_selection),
    options         JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(options) = 'array'),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_option_groups (
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    group_id    UUID NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, group_id)
);

-- Permite registrar um pedido cujo bairro exige confirmação manual da taxa.
ALTER TABLE public.orders ALTER COLUMN delivery_fee DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN total DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee_status TEXT NOT NULL DEFAULT 'confirmed';

-- Mantém bancos existentes compatíveis com a configuração operacional por loja.
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS delivery_zones JSONB NOT NULL DEFAULT '[{"name":"Loteamento Jardins 1","aliases":["Jardins 1","Loteamento Jardins 1"],"fee_type":"FREE","fee":0,"active":true},{"name":"Loteamento Jardins 2","aliases":["Jardins 2","Loteamento Jardins 2"],"fee_type":"FREE","fee":0,"active":true},{"name":"Loteamento Jardins 3","aliases":["Jardins 3","Loteamento Jardins 3"],"fee_type":"FREE","fee":0,"active":true},{"name":"Parque das Rosas","aliases":["Parque das Rosas"],"fee_type":"FREE","fee":0,"active":true},{"name":"Tabuleiro","aliases":["Tabuleiro"],"fee_type":"FREE","fee":0,"active":true},{"name":"Bela Vista","aliases":["Bela Vista"],"fee_type":"FIXED","fee":5,"active":true},{"name":"Demais localidades","aliases":[],"fee_type":"CONSULT","fee":null,"active":true}]'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS opening_hours JSONB NOT NULL DEFAULT '{"segunda":{"open":null,"close":null,"active":null,"configured":false},"terca":{"open":null,"close":null,"active":false},"quarta":{"open":null,"close":null,"active":true},"quinta":{"open":null,"close":null,"active":true},"sexta":{"open":null,"close":null,"active":true},"sabado":{"open":null,"close":null,"active":true},"domingo":{"open":null,"close":null,"active":false}}'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS opening_exceptions JSONB NOT NULL DEFAULT '[{"type":"first_saturday_closed","active":true}]'::jsonb;


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
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_option_groups_updated_at ON public.option_groups;
CREATE TRIGGER set_option_groups_updated_at
    BEFORE UPDATE ON public.option_groups
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_addresses_updated_at ON public.addresses;
CREATE TRIGGER set_addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER set_store_settings_updated_at
    BEFORE UPDATE ON public.store_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNÇÃO: Criar profile automaticamente ao criar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nome, telefone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        NULLIF(NEW.raw_user_meta_data->>'telefone', ''),
        'customer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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

DROP TRIGGER IF EXISTS set_order_number ON public.orders;
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

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- Atualiza o status e registra o motivo no mesmo evento de histórico.
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id UUID,
    p_status public.order_status,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem atualizar pedidos.';
    END IF;
    IF p_status = 'cancelado' AND NULLIF(BTRIM(p_notes), '') IS NULL THEN
        RAISE EXCEPTION 'Informe o motivo do cancelamento.';
    END IF;

    UPDATE public.orders SET status = p_status WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;

    IF p_status = 'cancelado' THEN
        UPDATE public.order_status_history
        SET notes = BTRIM(p_notes)
        WHERE order_id = p_order_id AND status = p_status AND notes IS NULL;
        IF NOT FOUND THEN
            INSERT INTO public.order_status_history (order_id, status, notes, created_by)
            VALUES (p_order_id, p_status, BTRIM(p_notes), auth.uid());
        END IF;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_status(UUID, public.order_status, TEXT) FROM PUBLIC;

-- Operational notifications and secure guest tracking (additive migration).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '[{"id":"dinheiro","label":"Dinheiro","enabled":true},{"id":"pix","label":"PIX","enabled":true},{"id":"cartao_debito","label":"Cartão de débito","enabled":true},{"id":"cartao_credito","label":"Cartão de crédito","enabled":true}]'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS whatsapp_settings JSONB NOT NULL DEFAULT '{"provider":"meta","enabled":false,"language":"pt_BR","templates":{}}'::jsonb;

CREATE OR REPLACE FUNCTION public.create_order_with_items(p_order JSONB, p_items JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders; v_user_id UUID; v_subtotal NUMERIC(10,2); v_fee NUMERIC(10,2); v_total NUMERIC(10,2);
BEGIN
    v_user_id := NULLIF(p_order->>'user_id','')::UUID;
    IF v_user_id IS NOT NULL AND v_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Não é permitido criar pedido para outra conta.';
    END IF;
    IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_user_id) THEN
        RAISE EXCEPTION 'Perfil de cliente não encontrado.';
    END IF;
    IF NULLIF(BTRIM(p_order->>'customer_name'),'') IS NULL OR NULLIF(BTRIM(p_order->>'customer_phone'),'') IS NULL THEN
        RAISE EXCEPTION 'Informe nome e telefone para o pedido.';
    END IF;
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items)=0 THEN
        RAISE EXCEPTION 'O pedido precisa conter produtos.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_items) item
        WHERE NULLIF(BTRIM(item->>'product_name'),'') IS NULL
           OR CASE WHEN COALESCE(item->>'quantity','') ~ '^\d+$' THEN (item->>'quantity')::INTEGER <= 0 ELSE TRUE END
           OR CASE WHEN COALESCE(item->>'unit_price','') ~ '^\d+(\.\d{1,2})?$' THEN (item->>'unit_price')::NUMERIC < 0 ELSE TRUE END
           OR jsonb_typeof(COALESCE(item->'selected_options','[]'::jsonb)) <> 'array'
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(item->'selected_options','[]'::jsonb)) opt WHERE CASE WHEN COALESCE(opt->>'price_delta','') ~ '^\d+(\.\d{1,2})?$' THEN (opt->>'price_delta')::NUMERIC < 0 ELSE TRUE END)
    ) THEN RAISE EXCEPTION 'Um ou mais itens do pedido são inválidos.'; END IF;

    SELECT COALESCE(SUM(((item->>'unit_price')::NUMERIC + COALESCE((SELECT SUM((opt->>'price_delta')::NUMERIC) FROM jsonb_array_elements(COALESCE(item->'selected_options','[]'::jsonb)) opt),0)) * (item->>'quantity')::INTEGER),0)
      INTO v_subtotal FROM jsonb_array_elements(p_items) item;
    IF ROUND(v_subtotal,2) <> ROUND(COALESCE((p_order->>'subtotal')::NUMERIC,-1),2) THEN
        RAISE EXCEPTION 'O subtotal informado não corresponde aos itens.';
    END IF;
    v_fee := NULLIF(p_order->>'delivery_fee','')::NUMERIC;
    IF (p_order->>'delivery_type') = 'retirada' THEN
        IF v_fee IS DISTINCT FROM 0::NUMERIC THEN RAISE EXCEPTION 'Retirada não pode ter taxa de entrega.'; END IF;
        v_fee := 0;
    END IF;
    IF (p_order->>'delivery_type') = 'entrega' AND (p_order->'address_snapshot' IS NULL OR p_order->'address_snapshot' = 'null'::jsonb
        OR NULLIF(BTRIM(p_order->'address_snapshot'->>'street'),'') IS NULL
        OR NULLIF(BTRIM(p_order->'address_snapshot'->>'number'),'') IS NULL
        OR NULLIF(BTRIM(p_order->'address_snapshot'->>'neighborhood'),'') IS NULL) THEN
        RAISE EXCEPTION 'Informe o endereço completo para entrega.';
    END IF;
    v_total := CASE WHEN v_fee IS NULL THEN NULL ELSE v_subtotal + v_fee END;
    IF v_fee IS NOT NULL AND v_fee < 0 THEN RAISE EXCEPTION 'A taxa de entrega não é válida.'; END IF;
    IF (p_order->>'delivery_type') = 'entrega' AND v_fee IS NULL AND COALESCE(p_order->>'delivery_fee_status','pending') <> 'pending' THEN
        RAISE EXCEPTION 'A taxa de entrega pendente deve ser confirmada.';
    END IF;
    IF (p_order->>'delivery_type') = 'entrega' AND v_fee IS NOT NULL AND COALESCE(p_order->>'delivery_fee_status','confirmed') <> 'confirmed' THEN
        RAISE EXCEPTION 'Taxa confirmada deve usar status confirmado.';
    END IF;
    IF COALESCE((p_order->>'total') ~ '^\d+(\.\d{1,2})?$', false) IS FALSE AND v_total IS NOT NULL THEN
        RAISE EXCEPTION 'O total informado não é válido.';
    END IF;
    IF v_total IS NOT NULL AND (p_order->>'total') !~ '^\d+(\.\d{1,2})?$' THEN
        RAISE EXCEPTION 'O total informado não é válido.';
    END IF;
    IF v_total IS DISTINCT FROM NULLIF(p_order->>'total','')::NUMERIC THEN
        RAISE EXCEPTION 'O total informado não corresponde ao pedido.';
    END IF;

    INSERT INTO public.orders(user_id,customer_name,customer_phone,delivery_type,address_snapshot,payment_method,subtotal,delivery_fee,delivery_fee_status,total,notes,whatsapp_opt_in,status)
    VALUES(v_user_id,BTRIM(p_order->>'customer_name'),BTRIM(p_order->>'customer_phone'),(p_order->>'delivery_type')::public.delivery_type,
        p_order->'address_snapshot',(p_order->>'payment_method')::public.payment_method,v_subtotal,
        v_fee,CASE WHEN v_fee IS NULL THEN 'pending' ELSE 'confirmed' END,
        v_total,NULLIF(BTRIM(p_order->>'notes'),''),COALESCE((p_order->>'whatsapp_opt_in')::BOOLEAN,FALSE),'recebido')
    RETURNING * INTO v_order;

    INSERT INTO public.order_items(order_id,product_id,product_name,quantity,unit_price,subtotal,notes,selected_options)
    SELECT v_order.id,NULLIF(item->>'product_id','')::UUID,BTRIM(item->>'product_name'),(item->>'quantity')::INTEGER,
        (item->>'unit_price')::NUMERIC + COALESCE((SELECT SUM((opt->>'price_delta')::NUMERIC) FROM jsonb_array_elements(COALESCE(item->'selected_options','[]'::jsonb)) opt),0),
        ((item->>'unit_price')::NUMERIC + COALESCE((SELECT SUM((opt->>'price_delta')::NUMERIC) FROM jsonb_array_elements(COALESCE(item->'selected_options','[]'::jsonb)) opt),0)) * (item->>'quantity')::INTEGER,NULLIF(BTRIM(item->>'notes'),''),
        COALESCE(item->'selected_options','[]'::jsonb)
    FROM jsonb_array_elements(p_items) item
    WHERE NULLIF(BTRIM(item->>'product_name'),'') IS NOT NULL AND (item->>'quantity')::INTEGER > 0 AND (item->>'unit_price')::NUMERIC >= 0;

    IF NOT FOUND THEN RAISE EXCEPTION 'Não há itens válidos no pedido.'; END IF;
    RETURN jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,'tracking_token',v_order.tracking_token,'status',v_order.status,'created_at',v_order.created_at);
END; $$;
REVOKE ALL ON FUNCTION public.create_order_with_items(JSONB,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(JSONB,JSONB) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
    SELECT p.* FROM public.profiles p WHERE public.is_admin() ORDER BY p.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles(id,nome,telefone,whatsapp_opt_in,role)
    VALUES(NEW.id,NULL,NULLIF(BTRIM(NEW.raw_user_meta_data->>'telefone'),''),COALESCE((NEW.raw_user_meta_data->>'whatsapp_opt_in')::BOOLEAN,FALSE),'customer')
    ON CONFLICT(id) DO UPDATE SET telefone=EXCLUDED.telefone, whatsapp_opt_in=EXCLUDED.whatsapp_opt_in;
    RETURN NEW;
END; $$;

-- Replace the original permissive profile update grants with column-scoped access.


CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id UUID, p_status public.order_status, p_notes TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current public.order_status; v_delivery public.delivery_type;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem atualizar pedidos.'; END IF;
    SELECT status, delivery_type INTO v_current, v_delivery FROM public.orders WHERE id=p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
    IF v_current IN ('entregue','cancelado') THEN RAISE EXCEPTION 'Este pedido já foi finalizado.'; END IF;
    IF p_status='cancelado' AND NULLIF(BTRIM(p_notes),'') IS NULL THEN RAISE EXCEPTION 'Informe o motivo do cancelamento.'; END IF;

    IF p_status <> 'cancelado' AND NOT (
        (v_current IN ('recebido','confirmado') AND p_status='preparando') OR
        (v_current='preparando' AND p_status='pronto') OR
        (v_current='pronto' AND p_status='saiu_para_entrega' AND v_delivery='entrega') OR
        (v_current='pronto' AND p_status='entregue' AND v_delivery='retirada') OR
        (v_current='saiu_para_entrega' AND p_status='entregue')
    ) THEN RAISE EXCEPTION 'Transição de status inválida.'; END IF;

    UPDATE public.orders SET status=p_status WHERE id=p_order_id;
    IF p_status='cancelado' THEN
        UPDATE public.order_status_history SET notes=BTRIM(p_notes)
        WHERE order_id=p_order_id AND status=p_status AND notes IS NULL;
        IF NOT FOUND THEN
            INSERT INTO public.order_status_history(order_id,status,notes,created_by)
            VALUES(p_order_id,p_status,BTRIM(p_notes),auth.uid());
        END IF;
    END IF;
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_order_status(UUID, public.order_status, TEXT) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.admin_confirm_order_delivery_fee(p_order_id UUID,p_fee NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem confirmar a taxa.'; END IF;
    IF p_fee IS NULL OR p_fee < 0 THEN RAISE EXCEPTION 'Taxa inválida.'; END IF;
    UPDATE public.orders SET delivery_fee=p_fee,delivery_fee_status='confirmed',total=subtotal+p_fee
    WHERE id=p_order_id AND delivery_type='entrega' AND delivery_fee_status='pending';
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não aguarda confirmação de taxa.'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.admin_confirm_order_delivery_fee(UUID,NUMERIC) FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id, event_type, user_id)
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed','not_configured')),
    provider_message_id TEXT,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id, event_type)
);
ALTER TABLE public.notification_logs DROP CONSTRAINT IF EXISTS notification_logs_status_check;
ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_status_check CHECK(status IN ('pending','processing','sent','failed','not_configured'));

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuário lê notificações próprias" ON public.notifications;
CREATE POLICY "Usuário lê notificações próprias" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
REVOKE UPDATE ON public.notifications FROM authenticated;
DROP POLICY IF EXISTS "Usuário marca notificações próprias" ON public.notifications;
CREATE POLICY "Usuário marca notificações próprias" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin lê logs de notificação" ON public.notification_logs;
CREATE POLICY "Admin lê logs de notificação" ON public.notification_logs FOR SELECT USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.add_order_status_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title TEXT; v_message TEXT; v_event TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_event := 'recebido';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
        v_event := NEW.status::TEXT;
    ELSE
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.status='cancelado' THEN
        SELECT notes INTO v_message FROM public.order_status_history
        WHERE order_id=NEW.id AND status='cancelado' ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF NEW.user_id IS NOT NULL THEN
        v_title := CASE v_event WHEN 'recebido' THEN 'Pedido recebido' WHEN 'preparando' THEN 'Pedido em preparo' WHEN 'pronto' THEN 'Pedido pronto' WHEN 'saiu_para_entrega' THEN 'Pedido saiu para entrega' WHEN 'entregue' THEN 'Pedido finalizado' WHEN 'cancelado' THEN 'Pedido cancelado' ELSE 'Status do pedido atualizado' END;
        v_message := CASE WHEN v_event='cancelado' THEN 'Pedido cancelado. Motivo: ' || COALESCE(v_message,'não informado') ELSE CASE v_event WHEN 'recebido' THEN 'Recebemos seu pedido. Em breve ele começará a ser preparado.' WHEN 'preparando' THEN 'Seu pedido está sendo preparado pela nossa equipe.' WHEN 'pronto' THEN CASE WHEN NEW.delivery_type = 'retirada' THEN 'Seu pedido está pronto para retirada!' ELSE 'Seu pedido está pronto!' END WHEN 'saiu_para_entrega' THEN 'Seu pedido saiu para entrega!' WHEN 'entregue' THEN 'Pedido finalizado. Obrigado por pedir no Pancho da Fronteira!' ELSE 'O status do seu pedido foi atualizado.' END END;
        INSERT INTO public.notifications(user_id, order_id, event_type, title, message)
        VALUES (NEW.user_id, NEW.id, v_event, v_title, v_message)
        ON CONFLICT (order_id, event_type, user_id) DO NOTHING;
    END IF;
    IF NEW.whatsapp_opt_in AND NULLIF(NEW.customer_phone, '') IS NOT NULL THEN
        INSERT INTO public.notification_logs(order_id,user_id,phone,event_type,status)
        VALUES(NEW.id,NEW.user_id,NEW.customer_phone,v_event,'pending')
        ON CONFLICT (order_id,event_type) DO NOTHING;
    END IF;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS order_status_notifications ON public.orders;
CREATE TRIGGER order_status_notifications AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.add_order_status_notification();

CREATE OR REPLACE FUNCTION public.get_guest_order_tracking(p_token UUID)
RETURNS TABLE(order_number TEXT, status public.order_status, delivery_type public.delivery_type, created_at TIMESTAMPTZ, history JSONB)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT o.order_number, o.status, o.delivery_type, o.created_at,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('status',h.status,'created_at',h.created_at) ORDER BY h.created_at) FROM public.order_status_history h WHERE h.order_id=o.id),'[]'::jsonb)
    FROM public.orders o WHERE o.tracking_token=p_token AND o.user_id IS NULL LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_guest_order_tracking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_order_tracking(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_retry_order_notification(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_order public.orders; v_event TEXT; v_log public.notification_logs;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem reenviar notificações.'; END IF;
    SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
    v_event := v_order.status::TEXT;
    IF NOT v_order.whatsapp_opt_in OR NULLIF(v_order.customer_phone,'') IS NULL THEN
        RETURN jsonb_build_object('status','not_configured','sent',false,'reason','Sem consentimento ou telefone.');
    END IF;
    INSERT INTO public.notification_logs(order_id,user_id,phone,event_type,status)
    VALUES(v_order.id,v_order.user_id,v_order.customer_phone,v_event,'pending')
    ON CONFLICT(order_id,event_type) DO UPDATE SET phone=EXCLUDED.phone,
        status=CASE WHEN public.notification_logs.status IN ('failed','not_configured') THEN 'pending' ELSE public.notification_logs.status END,
        error_message=CASE WHEN public.notification_logs.status IN ('failed','not_configured') THEN NULL ELSE public.notification_logs.error_message END
    RETURNING * INTO v_log;
    RETURN jsonb_build_object('status',v_log.status,'sent',false,'order_id',v_order.id);
END; $$;

-- Realtime only broadcasts rows to clients already authorized by table RLS.
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_product_option_groups_group ON public.product_option_groups(group_id);
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
ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

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
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

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
    USING (public.is_admin()) WITH CHECK (public.is_admin());

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
    USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode excluir produtos"
    ON public.products FOR DELETE
    USING (public.is_admin());

-- Grupos de opções: catálogo pode ler apenas grupos ativos; somente admin altera.
DROP POLICY IF EXISTS "Público pode ver grupos ativos" ON public.option_groups;
DROP POLICY IF EXISTS "Admin pode ver todos os grupos" ON public.option_groups;
DROP POLICY IF EXISTS "Admin pode inserir grupos" ON public.option_groups;
DROP POLICY IF EXISTS "Admin pode atualizar grupos" ON public.option_groups;
DROP POLICY IF EXISTS "Admin pode excluir grupos" ON public.option_groups;
CREATE POLICY "Público pode ver grupos ativos" ON public.option_groups FOR SELECT USING (active = TRUE);
CREATE POLICY "Admin pode ver todos os grupos" ON public.option_groups FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin pode inserir grupos" ON public.option_groups FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin pode atualizar grupos" ON public.option_groups FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin pode excluir grupos" ON public.option_groups FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Público pode ver vínculos de grupos ativos" ON public.product_option_groups;
DROP POLICY IF EXISTS "Admin pode ver todos os vínculos de grupos" ON public.product_option_groups;
DROP POLICY IF EXISTS "Admin pode inserir vínculos de grupos" ON public.product_option_groups;
DROP POLICY IF EXISTS "Admin pode atualizar vínculos de grupos" ON public.product_option_groups;
DROP POLICY IF EXISTS "Admin pode excluir vínculos de grupos" ON public.product_option_groups;
CREATE POLICY "Público pode ver vínculos de grupos ativos" ON public.product_option_groups FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.option_groups g WHERE g.id = group_id AND g.active = TRUE));
CREATE POLICY "Admin pode ver todos os vínculos de grupos" ON public.product_option_groups FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin pode inserir vínculos de grupos" ON public.product_option_groups FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin pode atualizar vínculos de grupos" ON public.product_option_groups FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin pode excluir vínculos de grupos" ON public.product_option_groups FOR DELETE USING (public.is_admin());

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
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode excluir próprio endereço"
    ON public.addresses FOR DELETE
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Usuário pode atualizar próprio endereço" ON public.addresses;
CREATE POLICY "Usuário pode atualizar próprio endereço" ON public.addresses FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Existing anonymous/authenticated writes are replaced by guarded server-side RPCs.

-- ============================================================
-- POLICIES: ORDERS
-- ============================================================
DROP POLICY IF EXISTS "Usuário pode ver próprios pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admin pode ver todos os pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuário autenticado ou visitante pode criar pedido" ON public.orders;
DROP POLICY IF EXISTS "Admin pode atualizar qualquer pedido" ON public.orders;
DROP POLICY IF EXISTS "Usuário não atualiza pedidos diretamente" ON public.orders;

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
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

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

-- Tighten inherited table grants after the guarded RPCs and RLS policies exist.
REVOKE ALL ON public.orders, public.order_items, public.order_status_history FROM anon, authenticated;
GRANT SELECT ON public.orders, public.order_items, public.order_status_history TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(JSONB,JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID,public.order_status,TEXT) TO authenticated;

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
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode inserir configurações"
    ON public.store_settings FOR INSERT
    WITH CHECK (public.is_admin());

-- ============================================================
-- Explicit grants for the app roles; RLS limits these accesses per row.
GRANT SELECT ON public.categories, public.products, public.option_groups, public.product_option_groups, public.store_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories, public.products, public.option_groups, public.product_option_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT ON public.orders, public.order_items, public.order_status_history TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(JSONB,JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID,public.order_status,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order_delivery_fee(UUID,NUMERIC) TO authenticated;
GRANT UPDATE(name,phone,whatsapp,email,address,city,state,instagram,facebook,description,logo_url,delivery_fee,delivery_zones,min_order_value,opening_hours,opening_exceptions,store_open,updated_at,payment_methods,whatsapp_settings), INSERT ON public.store_settings TO authenticated;
GRANT SELECT ON public.notifications, public.notification_logs TO authenticated;
GRANT UPDATE(read_at) ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_retry_order_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
GRANT UPDATE(nome,telefone,avatar_url,whatsapp_opt_in,updated_at) ON public.profiles TO authenticated;
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
)
SELECT
    'Pancho da Fronteira',
    NULL,
    NULL,
    'Rua das Fronteiras, 245 • Centro',
    'Uruguaiana',
    'RS',
    'Panchos preparados com carinho, sabor e aquele toque especial que faz você querer voltar.',
    0,
    0
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);






