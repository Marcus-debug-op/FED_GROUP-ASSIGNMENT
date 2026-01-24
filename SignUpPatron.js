// SignUpPatron.js
// Only wires the Patron "Continue as Customer" CTA to Create AccountPatron.html

(() => {
  const CREATE_ACCOUNT_PAGE = "Create AccountPatron.html";

  // Patron card is the first .card in sign up.html :contentReference[oaicite:3]{index=3}
  const patronCta = document.querySelector(".content .card:nth-of-type(1) .cta");

  if (!patronCta) return;

  const go = () => {
    localStorage.setItem("hawkerhub_role", "patron");
    window.location.href = `${CREATE_ACCOUNT_PAGE}?role=patron`;
  };

  patronCta.setAttribute("role", "button");
  patronCta.setAttribute("tabindex", "0");

  patronCta.addEventListener("click", (e) => {
    e.preventDefault();
    go();
  });

  patronCta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  });
})();
