import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAuth } from "@shinederu/auth-react";
import { LoginPanel } from "@/components/LoginPanel";
import { UserAccessPanel } from "@/components/UserAccessPanel";
import { wakeApi } from "@/lib/api";
import type { WakeAccessUser, WakePermissionLevel, WakeDevice, WakeStatus } from "@/types/api";

type DeviceFormState = {
  name: string;
  mac_address: string;
  target_ip: string;
  broadcast_address: string;
  port: string;
  description: string;
  is_enabled: boolean;
  sort_order: string;
};

type NoticeState = {
  kind: "success" | "error" | "info";
  text: string;
} | null;

const EMPTY_FORM: DeviceFormState = {
  name: "",
  mac_address: "",
  target_ip: "",
  broadcast_address: "",
  port: "9",
  description: "",
  is_enabled: true,
  sort_order: "0",
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "Jamais";
  }

  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const sanitizeMacInput = (value: string): string => {
  return value
    .replace(/[^0-9a-fA-F]/g, "")
    .toUpperCase()
    .slice(0, 12)
    .replace(/(.{2})(?=.)/g, "$1-");
};

const mapDeviceToForm = (device: WakeDevice): DeviceFormState => ({
  name: device.name,
  mac_address: device.mac_address,
  target_ip: device.target_ip,
  broadcast_address: device.broadcast_address,
  port: String(device.port),
  description: device.description,
  is_enabled: device.is_enabled,
  sort_order: String(device.sort_order),
});

const normalizeForm = (form: DeviceFormState) => ({
  name: form.name.trim(),
  mac_address: form.mac_address.trim(),
  target_ip: form.target_ip.trim(),
  broadcast_address: form.broadcast_address.trim(),
  port: Number(form.port || 9),
  description: form.description.trim(),
  is_enabled: form.is_enabled,
  sort_order: Number(form.sort_order || 0),
});

const formatPowerStateLabel = (state: WakeDevice["power_state"]): string => {
  switch (state) {
    case "online":
      return "Allum\u00e9";
    case "offline":
      return "\u00c9teint";
    default:
      return "Ind\u00e9termin\u00e9";
  }
};

function App() {
  const auth = useAuth();
  const [status, setStatus] = useState<WakeStatus | null>(null);
  const [devices, setDevices] = useState<WakeDevice[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeWakeId, setActiveWakeId] = useState<number | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [deletingDeviceId, setDeletingDeviceId] = useState<number | null>(null);
  const [users, setUsers] = useState<WakeAccessUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [form, setForm] = useState<DeviceFormState>(EMPTY_FORM);
  const deferredUserSearch = useDeferredValue(userSearch);

  const canManage = status?.can_manage ?? false;
  const canWake = status?.can_wake ?? false;
  const isAuthenticated = status?.authenticated ?? false;

  const sortedDevices = useMemo(
    () =>
      [...devices].sort((left, right) => {
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }

        return left.name.localeCompare(right.name, "fr", { sensitivity: "base" });
      }),
    [devices]
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = deferredUserSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) => {
      const haystack = `${user.username} ${user.email}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [deferredUserSearch, users]);

  const onlineDeviceCount = useMemo(
    () => devices.filter((device) => device.power_state === "online").length,
    [devices]
  );

  const latestWakeAt = useMemo(() => {
    const timestamps = devices
      .map((device) => device.last_wake_at)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value.replace(" ", "T")).getTime())
      .filter((value) => !Number.isNaN(value));

    if (timestamps.length === 0) {
      return null;
    }

    return new Date(Math.max(...timestamps)).toISOString();
  }, [devices]);

  const accountLabel = status?.is_global_admin
    ? "Admin global"
    : canManage
      ? "Gestion du panel"
      : "R\u00e9veil uniquement";

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingDeviceId(null);
  };

  const loadData = async (showRefreshState = false) => {
    if (showRefreshState) {
      setIsRefreshing(true);
    }

    try {
      const statusResponse = await wakeApi.getStatus();

      if (!statusResponse.ok || !statusResponse.data) {
        setStatus({
          authenticated: false,
          can_wake: false,
          can_manage: false,
          is_global_admin: false,
          user: null,
        });
        setDevices([]);
        if (statusResponse.error) {
          setNotice({ kind: "error", text: statusResponse.error });
        }
        return;
      }

      setStatus(statusResponse.data);

      if (!statusResponse.data.authenticated || !statusResponse.data.can_wake) {
        setDevices([]);
        setUsers([]);
        return;
      }

      const [devicesResponse, usersResponse] = await Promise.all([
        wakeApi.listDevices(),
        statusResponse.data.can_manage ? wakeApi.listUsers() : Promise.resolve(null),
      ]);

      if (!devicesResponse.ok || !devicesResponse.data) {
        setDevices([]);
        setNotice({
          kind: "error",
          text: devicesResponse.error ?? "Impossible de charger les machines autoris\u00e9es.",
        });
        return;
      }

      setDevices(devicesResponse.data);

      if (!statusResponse.data.can_manage) {
        setUsers([]);
        return;
      }

      if (!usersResponse?.ok || !usersResponse.data) {
        setUsers([]);
        setNotice({
          kind: "error",
          text: usersResponse?.error ?? "Impossible de charger les utilisateurs autoris\u00e9s.",
        });
        return;
      }

      setUsers(usersResponse.data);
    } finally {
      setIsBooting(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const handleLogin = async (username: string, password: string) => {
    if (!username || !password) {
      setLoginError("Le pseudo/email et le mot de passe sont obligatoires.");
      return;
    }

    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const response = await auth.login({ username, password });
      if (!response.ok) {
        setLoginError(response.error ?? "Connexion refus\u00e9e.");
        return;
      }

      await loadData();
      setNotice({ kind: "success", text: "Session ouverte." });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    setIsRefreshing(true);

    try {
      await auth.logout();
    } finally {
      resetForm();
      setDevices([]);
      setUsers([]);
      setStatus({
        authenticated: false,
        can_wake: false,
        can_manage: false,
        is_global_admin: false,
        user: null,
      });
      setIsRefreshing(false);
    }
  };

  const handleWake = async (deviceId: number) => {
    setActiveWakeId(deviceId);

    try {
      const response = await wakeApi.wakeDevice(deviceId);
      if (!response.ok) {
        setNotice({
          kind: "error",
          text: response.error ?? "Le paquet WOL n'a pas pu \u00eatre envoy\u00e9.",
        });
        return;
      }

      setNotice({ kind: "success", text: "Magic packet envoy\u00e9." });
      await loadData();
    } finally {
      setActiveWakeId(null);
    }
  };

  const handleSubmitDevice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSavingDevice(true);

    try {
      const payload = normalizeForm(form);
      const response =
        editingDeviceId === null
          ? await wakeApi.createDevice(payload)
          : await wakeApi.updateDevice(editingDeviceId, payload);

      if (!response.ok) {
        setNotice({ kind: "error", text: response.error ?? "Enregistrement impossible." });
        return;
      }

      setNotice({
        kind: "success",
        text: editingDeviceId === null ? "Machine ajout\u00e9e." : "Machine mise \u00e0 jour.",
      });
      resetForm();
      await loadData();
    } finally {
      setIsSavingDevice(false);
    }
  };

  const handleDeleteDevice = async (deviceId: number) => {
    if (!window.confirm("Supprimer cette machine du panel ?")) {
      return;
    }

    setDeletingDeviceId(deviceId);

    try {
      const response = await wakeApi.deleteDevice(deviceId);
      if (!response.ok) {
        setNotice({ kind: "error", text: response.error ?? "Suppression impossible." });
        return;
      }

      if (editingDeviceId === deviceId) {
        resetForm();
      }

      setNotice({ kind: "success", text: "Machine supprim\u00e9e." });
      await loadData();
    } finally {
      setDeletingDeviceId(null);
    }
  };

  const handleUpdateUserPermission = async (userId: number, level: WakePermissionLevel) => {
    setUpdatingUserId(userId);
    setIsLoadingUsers(true);

    try {
      const payload = {
        can_wake: level === "wake" || level === "manage",
        can_manage: level === "manage",
      };
      const response = await wakeApi.updateUserPermissions(userId, payload);

      if (!response.ok) {
        setNotice({
          kind: "error",
          text: response.error ?? "Mise \u00e0 jour des permissions impossible.",
        });
        return;
      }

      setNotice({ kind: "success", text: "Permissions utilisateur mises \u00e0 jour." });
      await loadData(true);
    } finally {
      setUpdatingUserId(null);
      setIsLoadingUsers(false);
    }
  };

  if (isBooting) {
    return (
      <main className="shell loading-shell">
        <section className="panel login-panel">
          <div className="eyebrow">Boot Sequence</div>
          <h1>ShinedeWake</h1>
          <p className="lede">Lecture de la session et synchronisation des machines...</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="shell">
        <div className="background-orbit orbit-a" />
        <div className="background-orbit orbit-b" />
        <LoginPanel isBusy={isAuthenticating} error={loginError} onSubmit={handleLogin} />
      </main>
    );
  }

  if (!canWake) {
    return (
      <main className="shell">
        <div className="background-orbit orbit-a" />
        <div className="background-orbit orbit-b" />
        <section className="panel login-panel">
          <div className="eyebrow">{"Filtre d'acc\u00e8s"}</div>
          <h1>{"Acc\u00e8s refus\u00e9"}</h1>
          <p className="lede">
            {"La session est valide, mais aucun droit ShinedeWake n'est attach\u00e9 \u00e0 ce compte."}
          </p>
          <div className="locked-user">
            <strong>{status?.user?.username ?? "Utilisateur inconnu"}</strong>
            <span>{status?.user?.email ?? ""}</span>
          </div>
          <button className="secondary-button wide-button" onClick={handleLogout}>
            {"Se d\u00e9connecter"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell app-shell">
      <div className="background-orbit orbit-a" />
      <div className="background-orbit orbit-b" />

      <header className="topbar">
        <div>
          <div className="eyebrow">Wake-on-LAN Control</div>
          <h1>ShinedeWake</h1>
        </div>

        <div className="topbar-actions">
          <div className="user-chip">
            <strong>{status?.user?.username ?? "Session"}</strong>
            <span>{accountLabel}</span>
          </div>
          <button className="secondary-button" onClick={() => void loadData(true)} disabled={isRefreshing}>
            {isRefreshing ? "Actualisation..." : "Actualiser"}
          </button>
          <button className="secondary-button danger-button" onClick={handleLogout}>
            Quitter
          </button>
        </div>
      </header>

      {notice ? <div className={`notice ${notice.kind}`}>{notice.text}</div> : null}

      <section className="hero-grid">
        <article className="panel hero-panel">
          <p className="hero-kicker">Parc Wake-on-LAN</p>
          <h2>{"D\u00e9marre les postes autoris\u00e9s en un clic."}</h2>
          <p className="lede">
            {"L'\u00e9tat r\u00e9seau est v\u00e9rifi\u00e9 automatiquement et l'API envoie le Magic Packet depuis le LAN."}
          </p>
          <div className="hero-stats">
            <div>
              <span>Machines</span>
              <strong>{devices.length}</strong>
            </div>
            <div>
              <span>{"Allum\u00e9es"}</span>
              <strong>{onlineDeviceCount}</strong>
            </div>
            <div>
              <span>{"Dernier r\u00e9veil"}</span>
              <strong>{latestWakeAt ? formatDateTime(latestWakeAt) : "Jamais"}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="workspace-grid">
        <section className="panel devices-panel">
          <div className="section-head">
            <h3>{"Machines r\u00e9veillables"}</h3>
            <span className="mono-label">{devices.length} cibles</span>
          </div>

          {sortedDevices.length === 0 ? (
            <div className="empty-state">
              <h4>{"Aucune machine configur\u00e9e"}</h4>
              <p>{"Ajoute une premi\u00e8re cible WOL pour commencer."}</p>
            </div>
          ) : (
            <div className="device-grid">
              {sortedDevices.map((device) => (
                <article key={device.id} className={`device-card ${device.is_enabled ? "" : "device-card-disabled"}`}>
                  <div className="device-card-layout">
                    <div className="device-main-column">
                      <div className="device-card-head">
                        <div>
                          <h4>{device.name}</h4>
                          <p className={`status-line status-${device.power_state}`}>
                            {formatPowerStateLabel(device.power_state)}
                          </p>
                        </div>
                      </div>

                      <dl className="device-meta compact-meta">
                        <div>
                          <dt>IP</dt>
                          <dd>{device.target_ip || "-"}</dd>
                        </div>
                        <div>
                          <dt>{"Dernier r\u00e9veil"}</dt>
                          <dd>{formatDateTime(device.last_wake_at)}</dd>
                        </div>
                      </dl>

                      <div className="device-actions">
                        <button
                          className="primary-button"
                          disabled={!device.is_enabled || activeWakeId === device.id}
                          onClick={() => void handleWake(device.id)}
                        >
                          {activeWakeId === device.id ? "Envoi..." : "Allumer"}
                        </button>

                        {canManage ? (
                          <>
                            <button
                              className="secondary-button"
                              onClick={() => {
                                setEditingDeviceId(device.id);
                                setForm(mapDeviceToForm(device));
                              }}
                            >
                              Modifier
                            </button>
                            <button
                              className="secondary-button danger-button"
                              disabled={deletingDeviceId === device.id}
                              onClick={() => void handleDeleteDevice(device.id)}
                            >
                              {deletingDeviceId === device.id ? "Suppression..." : "Supprimer"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="device-sidepanel">
                      <span className="device-side-label">Description</span>
                      <p className="device-description">{device.description || "Aucune description."}</p>
                      {device.power_state === "unknown" && device.power_state_reason ? (
                        <p className="helper-note">
                          {"Statut r\u00e9el indisponible: "}
                          {device.power_state_reason}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {canManage ? (
          <aside className="panel admin-panel">
            <div className="section-head">
              <h3>{editingDeviceId === null ? "Nouvelle machine" : "Modifier la machine"}</h3>
              <span className="mono-label">{editingDeviceId === null ? "CREATE" : "EDIT"}</span>
            </div>

            <form className="device-form" onSubmit={handleSubmitDevice}>
              <label>
                <span>Nom</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>

              <label>
                <span>Adresse MAC</span>
                <input
                  type="text"
                  placeholder="50-EB-F6-B3-5F-BB"
                  value={form.mac_address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mac_address: sanitizeMacInput(event.target.value),
                    }))
                  }
                  required
                />
              </label>

              <label>
                <span>IP cible</span>
                <input
                  type="text"
                  placeholder="192.168.10.30"
                  value={form.target_ip}
                  onChange={(event) => setForm((current) => ({ ...current, target_ip: event.target.value }))}
                />
              </label>

              <label>
                <span>Adresse de broadcast</span>
                <input
                  type="text"
                  placeholder="192.168.10.255"
                  value={form.broadcast_address}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, broadcast_address: event.target.value }))
                  }
                />
              </label>

              <div className="field-row">
                <label>
                  <span>Port</span>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={form.port}
                    onChange={(event) => setForm((current) => ({ ...current, port: event.target.value }))}
                  />
                </label>

                <label>
                  <span>Ordre</span>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, sort_order: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))}
                />
                <span>{"Machine activ\u00e9e dans le panel"}</span>
              </label>

              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={isSavingDevice}>
                  {isSavingDevice ? "Enregistrement..." : editingDeviceId === null ? "Ajouter" : "Sauvegarder"}
                </button>
                <button type="button" className="secondary-button" onClick={resetForm}>
                  {"R\u00e9initialiser"}
                </button>
              </div>
            </form>
          </aside>
        ) : null}
      </section>

      {canManage ? (
        <section className="panel users-panel">
          <UserAccessPanel
            users={filteredUsers}
            isLoading={isLoadingUsers}
            search={userSearch}
            onSearchChange={setUserSearch}
            updatingUserId={updatingUserId}
            onLevelChange={handleUpdateUserPermission}
          />
        </section>
      ) : null}
    </main>
  );
}

export default App;
