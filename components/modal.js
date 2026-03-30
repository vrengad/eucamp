let submitHandler = null;

function getEl(id) {
  return document.getElementById(id);
}

export function initModal() {
  const overlay = getEl("modalOverlay");
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  getEl("modalCancelBtn").addEventListener("click", closeModal);
  getEl("modalForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitHandler) {
      await submitHandler(new FormData(event.target));
    }
  });
}

export function openModal({ title, submitLabel = "Save", bodyHtml, onSubmit }) {
  getEl("modalTitle").textContent = title;
  getEl("modalSubmitBtn").textContent = submitLabel;
  getEl("modalBody").innerHTML = bodyHtml;
  submitHandler = onSubmit;
  getEl("modalOverlay").classList.add("open");
  const firstInput = getEl("modalBody").querySelector("input, select, textarea");
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

export function closeModal() {
  getEl("modalOverlay").classList.remove("open");
  getEl("modalBody").innerHTML = "";
  submitHandler = null;
}
