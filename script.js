const toast = document.getElementById("toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

document.querySelectorAll(".fake-paypal").forEach((button) => {
  button.addEventListener("click", () => {
    const product = button.dataset.product;
    showToast(`Remplace ce bouton par ton vrai lien PayPal pour : ${product}`);
  });
});
