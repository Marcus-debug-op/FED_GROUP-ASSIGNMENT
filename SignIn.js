// SignIn.js

(() => {
  const CREATE_ACCOUNT_PAGE = "Create Account.html";

 
  const ctas = Array.from(document.querySelectorAll(".cta"));

  if (!ctas.length) return;

 
  const roleByIndex = ["customer", "vendor"];

  ctas.forEach((ctaEl, i) => {
  
    ctaEl.setAttribute("role", "button");
    ctaEl.setAttribute("tabindex", "0");

    const role = roleByIndex[i] ?? "customer";

    const go = () => {
     
      localStorage.setItem("hawkerhub_role", role);

    
      const url = `${CREATE_ACCOUNT_PAGE}?role=${encodeURIComponent(role)}`;
      window.location.href = url;
    };

    ctaEl.addEventListener("click", go);

 
    ctaEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });
})();
