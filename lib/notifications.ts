import Swal from 'sweetalert2';

export interface NotificationOptions {
  title?: string;
  text?: string;
  html?: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  timer?: number;
  showConfirmButton?: boolean;
  confirmButtonText?: string;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  customClass?: {
    popup?: string;
    title?: string;
    htmlContainer?: string;
    confirmButton?: string;
    cancelButton?: string;
  };
}

class NotificationService {
  private defaultOptions: Partial<NotificationOptions> = {
    // timer: 3000,
    showConfirmButton: false,
    customClass: {
      popup: 'swal2-popup-custom',
      title: 'swal2-title-custom',
      htmlContainer: 'swal2-html-container-custom',
      confirmButton: 'swal2-confirm-custom',
      cancelButton: 'swal2-cancel-custom',
    },
  };

  // Success notification
  success(
    title: string,
    text?: string,
    options?: Partial<Omit<NotificationOptions, 'icon' | 'title' | 'text'>>
  ) {
    return Swal.fire({
      ...this.defaultOptions,
      ...options,
      title,
      text,
      icon: 'success',
    });
  }

  // Error notification
  error(
    title: string,
    text?: string,
    options?: Partial<Omit<NotificationOptions, 'icon' | 'title' | 'text'>>
  ) {
    return Swal.fire({
      ...this.defaultOptions,
      ...options,
      title,
      text,
      icon: 'error',
      showConfirmButton: true,
      confirmButtonText: 'OK',
    });
  }

  // Warning notification
  warning(
    title: string,
    text?: string,
    options?: Partial<Omit<NotificationOptions, 'icon' | 'title' | 'text'>>
  ) {
    return Swal.fire({
      ...this.defaultOptions,
      ...options,
      title,
      text,
      icon: 'warning',
      showConfirmButton: true,
      confirmButtonText: 'OK',
    });
  }

  // Info notification
  info(
    title: string,
    text?: string,
    options?: Partial<Omit<NotificationOptions, 'icon' | 'title' | 'text'>>
  ) {
    return Swal.fire({
      ...this.defaultOptions,
      ...options,
      title,
      text,
      icon: 'info',
    });
  }

  // Confirmation dialog
  confirm(
    options: NotificationOptions & { confirmButtonText?: string; cancelButtonText?: string }
  ) {
    return Swal.fire({
      ...this.defaultOptions,
      ...options,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'Yes',
      cancelButtonText: options.cancelButtonText || 'Cancel',
      showConfirmButton: true,
    });
  }

  // Loading notification
  loading(options: Partial<NotificationOptions> = {}) {
    return Swal.fire({
      ...this.defaultOptions,
      ...options,
      title: options.title || 'Loading...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }

  // Close current notification
  close() {
    Swal.close();
  }

  // Toast notification (smaller, positioned)
  toast(options: NotificationOptions) {
    return Swal.fire({
      ...options,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: options.timer || 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal2-toast-custom',
        ...options.customClass,
      },
    });
  }
}

// Create singleton instance
export const notifications = new NotificationService();

// Export individual functions for convenience (bound to instance)
export const success = notifications.success.bind(notifications);
export const error = notifications.error.bind(notifications);
export const warning = notifications.warning.bind(notifications);
export const info = notifications.info.bind(notifications);
export const confirm = notifications.confirm.bind(notifications);
export const loading = notifications.loading.bind(notifications);
export const close = notifications.close.bind(notifications);
export const toast = notifications.toast.bind(notifications);

// Common notification presets
export const notify = {
  // User switch notifications
  switchUserError: () =>
    notifications.toast({
      title: 'Error',
      text: 'Failed to switch user. Please try again.',
      icon: 'error',
      timer: 3000,
    }),

  switchBackSuccess: () =>
    notifications.toast({
      title: 'Success',
      text: 'Successfully switched back to admin account. The page will reload.',
      icon: 'success',
      timer: 3000,
    }),

  switchBackError: () =>
    notifications.toast({
      title: 'Error',
      text: 'Failed to switch back to admin. Please try again.',
      icon: 'error',
      timer: 3000,
    }),

  // Generic notifications
  success: (message: string) =>
    notifications.toast({ title: 'Success', text: message, icon: 'success', timer: 3000 }),

  saved: () =>
    notifications.toast({
      title: 'Saved',
      text: 'Changes have been saved successfully.',
      icon: 'success',
      timer: 3000,
    }),

  deleted: () =>
    notifications.toast({
      title: 'Deleted',
      text: 'Item has been deleted successfully.',
      icon: 'success',
      timer: 3000,
    }),

  updated: () =>
    notifications.toast({
      title: 'Updated',
      text: 'Changes have been updated successfully.',
      icon: 'success',
      timer: 3000,
    }),

  // Single arg:  notify.error('message')            → title='Error',   text='message'
  // Two args:    notify.error('Stock out', 'detail') → title='Stock out', text='detail'
  error: (titleOrMessage?: string, text?: string) =>
    notifications.toast({
      title: text ? (titleOrMessage || 'Error') : 'Error',
      text: text || titleOrMessage || 'An error occurred. Please try again.',
      icon: 'error',
      timer: 3000,
    }),

  // Single arg:  notify.warning('message')           → title='Warning', text='message'
  // Two args:    notify.warning('Title', 'detail')   → title='Title',   text='detail'
  warning: (titleOrMessage?: string, text?: string) =>
    notifications.toast({
      title: text ? (titleOrMessage || 'Warning') : 'Warning',
      text: text || titleOrMessage || 'Please check your input.',
      icon: 'warning',
      timer: 3000,
    }),
};

/*
USAGE EXAMPLES:

// Basic notifications with server-side data
import { success, error, warning, info } from '@/lib/notifications';

// Simple usage
success('Success!', 'Operation completed');
error('Error', 'Something went wrong');
warning('Warning', 'Please check your input');
info('Info', 'Here is some information');

// With additional options
success('Success!', 'Operation completed', { timer: 5000 });
error('Error', 'Something went wrong', { showConfirmButton: false });

// Dynamic server-side notifications
const serverResponse = await apiCall();
if (serverResponse.success) {
  success(serverResponse.title, serverResponse.message);
} else {
  error(serverResponse.title, serverResponse.message);
}

// Example with API response structure
interface ApiResponse {
  success: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

function showApiNotification(response: ApiResponse) {
  const { success, title, message, type = success ? 'success' : 'error' } = response;

  switch (type) {
    case 'success':
      success(title, message);
      break;
    case 'error':
      error(title, message);
      break;
    case 'warning':
      warning(title, message);
      break;
    case 'info':
      info(title, message);
      break;
  }
}

// Confirmation dialogs
import { confirm } from '@/lib/notifications';

const result = await confirm({
  title: 'Are you sure?',
  text: 'This action cannot be undone',
  confirmButtonText: 'Delete',
  cancelButtonText: 'Cancel'
});

if (result.isConfirmed) {
  // User confirmed
}

// Preset notifications
import { notify } from '@/lib/notifications';

notify.saved(); // Shows "Saved!" notification
notify.deleted(); // Shows "Deleted!" notification
notify.error('Custom error message'); // Shows error with custom message

// Loading states
import { loading, close } from '@/lib/notifications';

loading({ title: 'Saving...' });
// ... do async operation ...
close(); // Close loading notification

// Toast notifications
import { toast } from '@/lib/notifications';

toast({
  title: 'Info',
  text: 'This is a toast notification',
  icon: 'info'
});
*/
