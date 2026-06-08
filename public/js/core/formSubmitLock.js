export const setFormSubmitting = (form, submitting) => {
  if (!form) {
    return;
  }

  const submitBtn = form.querySelector('[type="submit"]');
  const cancelBtn = form.querySelector('[data-bs-dismiss="modal"]');

  if (submitBtn) {
    if (!submitBtn.dataset.defaultLabel) {
      submitBtn.dataset.defaultLabel = submitBtn.textContent.trim() || 'Guardar';
    }

    submitBtn.disabled = submitting;
    submitBtn.textContent = submitting
      ? 'Guardando...'
      : submitBtn.dataset.defaultLabel;
  }

  if (cancelBtn) {
    cancelBtn.disabled = submitting;
  }
};

export const isFormSubmitting = (form) => {
  const submitBtn = form?.querySelector('[type="submit"]');
  return Boolean(submitBtn?.disabled);
};
