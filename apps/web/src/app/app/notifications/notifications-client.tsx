"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingState } from "@elhabak/ui";
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
            emptyHint: "ستظهر هنا الإشعارات المتعلقة بمشاريعك.",
            today: "اليوم",
            yesterday: "أمس",
            earlier: "سابقاً"
          }
        : {
            title: "Notifications",
            lead: "All notifications related to your projects.",
            all: "All",
            unread: "Unread",
            markAll: "Mark all as read",
            empty: "No notifications",
            emptyHint: "Notifications related to your projects will appear here.",
            today: "Today",
            yesterday: "Yesterday",
            earlier: "Earlier"
          },
    [ar]
  );

  const timeFormatter = new Intl.DateTimeFormat(ar ? "ar-EG-u-nu-latn" : "en-US", { dateStyle: "medium", timeStyle: "short" });

  // Group by calendar day: Today / Yesterday / Earlier for scannable review.
  const groups = useMemo(() => {
    const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const today = dayStart(new Date());
    const buckets: Array<{ label: string; items: NotificationRecord[] }> = [
      { label: labels.today, items: [] },
      { label: labels.yesterday, items: [] },
      { label: labels.earlier, items: [] }
    ];
    for (const item of items) {
      const day = dayStart(new Date(item.createdAt));
      if (day === today) buckets[0]!.items.push(item);
      else if (day === today - 86400000) buckets[1]!.items.push(item);
      else buckets[2]!.items.push(item);
    }
    return buckets.filter((bucket) => bucket.items.length > 0);
  }, [items, labels]);

  return (
    <section className="app-page notifications-page">
      <div className="admin-command-strip">
        <div>
          <span className="section-kicker">{ar ? "مركز التنبيهات والإشعارات" : "Notifications & Alerts"}</span>
          <strong>{labels.title}</strong>
          <span className="admin-command-strip__subtitle">{labels.lead}</span>
        </div>
      </div>

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
        <Link className="notifications-back-link" href={href("/app")}>
          {ar ? "العودة إلى لوحة التحكم" : "Back to dashboard"}
        </Link>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <LoadingState label={labels.title} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell size={20} />} title={labels.empty} description={labels.emptyHint} />
      ) : (
        <div className="notifications-list">
          {groups.map((group) => (
            <section className="notification-group" key={group.label}>
              <h3 className="notification-group__header">
                {group.label} <span className="mono">{group.items.length}</span>
              </h3>
              {group.items.map((item) => (
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
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
