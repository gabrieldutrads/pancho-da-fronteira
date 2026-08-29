// ============================================
// CARRINHO
// ============================================

const CART_KEY = "pancho_cart";


// ============================================
// PEGAR CARRINHO
// ============================================

function getCart() {

    return JSON.parse(
        localStorage.getItem(CART_KEY) || "[]"
    );

}


// ============================================
// SALVAR CARRINHO
// ============================================

function saveCart(cart) {

    localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
    );

}


// ============================================
// ADICIONAR PRODUTO
// ============================================

function addToCart(name, price) {

    const cart = getCart();

    const existing = cart.find(
        item => item.name === name
    );


    if (existing) {

        existing.quantity++;

    } else {

        cart.push({
            name,
            price,
            quantity: 1
        });

    }


    saveCart(cart);


    // feedback simples

    const goCart =
        confirm(
            `${name} foi adicionado ao carrinho! 🌭\n\nDeseja ir para o carrinho?`
        );


    if (goCart) {

        window.location.href =
            "carrinho.html";

    }

}


// ============================================
// REMOVER
// ============================================

function removeFromCart(name) {

    let cart = getCart();

    cart = cart.filter(
        item => item.name !== name
    );

    saveCart(cart);

    renderCart();

}


// ============================================
// ALTERAR QUANTIDADE
// ============================================

function changeQuantity(name, amount) {

    const cart = getCart();

    const item = cart.find(
        item => item.name === name
    );


    if (!item) return;


    item.quantity += amount;


    if (item.quantity <= 0) {

        removeFromCart(name);

        return;

    }


    saveCart(cart);

    renderCart();

}


// ============================================
// FORMATAR DINHEIRO
// ============================================

function formatMoney(value) {

    return value.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


// ============================================
// RENDERIZAR
// ============================================

function renderCart() {

    const container =
        document.getElementById(
            "cartItems"
        );


    const totalElement =
        document.getElementById(
            "total"
        );


    if (!container) return;


    const cart = getCart();


    if (cart.length === 0) {

        container.innerHTML = `

            <div class="empty-cart">

                <div>
                    🛒
                </div>

                <h2>
                    Seu carrinho está vazio.
                </h2>

                <p>
                    Que tal escolher alguma coisa deliciosa?
                </p>

                <a
                    href="cardapio.html"
                    class="btn"
                >
                    🍴 Ver cardápio
                </a>

            </div>

        `;


        if (totalElement) {

            totalElement.textContent =
                formatMoney(0);

        }

        return;

    }


    let total = 0;


    container.innerHTML =
        cart.map(item => {

            const subtotal =
                item.price *
                item.quantity;


            total += subtotal;


            return `

                <div class="cart-item">

                    <div class="cart-product">

                        <div class="cart-icon">
                            🌭
                        </div>

                        <div>

                            <h3>
                                ${item.name}
                            </h3>

                            <span>
                                ${formatMoney(item.price)}
                            </span>

                        </div>

                    </div>


                    <div class="quantity">

                        <button
                            onclick="
                            changeQuantity(
                                '${item.name}',
                                -1
                            )
                            "
                        >
                            −
                        </button>

                        <strong>
                            ${item.quantity}
                        </strong>

                        <button
                            onclick="
                            changeQuantity(
                                '${item.name}',
                                1
                            )
                            "
                        >
                            +
                        </button>

                    </div>


                    <strong>
                        ${formatMoney(subtotal)}
                    </strong>


                    <button
                        class="remove"
                        onclick="
                        removeFromCart(
                            '${item.name}'
                        )
                        "
                        title="Remover"
                    >
                        🗑️
                    </button>

                </div>

            `;

        }).join("");


    if (totalElement) {

        totalElement.textContent =
            formatMoney(total);

    }

}


// ============================================
// FINALIZAR PEDIDO
// ============================================

function finishOrder() {

    const cart = getCart();


    if (!cart.length) {

        alert(
            "Seu carrinho está vazio. 😅"
        );

        return;

    }


    window.location.href =
        "pedido.html";

}


// ============================================
// INICIAR
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    renderCart
);