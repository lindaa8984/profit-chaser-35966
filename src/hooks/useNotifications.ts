import { useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';

export const useNotifications = () => {
  const { contracts, payments } = useApp();

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('المتصفح لا يدعم الإشعارات');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'property-management',
        requireInteraction: true
      });
    }
  }, []);

  const checkAlerts = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // فحص العقود على وشك الانتهاء (7 أيام)
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const expiringContracts = contracts.filter(contract => {
      const endDate = new Date(contract.endDate);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays > 0;
    });

    if (expiringContracts.length > 0) {
      sendNotification(
        'تنبيه: عقود على وشك الانتهاء',
        `لديك ${expiringContracts.length} عقد ينتهي خلال 7 أيام`
      );
    }

    // فحص الدفعات المستحقة (5 أيام)
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);

    const upcomingPayments = payments.filter(payment => {
      if (payment.status !== 'pending') return false;
      const dueDate = new Date(payment.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= fiveDaysFromNow;
    });

    if (upcomingPayments.length > 0) {
      const totalAmount = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);
      sendNotification(
        'تنبيه: دفعات مجدولة',
        `لديك ${upcomingPayments.length} دفعة مجدولة بإجمالي ${totalAmount.toLocaleString()} ر.س`
      );
    }
  }, [contracts, payments, sendNotification]);

  useEffect(() => {
    // طلب الإذن عند تحميل الصفحة
    requestNotificationPermission();

    // فحص التنبيهات كل ساعة
    const intervalId = setInterval(() => {
      checkAlerts();
    }, 60 * 60 * 1000); // كل ساعة

    // فحص عند التحميل الأول
    setTimeout(() => {
      checkAlerts();
    }, 5000); // بعد 5 ثواني من التحميل

    return () => clearInterval(intervalId);
  }, [requestNotificationPermission, checkAlerts]);

  return {
    requestNotificationPermission,
    sendNotification,
    checkAlerts
  };
};
