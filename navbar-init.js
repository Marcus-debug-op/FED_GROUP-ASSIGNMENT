import { loadNavbar } from "./loadNavbar.js";
import { initNavbarAuth } from "./navbar-auth.js";

(async () => {
  try {
    await loadNavbar();
    initNavbarAuth();
  } catch (err) {
    console.error("Navbar init failed:", err);
  }
})();
