"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { Bell, CheckCheck } from "lucide-react";
import {
  apiRequest,
  notificationDestination,
  notificationTypeLabel,
  relativeTime,
  type NotificationRecord
} from "../../../lib/api";
import { getSocket } from "../../../lib/socket";

type Filter = "all" | "unread";

export function NotificationsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";

  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function href(path: string) {
    return locale === "ar" ? path : `${path}?lang=en`;
  }

  const load = useCallback((activeFilter: Filter) => {
    setLoading(true);
    apiRequest<NotificationRecord[]>(`/notifications${activeFilter === "unread" ? "?status=unread" : ""}`)
      .then((result) => {
        setItems(result);
        setError("");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  useEffect(() => {
    const socket = getSocket();
    const onNew = () => load(filter);
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [filter]);

  function onSelect(notification: NotificationRecord) {
    if (!notification.readAt) {
      apiRequest(`/notifications/${notification.id}/read`, { method: "PATCH", body: "{}" }).catch(() => undefined);
      setItems((prev) => prev.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)));
    }
    const destination = notificationDestination(notification);
    if (destination) router.push(href(destination));
  }

  function markAllRead() {
    apiRequest<{ ok: true }>("/notifications/read-all", { method: "PATCH", body: "{}" })
      .then(() => load(filter))
      .catch(() => undefined);
  }

  const labels = useMemo(
    () =>
      ar
        ? {
            title: "الإشعارات",
            lead: "جميع الإشعارات المتعلقة بمشاريعك.",
            all: "الكل",
            unread: "غير مقروءة",
            markAll: "تحديد الكل كمقروء",
            empty: "لا توجد إشعارات",
            emptyHint: "ستظهر هنا الإشعارات المتعلقة بمشاريعك."
          }
        : {
            title: "Notifications",
            lead: "All notifications related to your projects.",
            all: "All",
            unread: "Unread",
            markAll: "Mark all as read",
            empty: "No notifications",
            emptyHint: "Notifications related to your projects will appear here."
          },
    [ar]
  );

  const timeFormatter = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="app-page">
      <PageHeader title={labels.title} description={labels.lead} />

      <div className="notifications-toolbar">
        <div className="notifications-filter">
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
            {labels.all}
          </button>
          <button type="button" className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>
            {labels.unread}
          </button>
        </div>
        <button type="button" className="ui-button ui-button--secondary ui-button--sm" onClick={markAllRead}>
          <CheckCheck size={14} /> {labels.markAll}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <LoadingState label={labels.title} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell size={20} />} title={labels.empty} description={labels.emptyHint} />
      ) : (
        <div className="notifications-list">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`notifications-row${item.readAt ? "" : " notifications-row--unread"}`}
              onClick={() => onSelect(item)}
            >
              <span className="notifications-row__type">{notificationTypeLabel(item.type, locale)}</span>
              <span className="notifications-row__title">{item.title}</span>
              {item.project && (
                <span className="notifications-row__project mono">{item.project.code ?? item.project.name}</span>
              )}
              <span className="notifications-row__time">
                {timeFormatter.format(new Date(item.createdAt))} · {relativeTime(item.createdAt, locale)}
              </span>
            </button>
          ))}
        </div>
      )}

      <Link className="lang-link" href={href("/app")}>
        {ar ? "العودة إلى لوحة التحكم" : "Back to dashboard"}
      </Link>
    </section>
  );
}
