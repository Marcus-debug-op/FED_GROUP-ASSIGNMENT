document.addEventListener("DOMContentLoaded", () => {
  const importBtn = document.getElementById("import-btn");
  const fileInput = document.getElementById("real-file-input");
  const previewImg = document.getElementById("image-preview");
  const placeholder = document.getElementById("photo-placeholder");

  if (!importBtn || !fileInput || !previewImg) return;

  importBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      previewImg.src = reader.result;
      previewImg.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
    };
    reader.readAsDataURL(file);
  });
});
