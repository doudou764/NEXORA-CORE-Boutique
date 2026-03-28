const products = [
  { id: "basic", name: "Serveur Basic", price: "10.00" },
  { id: "premium", name: "Serveur Premium", price: "25.00" },
  { id: "ultra", name: "Serveur Ultra", price: "45.00" },
  { id: "custom", name: "Serveur Sur Mesure", price: "0.00" }
];

let selectedProduct = products[0];

const selectedNameEl = document.getElementById("selected-name");
const selectedPriceEl = document.getElementById("selected-price");
const statusEl = document.getElementById("payment-status");
const productCards = document.querySelectorAll(".product-card");

function formatEuro(value) {
  if (Number(value) === 0) return "Sur devis";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value));
}

function showStatus(message, type = "success") {
  statusEl.textContent = message;
  statusEl.className = `payment-status show ${type}`;
}

function updateSelectedProduct(name, price) {
  selectedProduct = { name, price };
  selectedNameEl.textContent = name;
  selectedPriceEl.textContent = formatEuro(price);
}

productCards.forEach((card) => {
  const button = card.querySelector(".select-offer");

  if (!button) return;

  button.addEventListener("click", () => {
    productCards.forEach((c) => c.classList.remove("active"));
    card.classList.add("active");

    updateSelectedProduct(card.dataset.name, card.dataset.price);

    if (card.dataset.price === "0.00") {
      showStatus("Offre sélectionnée : Serveur Sur Mesure — commande uniquement via ticket.", "success");
    } else {
      showStatus(
        `Offre sélectionnée : ${card.dataset.name} (${formatEuro(card.dataset.price)})`,
        "success"
      );
    }
  });
});

async function createOrderOnServer() {
  if (selectedProduct.price === "0.00") {
    throw new Error("L’offre Sur Mesure se commande uniquement via ticket.");
  }

  const response = await fetch("/api/paypal/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      productName: selectedProduct.name,
      amount: selectedProduct.price,
      currency: "EUR"
    })
  });

  const data = await response.json();

  if (!response.ok || !data.id) {
    throw new Error(data.error || "Impossible de créer la commande PayPal.");
  }

  return data.id;
}

async function captureOrderOnServer(orderID) {
  const response = await fetch("/api/paypal/capture-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ orderID })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Impossible de capturer la commande PayPal.");
  }

  return data;
}

if (!window.paypal) {
  showStatus(
    "Le SDK PayPal ne s’est pas chargé. Vérifie ton client ID dans index.html.",
    "error"
  );
} else {
  paypal.Buttons({
    style: {
      layout: "vertical",
      color: "gold",
      shape: "rect",
      label: "paypal"
    },

    createOrder: async function () {
      try {
        statusEl.className = "payment-status";
        statusEl.textContent = "";
        const orderID = await createOrderOnServer();
        return orderID;
      } catch (error) {
        showStatus(error.message, "error");
        throw error;
      }
    },

    onApprove: async function (data) {
      try {
        const captureData = await captureOrderOnServer(data.orderID);

        const payerName =
          captureData?.payer?.name?.given_name ||
          captureData?.payment_source?.paypal?.name?.given_name ||
          "client";

        showStatus(
          `Paiement validé avec succès. Merci ${payerName} ! Commande : ${selectedProduct.name}.`,
          "success"
        );

        console.log("Capture PayPal :", captureData);
      } catch (error) {
        showStatus(error.message, "error");
      }
    },

    onCancel: function () {
      showStatus("Paiement annulé par le client.", "error");
    },

    onError: function (err) {
      console.error(err);
      showStatus("Une erreur PayPal est survenue.", "error");
    }
  }).render("#paypal-button-container");
}
