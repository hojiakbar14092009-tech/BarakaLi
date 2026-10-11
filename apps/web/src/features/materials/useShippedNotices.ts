import { useEffect, useRef, useState } from 'react';
import type { NotificationDto } from '@barakali/shared';
import { useMarkMaterialsRead, useNotifications } from '../notifications/api';

/**
 * Unread "on its way" notices, captured once when the page opens, then marked read: the banner
 * stays for this visit while the badges clear straight away.
 */
export function useShippedNotices(): NotificationDto[] {
  const notifications = useNotifications();
  const markRead = useMarkMaterialsRead();
  const [notices, setNotices] = useState<NotificationDto[]>([]);
  const captured = useRef(false);

  useEffect(() => {
    const data = notifications.data;
    if (!data || captured.current) return;
    captured.current = true;
    setNotices(data.items.filter((item) => item.kind === 'material_order_shipped' && !item.readAt));
    if (data.unreadMaterials > 0) markRead.mutate();
  }, [notifications.data, markRead]);

  return notices;
}
