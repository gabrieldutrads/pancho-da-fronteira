const menuToggle = document.querySelector("#menuToggle");
const navMenu = document.querySelector("#navMenu");

if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
        const isOpen = navMenu.classList.toggle("open");

        menuToggle.setAttribute("aria-expanded", isOpen);
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Fechar menu" : "Abrir menu"
        );
    });
}


const navLinks = document.querySelectorAll(".nav-link");

navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        navMenu?.classList.remove("open");
        menuToggle?.setAttribute("aria-expanded", "false");
    });
});

function syncCartCount() {
    const cartCountElement = document.getElementById("cartCount");
    if (!cartCountElement) return;

    const storage = localStorage.getItem("panchoCart");
    let total = 0;

    if (storage) {
        try {
            const cart = JSON.parse(storage);
            total = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
        } catch (error) {
            total = 0;
        }
    }

    cartCountElement.textContent = String(total);
}

window.addEventListener("DOMContentLoaded", syncCartCount);
window.addEventListener("storage", syncCartCount);