/* ============================================================
   PANCHO DA FRONTEIRA — AUTH.JS
   Autenticação via Supabase Auth.
   Gerencia sessão, login, cadastro, logout e proteção de rotas.
============================================================ */

/* ----------------------------------------------------------
   ESTADO DA SESSÃO
---------------------------------------------------------- */
let _currentSession = null;
let _currentUser    = null;

function getCurrentUser()    { return _currentUser; }
function getCurrentSession() { return _currentSession; }

window.getCurrentUser    = getCurrentUser;
window.getCurrentSession = getCurrentSession;

/* ----------------------------------------------------------
   INICIALIZAR AUTH — chamar em todas as páginas
---------------------------------------------------------- */
async function initAuth({ onLogin, onLogout, requireAuth = false, requireAdmin = false } = {}) {
    const sb = getSupabase();
    if (!sb) return;

    // Pegar sessão atual
    const { data: { session } } = await sb.auth.getSession();
    _currentSession = session;
    _currentUser    = session?.user ?? null;

    // Verificar proteção de rota
    if (requireAuth && !_currentUser) {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?returnTo=${returnTo}`;
        return;
    }

    if (requireAdmin && _currentUser) {
        const isAdmin = await checkIsAdmin(_currentUser.id);
        if (!isAdmin) {
            window.location.href = "/index.html";
            return;
        }
    }

    // Atualizar UI do header
    updateHeaderAuth(_currentUser);

    // Callbacks
    if (_currentUser && onLogin) await onLogin(_currentUser, session);
    if (!_currentUser && onLogout) onLogout();

    // Escutar mudanças de sessão
    sb.auth.onAuthStateChange(async (event, session) => {
        _currentSession = session;
        _currentUser    = session?.user ?? null;
        updateHeaderAuth(_currentUser);

        if (event === "SIGNED_IN" && onLogin)  await onLogin(_currentUser, session);
        if (event === "SIGNED_OUT" && onLogout) onLogout();

        // Se a página exige auth e usuário saiu, redirecionar
        if (event === "SIGNED_OUT" && requireAuth) {
            window.location.href = "/login.html";
        }
        if (event === "SIGNED_OUT" && requireAdmin) {
            window.location.href = "/admin/login.html";
        }
    });
}

/* ----------------------------------------------------------
   VERIFICAR SE É ADMIN
---------------------------------------------------------- */
async function checkIsAdmin(userId) {
    const sb = getSupabase();
    if (!sb || !userId) return false;
    const { data } = await sb
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
    return data?.role === "admin" || data?.role === "manager";
}

window.checkIsAdmin = checkIsAdmin;

/* ----------------------------------------------------------
   CADASTRO
---------------------------------------------------------- */
async function signUp({ email, password, nome, telefone }) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");

    const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
            data: { nome, telefone },
        },
    });

    if (error) throw new Error(translateAuthError(error.message));
    return data;
}

/* ----------------------------------------------------------
   LOGIN
---------------------------------------------------------- */
async function signIn({ email, password }) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateAuthError(error.message));
    return data;
}

/* ----------------------------------------------------------
   LOGOUT
---------------------------------------------------------- */
async function signOut() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
}

/* ----------------------------------------------------------
   RECUPERAÇÃO DE SENHA
---------------------------------------------------------- */
async function resetPassword(email) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase não configurado.");
    const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login.html?reset=true`,
    });
    if (error) throw new Error(translateAuthError(error.message));
}

/* ----------------------------------------------------------
   ATUALIZAR PERFIL
---------------------------------------------------------- */
async function updateProfile({ nome, telefone, avatarUrl }) {
    const sb = getSupabase();
    if (!sb || !_currentUser) throw new Error("Não autenticado.");
    const updates = {};
    if (nome !== undefined)      updates.nome       = nome;
    if (telefone !== undefined)  updates.telefone   = telefone;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    const { error } = await sb.from("profiles").update(updates).eq("id", _currentUser.id);
    if (error) throw new Error(error.message);
}

async function fetchProfile(userId) {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.from("profiles").select("*").eq("id", userId).single();
    return data;
}

/* ----------------------------------------------------------
   ATUALIZAR UI DO HEADER COM BASE NA SESSÃO
---------------------------------------------------------- */
function updateHeaderAuth(user) {
    // Botão de conta (se existir no header)
    const accountBtn   = document.getElementById("accountBtn");
    const accountName  = document.getElementById("accountName");
    const logoutBtn    = document.getElementById("logoutBtn");

    if (!accountBtn) return;

    if (user) {
        accountBtn.href  = "/pedido.html#meus-pedidos";
        accountBtn.title = "Minha conta";
        if (accountName) accountName.textContent = user.email.split("@")[0];
        if (logoutBtn) logoutBtn.style.display = "flex";
    } else {
        accountBtn.href  = "/login.html";
        accountBtn.title = "Entrar";
        if (accountName) accountName.textContent = "Entrar";
        if (logoutBtn) logoutBtn.style.display = "none";
    }
}

/* ----------------------------------------------------------
   TRADUZIR ERROS DO SUPABASE AUTH
---------------------------------------------------------- */
function translateAuthError(msg) {
    if (!msg) return "Erro desconhecido.";
    const m = msg.toLowerCase();
    if (m.includes("invalid login") || m.includes("invalid credentials"))
        return "E-mail ou senha incorretos.";
    if (m.includes("user already registered") || m.includes("already been registered"))
        return "Este e-mail já está cadastrado.";
    if (m.includes("password should be"))
        return "A senha deve ter pelo menos 6 caracteres.";
    if (m.includes("email not confirmed"))
        return "Confirme seu e-mail antes de entrar.";
    if (m.includes("rate limit"))
        return "Muitas tentativas. Aguarde alguns minutos.";
    if (m.includes("network"))
        return "Sem conexão com a internet.";
    return msg;
}

// Expor globalmente
Object.assign(window, {
    initAuth, signUp, signIn, signOut, resetPassword,
    updateProfile, fetchProfile, getCurrentUser, getCurrentSession,
});
