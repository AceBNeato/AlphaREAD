import Swal from 'sweetalert2';

export const confirmAction = async (title: string, text?: string) => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#2563eb', // blue-600
    cancelButtonColor: '#374151', // gray-700
    confirmButtonText: 'Yes, proceed',
    cancelButtonText: 'Cancel',
    background: '#111827', // gray-900
    color: '#ffffff',
    customClass: {
      popup: '!rounded-3xl !border !border-gray-800 !shadow-2xl',
      title: '!text-xl !font-bold',
      confirmButton: '!rounded-xl !font-bold !px-6 !py-3',
      cancelButton: '!rounded-xl !font-bold !px-6 !py-3 !text-gray-300 hover:!bg-gray-600',
    }
  });

  return result.isConfirmed;
};

export const promptAction = async (title: string, text: string, placeholder: string = "", isPassword = false) => {
  const result = await Swal.fire({
    title,
    html: text,
    input: 'text',
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#374151',
    confirmButtonText: 'Save',
    cancelButtonText: 'Cancel',
    background: '#111827',
    color: '#ffffff',
    customClass: {
      popup: '!rounded-3xl !border !border-gray-800 !shadow-2xl',
      title: '!text-xl !font-bold',
      input: '!bg-gray-950 !border-gray-800 !text-white !rounded-xl !focus:border-blue-500 !font-mono !text-center !tracking-widest !text-xl',
      confirmButton: '!rounded-xl !font-bold !px-6 !py-3',
      cancelButton: '!rounded-xl !font-bold !px-6 !py-3 !text-gray-300 hover:!bg-gray-600',
    }
  });

  return result.isConfirmed ? result.value : null;
};

export const showAlert = async (title: string, text?: string, icon: 'success' | 'error' | 'info' | 'warning' = 'error') => {
  await Swal.fire({
    title,
    html: text,
    icon,
    confirmButtonColor: '#2563eb',
    background: '#111827',
    color: '#ffffff',
    customClass: {
      popup: '!rounded-3xl !border !border-gray-800 !shadow-2xl',
      title: '!text-xl !font-bold',
      confirmButton: '!rounded-xl !font-bold !px-6 !py-3',
    }
  });
};
