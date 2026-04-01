import { useState, useEffect, useCallback } from "react";

export type MemberSession = { id: number; name: string; email: string; role: string } | null;

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export function useAuth() {
  const [member, setMember] = useState<MemberSession>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setMember(data);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || "Login failed");
    }
    const data = await res.json();
    setMember(data);
    return data;
  }, []);

  const register = useCallback(async (fields: {
    name: string; email: string; password: string;
    phone?: string; bio?: string; favoriteBourbons?: string;
  }) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || "Registration failed");
    }
    const data = await res.json();
    setMember(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
    setMember(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || "Password change failed");
    }
    return res.json();
  }, []);

  return { member, checked, login, register, logout, changePassword };
}
