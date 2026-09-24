/* ============================================================
   PANCHO DA FRONTEIRA — CONFIG.JS
   Configurações centrais do projeto.
   Substitua os placeholders pelas suas credenciais do Supabase.
   NUNCA use a SERVICE_ROLE_KEY no frontend.
============================================================ */

const SUPABASE_URL = "https://sielimwkvyokedkwirnv.supabase.co";       // Ex: https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWxpbXdrdnlva2Vka3dpcm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzA2MDEsImV4cCI6MjEwNTgwNjYwMX0.JG-9LDw3vBtVeLi_OCTDwss9qGFwCcpR6MRIxDN-WVY"; // Chave pública (anon/public)

const APP_CONFIG = {
   name: "Pancho da Fronteira",
   cartKey: "panchoCart",
   defaultDeliveryFee: 6.90,
   currency: "BRL",
   locale: "pt-BR",
   orderNumberPrefix: "#PF-",
   adminRoutes: ["/admin/index.html", "/admin/pedidos.html", "/admin/produtos.html",
      "/admin/categorias.html", "/admin/clientes.html", "/admin/configuracoes.html"],
};

// Expor globalmente
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.APP_CONFIG = APP_CONFIG;
