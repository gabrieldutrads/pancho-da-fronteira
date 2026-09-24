-- ============================================================
-- PANCHO DA FRONTEIRA — SEED (DADOS DE DEMONSTRAÇÃO)
-- Execute APÓS o schema.sql
-- ATENÇÃO: Estes são dados de demonstração.
-- Preços e produtos são fictícios.
-- ============================================================

-- ============================================================
-- CATEGORIAS
-- ============================================================
INSERT INTO public.categories (name, description, icon, active, sort_order) VALUES
    ('Panchos',    'Nosso clássico especial, preparado com o carinho da casa.',          'pancho',   TRUE, 1),
    ('Combos',     'Combinações perfeitas para aproveitar com quem você gosta.',         'combo',    TRUE, 2),
    ('Bebidas',    'Bebidas geladas para acompanhar seu pedido.',                        'bebida',   TRUE, 3),
    ('Promoções',  'Ofertas especiais por tempo limitado. Aproveita!',                   'promo',    TRUE, 4);

-- ============================================================
-- PRODUTOS (demonstração — preços fictícios)
-- ============================================================
-- Panchos
INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Pancho da Casa',
    'Nosso clássico especial: pão artesanal, salsicha suína premium, alface, tomate, cebola caramelizada e molho da casa.',
    24.90,
    TRUE, TRUE, 1
FROM public.categories c WHERE c.name = 'Panchos';

INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Pancho Especial',
    'Uma combinação especial para quem gosta de sabor intenso. Ingredientes selecionados e molho exclusivo.',
    27.90,
    TRUE, FALSE, 2
FROM public.categories c WHERE c.name = 'Panchos';

INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Pancho Bacon',
    'Para quem não abre mão daquele toque defumado. Com fatias generosas de bacon crocante.',
    28.90,
    TRUE, TRUE, 3
FROM public.categories c WHERE c.name = 'Panchos';

INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Pancho Queijo',
    'Coberto com queijo derretido na hora. Cremoso, irresistível e feito com carinho.',
    26.90,
    TRUE, FALSE, 4
FROM public.categories c WHERE c.name = 'Panchos';

-- Combos
INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Combo Família',
    '4 Panchos da Casa + 4 Bebidas. A combinação perfeita para aproveitar com toda a família.',
    89.90,
    TRUE, TRUE, 1
FROM public.categories c WHERE c.name = 'Combos';

INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Combo Dupla',
    '2 Panchos Especiais + 2 Bebidas. Ideal para dividir aquele momento especial com alguém.',
    49.90,
    TRUE, FALSE, 2
FROM public.categories c WHERE c.name = 'Combos';

INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Combo Individual',
    '1 Pancho da Casa + 1 Bebida. Completo e perfeito para uma refeição rápida.',
    28.90,
    TRUE, FALSE, 3
FROM public.categories c WHERE c.name = 'Combos';

-- Bebidas
INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Refrigerante Lata',
    'Lata gelada 350ml. Escolha entre Coca-Cola, Guaraná ou Sprite.',
    6.00,
    TRUE, FALSE, 1
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Suco Natural',
    'Suco natural 300ml. Sabores: laranja, limão ou maracujá.',
    7.00,
    TRUE, FALSE, 2
FROM public.categories c WHERE c.name = 'Bebidas';

INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Água Mineral',
    'Água mineral sem gás 500ml.',
    4.00,
    TRUE, FALSE, 3
FROM public.categories c WHERE c.name = 'Bebidas';

-- Promoções
INSERT INTO public.products (category_id, name, description, price, active, featured, sort_order)
SELECT
    c.id,
    'Pancho + Bebida',
    '⚡ PROMOÇÃO — 1 Pancho da Casa + 1 Refrigerante por um preço especial! Por tempo limitado.',
    25.90,
    TRUE, TRUE, 1
FROM public.categories c WHERE c.name = 'Promoções';

-- ============================================================
-- COMO CRIAR O PRIMEIRO ADMINISTRADOR
-- ============================================================
-- 1. Crie uma conta normalmente pelo site (cadastro.html)
-- 2. Acesse o Supabase > Authentication > Users
-- 3. Copie o UUID do usuário criado
-- 4. Execute a query abaixo substituindo 'SEU-UUID-AQUI':
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = 'SEU-UUID-AQUI';
--
-- Depois acesse /admin/login.html com as credenciais cadastradas.
