// CreateAccPatron.js
// When user clicks "Create" on Create Account page, go to Log In page.

(() => {
  const LOGIN_PAGE = "Log In.html";

  // Your Create Account page uses: <button class="submit-btn">Create</button> :contentReference[oaicite:0]{index=0}
  const createBtn = document.querySelector(".submit-btn");
  if (!createBtn) return;

  createBtn.addEventListener("click", (e) => {
    e.preventDefault(); // prevents accidental form submit behavior
    window.location.href = LOGIN_PAGE;
  });
})();