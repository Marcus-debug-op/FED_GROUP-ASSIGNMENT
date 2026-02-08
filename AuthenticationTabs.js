(() => {
  
  const PATRON_SIGNIN_PAGE = "SigninPatron.html"; 
  const VENDOR_SIGNIN_PAGE = "SignInVendor.html"; 

  const PATRON_SIGNUP_PAGE = "CreateAccountPatron.html"; 
  const VENDOR_SIGNUP_PAGE = "CreateAccountVendor.html"; 


  const btnUp = document.getElementById("tabSignUp");
  const btnIn = document.getElementById("tabSignIn");

  if (!btnUp || !btnIn) return;


  const segmented = document.querySelector(".segmented");
  const role = segmented?.dataset?.role || "patron"; // "vendor" | "patron"

  const targets =
    role === "vendor"
      ? { signup: VENDOR_SIGNUP_PAGE, signin: VENDOR_SIGNIN_PAGE }
      : { signup: PATRON_SIGNUP_PAGE, signin: PATRON_SIGNIN_PAGE };

  btnUp.addEventListener("click", () => {
    window.location.href = targets.signup;
  });

  btnIn.addEventListener("click", () => {
    window.location.href = targets.signin;
  });
})();
