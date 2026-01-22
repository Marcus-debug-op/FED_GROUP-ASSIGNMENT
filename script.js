const menuBtn = document.getElementById("menu-btn");
const dashboard = document.getElementById("dashboard");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("close-btn");

menuBtn.addEventListener("click", () => {
  dashboard.classList.remove("hidden");
  overlay.classList.remove("hidden");

  // small delay so CSS transition works
  setTimeout(() => {
    dashboard.classList.add("show");
  }, 10);
});

function closeMenu(){
  dashboard.classList.remove("show");
  overlay.classList.add("hidden");

  setTimeout(() => {
    dashboard.classList.add("hidden");
  }, 300);
}

closeBtn.addEventListener("click", closeMenu);
overlay.addEventListener("click", closeMenu);
