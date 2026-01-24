// SignUpVendor.js
// Only wires the Vendor "Continue as Stall Owner" CTA to Create AccountVendor.html

(() => {
  const CREATE_ACCOUNT_PAGE = "Create AccountVendor.html";

  // Vendor card is the second .card in sign up.html :contentReference[oaicite:4]{index=4}
  const vendorCta = document.querySelector(".content .card:nth-of-type(2) .cta");

  if (!vendorCta) return;

  const go = () => {
    localStorage.setItem("hawkerhub_role", "vendor");
    window.location.href = `${CREATE_ACCOUNT_PAGE}?role=vendor`;
  };

  vendorCta.setAttribute("role", "button");
  vendorCta.setAttribute("tabindex", "0");

  vendorCta.addEventListener("click", (e) => {
    e.preventDefault();
    go();
  });

  vendorCta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  });
})();
