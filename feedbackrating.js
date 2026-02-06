document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("star-container");
  const hidden = document.getElementById("rating-value");
  if (!container || !hidden) return;

  let selected = Number(hidden.value || 0);


  container.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rating-star";
    btn.setAttribute("aria-label", `${i} star`);
    btn.dataset.value = String(i);

    // start as empty star
    btn.innerHTML = `<i class="fa-regular fa-star"></i>`;
    container.appendChild(btn);

    btn.addEventListener("mouseenter", () => paint(i));
    btn.addEventListener("click", () => {
      selected = i;
      hidden.value = String(i); // GlobalSubmit.js will read this
      paint(selected);
    });
  }

  container.addEventListener("mouseleave", () => paint(selected));

  // Paint stars based on number
  function paint(value) {
    const stars = container.querySelectorAll(".rating-star i");
    stars.forEach((icon, idx) => {
      const starNum = idx + 1;
      if (starNum <= value) {
        icon.className = "fa-solid fa-star";
        icon.style.color = "#f5b301"; 
      } else {
        icon.className = "fa-regular fa-star";
        icon.style.color = "#d9d9d9"; 
      }
    });
  }

  // initial render
  paint(selected);
});
