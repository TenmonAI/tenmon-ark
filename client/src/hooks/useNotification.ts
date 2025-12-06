import { useEffect, useState } from "react";
import { toast } from "sonner";

interface NotificationOptions {
  title: string;
  message: string;
  type?: "warning" | "error" | "info" | "success";
}

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if browser supports notifications
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return "denied";
  };

  const showNotification = (options: NotificationOptions) => {
    const { title, message, type = "info" } = options;

    // Show toast notification
    switch (type) {
      case "warning":
        toast.warning(title, { description: message });
        break;
      case "error":
        toast.error(title, { description: message });
        break;
      case "success":
        toast.success(title, { description: message });
        break;
      default:
        toast.info(title, { description: message });
    }

    // Show browser notification if permission granted
    if (permission === "granted" && "Notification" in window) {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico",
        tag: `tenmon-ark-${type}`,
        requireInteraction: type === "error" || type === "warning",
      });
    }
  };

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported: "Notification" in window,
  };
}
