"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import {
  apiRequest,
  notificationDestination,
  notificationTypeLabel,
  relativeTime,
  type NotificationRecord
} from "../lib/api";
import { getSocket } from "../lib/socket";

type NotificationBellProps = {
  locale: "ar" | "en";
};

export function NotificationBell({ locale }: NotificationBellProps) {
  const router = useRouter();
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function href(path: string) {
    return locale === "ar" ? path : `${path}?lang=en`;
  }

  function refreshCount() {
    apiRequest<{ count: number }>("/notifications/unread-count")
      .then((result) => setCount(result.count))
      .catch(() => undefined);
  }

  useEffect(() => {
    refreshCount();
    const socket = getSocket();

    const onNew = (payload: { unreadCount: number }) => setCount(payload.unreadCount);
    const onUnreadCount = (payload: { unreadCount: number }) => setCount(payload.unreadCount);
    const onConnect = () => refreshCount();

    socket.on("notification:new", onNew);
    socket.on("notification:unread_count", onUnreadCount);
    socket.on("connect", onConnect);

    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:unread_count", onUnreadCount);
      socket.off("connect", onConnect);
    };
  }, []);

  useEffect(() => {
    function onOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      apiRequest<NotificationRecord[]>("/notifications")
        .then((result) => {
          setItems(result.slice(0, 8));
          setLoaded(true);
        })
        .catch(() => undefined);
    }
  }

  function onSelect(notification: NotificationRecord) {
    setOpen(false);
    if (!notification.readAt) {
      apiRequest(`/notifications/${notification.id}/read`, { method: "PATCH", body: "{}" }).catch(() => undefined);
      setItems((prev) => prev.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)));
    }
    const destination = notificationDestination(notification);
    if (destination) router.push(href(destination));
  }

  function markAllRead() {
    apiRequest<{ ok: true; unreadCount: number }>("/notifications/read-all", { method: "PATCH", body: "{}" })
      .then((result) => {
        setCount(result.unreadCount);
        setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      })
      .catch(() => undefined);
  }

  const labels = ar
    ? { title: "الإشعارات", empty: "لا توجد إشعارات بعد", markAll: "تحديد الكل كمقروء", viewAll: "عرض جميع الإشعارات" }
    : { title: "Notifications", empty: "No notifications yet", markAll: "Mark all as read", viewAll: "View all notifications" };

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="notification-bell__trigger"
        onClick={toggle}
        aria-label={labels.title}
        aria-expanded={open}
      >
        <Bell size={18} />
        {count > 0 && <span className="notification-bell__badge">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="menu">
          <div className="notification-panel__header">
            <strong>{labels.title}</strong>
            {count > 0 && (
              <button type="button" className="notification-panel__mark-all" onClick={markAllRead}>
                <CheckCheck size={14} /> {labels.markAll}
              </button>
            )}
          </div>
          <div className="notification-panel__list">
            {items.length === 0 && <p className="notification-panel__empty">{labels.empty}</p>}
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`notification-panel__item${item.readAt ? "" : " notification-panel__item--unread"}`}
                onClick={() => onSelect(item)}
              >
                <span className="notification-panel__item-top">
                  <span className="notification-panel__item-type">{notificationTypeLabel(item.type, locale)}</span>
                  <span className="notification-panel__item-time">{relativeTime(item.createdAt, locale)}</span>
                </span>
                <span className="notification-panel__item-title">{item.title}</span>
                {item.project && <span className="notification-panel__item-project mono">{item.project.code ?? item.project.name}</span>}
              </button>
            ))}
          </div>
          <Link className="notification-panel__footer" href={href("/app/notifications")} onClick={() => setOpen(false)}>
            {labels.viewAll}
          </Link>
        </div>
      )}
    </div>
  );
}
