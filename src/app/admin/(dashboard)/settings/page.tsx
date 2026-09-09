"use client";

import { useEffect, useState } from "react";
import SettingsForm from "@/components/admin/SettingsForm";
import { authFetch } from "@/lib/api-base";

export default function SettingsPage() {
  const [username, setUsername] = useState("admin");

  useEffect(() => {
    let alive = true;
    authFetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("unauthorized"))))
      .then((d) => alive && setUsername(d.username))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return <SettingsForm username={username} />;
}
