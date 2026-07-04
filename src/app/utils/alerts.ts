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
      popup: '!rounded-3xl !shadow-2xl swal-3d-popup',
      title: '!text-xl !font-bold',
      confirmButton: '!rounded-xl !font-bold !px-6 !py-3 swal-btn-3d',
      cancelButton: '!rounded-xl !font-bold !px-6 !py-3 !text-gray-300 hover:!bg-gray-600 swal-btn-3d',
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

export const triggerLockout = () => {
  const lockoutUntil = Date.now() + 60 * 1000; // 1 minute from now
  localStorage.setItem('lockoutUntil', lockoutUntil.toString());
  showLockoutAlert();
};

export const checkLockout = () => {
  const lockoutUntilStr = localStorage.getItem('lockoutUntil');
  if (lockoutUntilStr) {
    const lockoutUntil = parseInt(lockoutUntilStr, 10);
    if (lockoutUntil > Date.now()) {
      showLockoutAlert();
      return true;
    } else {
      localStorage.removeItem('lockoutUntil');
    }
  }
  return false;
};

const showLockoutAlert = () => {
  // If an alert is already open, don't open another one
  if (Swal.isVisible() && Swal.getTitle()?.textContent === 'Security Lockout') return;

  Swal.fire({
    title: 'Security Lockout',
    html: 'Too many failed login attempts.<br>For your protection, this device has been temporarily blocked.<br><br>Please wait: <b class="text-3xl text-red-400 font-black tracking-widest"></b><br><br><span class="text-xs text-gray-500">Refreshing the page will not bypass this timer.</span>',
    icon: 'error',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    background: '#111827',
    color: '#ffffff',
    customClass: {
      popup: '!rounded-3xl !border-2 !border-red-900/50 !shadow-[0_0_60px_rgba(220,38,38,0.15)]',
      title: '!text-2xl !font-black !text-red-500',
    },
    didOpen: () => {
      const b = Swal.getHtmlContainer()?.querySelector('b');
      const timerInterval = setInterval(() => {
        const lockoutUntil = parseInt(localStorage.getItem('lockoutUntil') || '0', 10);
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        
        if (remaining <= 0) {
          clearInterval(timerInterval);
          localStorage.removeItem('lockoutUntil');
          Swal.close();
        } else if (b) {
          // Format as MM:SS
          const m = Math.floor(remaining / 60).toString().padStart(2, '0');
          const s = (remaining % 60).toString().padStart(2, '0');
          b.textContent = `${m}:${s}`;
        }
      }, 100);
    }
  });
};
