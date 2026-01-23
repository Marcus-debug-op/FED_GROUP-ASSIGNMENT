// ===============================
// Checkout interactions
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const paymentOptions = document.querySelectorAll(".pay-option");
  const proceedBtn = document.querySelector(".cta");

  // Highlight selected payment method
  paymentOptions.forEach(option => {
    const radio = option.querySelector("input[type='radio']");

    radio.addEventListener("change", () => {
      paymentOptions.forEach(o => o.classList.remove("is-selected"));
      option.classList.add("is-selected");
    });

    // Handle clicking anywhere on the box
    option.addEventListener("click", () => {
      radio.checked = true;
      paymentOptions.forEach(o => o.classList.remove("is-selected"));
      option.classList.add("is-selected");
    });
  });

  // Redirect to payment success page
  proceedBtn.addEventListener("click", () => {
    window.location.href = "PaymentSuccesss.html";
  });
});
