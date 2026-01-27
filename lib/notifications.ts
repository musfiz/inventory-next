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
  success(title: string, text?: string, options?: Partial<Omit<NotificationOptions, 'icon' | 'title' | 'text'>>) {
    return Swal.fire({
      ...this.defaultOptions,
      ...options,
      title,
      text,
      icon: 'success',
    });
  }

  // Error notification
  error(title: string, text?: string, options?: Partial<Omit<NotificationOptions, 'icon' | 'title' | 'text'>>) {
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
  warning(title: string, text?: string, options?: Partial<Omit<NotificationOptions, 'icon' | 'title' | 'text'>>) {
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
  info(title: string, text?: string, options?: Partial<Omit<NotificationOptions, 'icon' | 'title' | 'text'>>) {
    return Swal.fire({
      ...this.defaultOptions,
      ...options,
      title,
      text,
      icon: 'info',
    });
  }

  // Confirmation dialog
  confirm(options: NotificationOptions & { confirmButtonText?: string; cancelButtonText?: string }) {
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
    notifications.error('Error', 'Failed to switch user. Please try again.'),

  switchBackSuccess: () =>
    notifications.success(
      'Success!',
      'Successfully switched back to admin account. The page will reload.',
      { timer: 2000 }
    ),

  switchBackError: () =>
    notifications.error('Error', 'Failed to switch back to admin. Please try again.'),

  // Generic notifications
  saved: () =>
    notifications.success('Saved!', 'Changes have been saved successfully.', { timer: 3000 }),

  deleted: () =>
    notifications.success('Deleted!', 'Item has been deleted successfully.', { timer: 3000 }),

  updated: () =>
    notifications.success('Updated!', 'Changes have been updated successfully.', { timer: 3000 }),

  error: (message?: string) =>
    notifications.error('Error', message || 'An error occurred. Please try again.'),
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