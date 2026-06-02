const defaults = {
  confirmButtonColor: '#0a0a0a',
  cancelButtonColor: '#525252',
};

export const toast = (title, icon = 'success') =>
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
  });

export const alertError = (title, text) =>
  Swal.fire({
    icon: 'error',
    title,
    text,
    ...defaults,
  });

export const alertWarning = (title, text) =>
  Swal.fire({
    icon: 'warning',
    title,
    text,
    ...defaults,
  });

export const confirmDialog = async ({
  title,
  text = '',
  icon = 'question',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = '#0a0a0a',
}) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: confirmColor,
    cancelButtonColor: defaults.cancelButtonColor,
  });

  return result.isConfirmed;
};
