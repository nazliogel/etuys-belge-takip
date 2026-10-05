"use client";

import { useEffect, useState } from "react";
import { getSessionUser, type SessionUser } from "@/lib/mock-auth";

import { NotificationsScreen } from "../_components/screens/notifications-screen";

export default function NotificationsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getSessionUser());
  }, []);

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">Bildirimler yükleniyor...</p>
    );
  }

  return <NotificationsScreen role={user.role} />;
}
