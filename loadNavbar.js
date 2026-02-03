export async function loadNavbar() {
  const res = await fetch("navbar.html");
  const html = await res.text();
  document.body.insertAdjacentHTML("afterbegin", html);
}
