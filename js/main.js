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