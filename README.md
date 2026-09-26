# 🌭 Pancho da Fronteira — Sistema de Pedidos Online

Sistema completo de cardápio digital, pedidos online e painel administrativo sob medida para a empresa familiar **Pancho da Fronteira**.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: HTML5 Semântico, CSS3 Moderno (Vanilla CSS), JavaScript ES6+ Modular.
- **Backend & Autenticação**: Supabase (PostgreSQL, Supabase Auth, Row Level Security - RLS).
- **Armazenamento**: LocalStorage para persistência do carrinho e Supabase Storage para imagens.
- **PWA**: Suporte a instalação com `manifest.json` e `service-worker.js`.

---

## 📁 Estrutura do Projeto

```text
/
├── index.html                  # Página inicial com Hero, Destaques, Sobre e Depoimentos
├── cardapio.html               # Cardápio interativo com busca e filtros dinâmicos
├── produto.html                # Página de detalhes, adicionais e observações do lanche
├── carrinho.html               # Visualização do carrinho e cálculo de totais
├── pedido.html                 # Checkout em 3 etapas e Acompanhamento de Pedidos em tempo real
├── login.html                  # Login de clientes (Supabase Auth)
├── cadastro.html               # Cadastro de novos clientes com validação
│
├── admin/                      # Área Administrativa
│   ├── index.html              # Dashboard com métricas e últimos pedidos
│   ├── pedidos.html            # Gestão e alteração de status de pedidos em tempo real
│   ├── produtos.html           # Gestão e listagem de produtos do cardápio
│   ├── categorias.html         # Gestão de categorias
│   ├── clientes.html           # Base de clientes cadastrados
│   ├── configuracoes.html      # Configurações da loja e taxa de entrega
│   └── login.html              # Acesso restrito para administradores
│
├── css/
│   ├── global.css              # Variáveis de design, reset, tipografia, toasts e modais
│   ├── home.css                # Estilos da página inicial
│   ├── cardapio.css            # Estilos do cardápio e cards de produto
│   ├── produto.css             # Estilos da página individual de produto
│   ├── carrinho.css            # Estilos do carrinho de compras
│   ├── auth.css                # Estilos para páginas de login e cadastro
│   ├── pedido.css              # Estilos do checkout e timeline de acompanhamento
│   └── admin.css               # Estilos do painel administrativo
│
├── js/
│   ├── config.js               # Configurações centrais e credenciais do Supabase
│   ├── supabase.js             # Funções de banco de dados e comunicação com o Supabase
│   ├── auth.js                 # Autenticação de clientes e administradores
│   ├── cart.js                 # Gerenciador do carrinho no LocalStorage
│   ├── produtos.js             # Renderizador do cardápio e detalhes do produto
│   ├── ui.js                   # Notificações Toast, modais e feedback de interface
│   ├── main.js                 # Scripts gerais do site público
│   └── admin.js                # Controladores do painel administrativo
│
├── supabase/
│   ├── schema.sql              # Estrutura completa do banco de dados e políticas RLS
│   └── seed.sql                # Dados iniciais de demonstração (categorias e produtos)
│
├── manifest.json               # Configuração PWA
└── service-worker.js           # Cache offline leve
```

---

## 🛠️ Como Configurar o Supabase

### 1. Criar o Projeto
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto gratuito.
2. No menu lateral, acesse **SQL Editor**.

### 2. Executar o Schema do Banco
1. Abra o arquivo `supabase/schema.sql`.
2. Copie todo o conteúdo e cole no SQL Editor do Supabase.
3. Clique em **Run** para criar as tabelas, enums, triggers e políticas de segurança RLS.

### 3. Executar o Seed (Dados Iniciais)
1. Abra o arquivo `supabase/seed.sql`.
2. Cole no SQL Editor e execute para popular as categorias e lanches iniciais.

### 4. Configurar as Chaves no Frontend
1. No painel do Supabase, vá em **Project Settings > API**.
2. Copie a **Project URL** e a chave pública **Project API anon public**.
3. Abra o arquivo `js/config.js` no projeto e preencha:

```javascript
const SUPABASE_URL = "https://seu-projeto.supabase.co";
const SUPABASE_ANON_KEY = "sua-chave-anon-publica";
```

> ⚠️ **Atenção de Segurança**: Nunca utilize a chave `service_role` no frontend. Apenas a chave `anon` pública deve ser usada. A segurança é garantida pelas políticas RLS configuradas no banco.

---

## 👑 Como Criar o Primeiro Administrador

1. Abra a página `cadastro.html` no seu navegador e crie uma conta com seu e-mail e senha.
2. Acesse o painel do Supabase em **Authentication > Users** e copie o seu **User UID**.
3. No SQL Editor do Supabase, execute o comando:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'COLE_SEU_UUID_AQUI';
```

4. Agora acesse `admin/login.html` com o e-mail e senha cadastrados para acessar o painel administrativo!

---

## 💻 Como Executar Localmente

Você pode rodar o projeto usando qualquer servidor estático local:

### Com VS Code / IDE:
- Use a extensão **Live Server** e clique em "Go Live" no `index.html`.

### Com Node / npx:
```bash
npx serve .
```

### Com Python:
```bash
python -m http.server 8000
```
Acesse `http://localhost:8000` no seu navegador.

---

## 📦 Como Publicar / Hospedar

Como o projeto é 100% estático integrado diretamente à nuvem do Supabase, você pode hospedá-lo gratuitamente em:
- **Vercel** (`vercel deploy`)
- **Netlify** (basta arrastar a pasta do projeto)
- **GitHub Pages** (ativando nas configurações do repositório)

---

## ✨ Funcionalidades Principais

- ✅ **Navegação Intuitiva e Acolhedora**: Identidade rústica, familiar e elegante.
- ✅ **Cardápio Dinâmico**: Busca em tempo real e filtros de categorias.
- ✅ **Carrinho Inteligente**: Persistência no navegador, adição de observações e cálculo de entrega.
- ✅ **Checkout Completo**: Opção de entrega ou retirada, formas de pagamento e registro no Supabase.
- ✅ **Acompanhamento ao Vivo**: Timeline visual do pedido (Recebido ➔ Em preparo ➔ Saiu p/ Entrega ➔ Entregue).
- ✅ **Painel do Restaurante**: Gestão ao vivo de pedidos com alteração de status em um clique.
- ✅ **Segurança RLS**: Clientes só acessam seus próprios pedidos e apenas administradores podem alterar o cardápio.

## Regras operacionais

- `js/operacoes.js` concentra cálculo de entrega e consulta de funcionamento. Sem Supabase, as configurações operacionais ficam no `localStorage` (`panchoOperations`). Com Supabase, ficam em `store_settings`.
- Entregas grátis: Loteamentos Jardins 1, 2 e 3, Parque das Rosas e Tabuleiro. Bela Vista: R$ 5,00. Demais localidades: taxa pendente de confirmação; o pedido pode ser registrado com subtotal e total pendente.
- Retirada não cobra entrega. Domingo, terça-feira e o primeiro sábado do mês são fechados. Quarta a sábado usam horários configurados. Segunda-feira permanece sem definição até a loja configurá-la.
- A tela Admin > Configurações permite editar zonas e horários como JSON. Execute `supabase/schema.sql` no projeto Supabase para criar as novas colunas e permitir pedidos com taxa pendente.
- O horário exato de atendimento não foi fornecido; os valores permanecem configuráveis e não são presumidos. Categorias e produtos aceitam itens de açaí sem criar produtos de demonstração.
