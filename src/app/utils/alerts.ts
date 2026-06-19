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

export const showAlert = async (title: string, text?: string, icon: 'success' | 'error' | 'info' | 'warning' = 'error') => {
  await Swal.fire({
    title,
    text,
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
