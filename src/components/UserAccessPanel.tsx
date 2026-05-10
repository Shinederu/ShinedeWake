import type { WakeAccessUser, WakePermissionLevel } from "@/types/api";

type UserAccessPanelProps = {
  users: WakeAccessUser[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  updatingUserId: number | null;
  onLevelChange: (userId: number, level: WakePermissionLevel) => void;
};

const formatPermissionLabel = (user: WakeAccessUser): string => {
  if (user.is_global_admin) {
    return "Admin global";
  }

  if (user.permission_level === "manage") {
    return "Gestion";
  }

  if (user.permission_level === "wake") {
    return "R\u00e9veil";
  }

  return "Aucun acc\u00e8s";
};

const formatPermissionSource = (user: WakeAccessUser): string => {
  if (user.is_global_admin) {
    return "H\u00e9rit\u00e9 du r\u00f4le global";
  }

  if (user.has_dedicated_entry) {
    return "R\u00e8gle d\u00e9di\u00e9e ShinedeWake";
  }

  return "Aucune autorisation d\u00e9di\u00e9e";
};

export function UserAccessPanel({
  users,
  isLoading,
  search,
  onSearchChange,
  updatingUserId,
  onLevelChange,
}: UserAccessPanelProps) {
  return (
    <>
      <div className="section-head">
        <h3>{"Acc\u00e8s utilisateurs"}</h3>
        <span className="mono-label">{users.length} comptes</span>
      </div>

      <p className="lede">
        {"Les admins globaux restent toujours autoris\u00e9s. Pour les autres comptes, choisis le niveau d'acc\u00e8s au panel."}
      </p>

      <div className="users-toolbar">
        <label className="users-search">
          <span>Recherche</span>
          <input
            type="search"
            placeholder="Pseudo ou email"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <h4>Chargement des comptes</h4>
          <p>Lecture des utilisateurs et de leurs permissions ShinedeWake...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h4>Aucun compte correspondant</h4>
          <p>{"Affinez la recherche ou cr\u00e9e un utilisateur dans l'auth globale."}</p>
        </div>
      ) : (
        <div className="users-grid">
          {users.map((user) => (
            <article key={user.id} className="user-card">
              <div className="user-card-head">
                <div>
                  <h4>{user.username}</h4>
                  <p>{user.email || "Aucun email renseign\u00e9."}</p>
                </div>
                <span className={`permission-pill permission-${user.permission_source}`}>
                  {formatPermissionLabel(user)}
                </span>
              </div>

              <dl className="user-meta">
                <div>
                  <dt>Identifiant</dt>
                  <dd>#{user.id}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{formatPermissionSource(user)}</dd>
                </div>
              </dl>

              <div className="user-select-row">
                <label>
                  <span>{"Acc\u00e8s panel"}</span>
                  <select
                    className="inline-select"
                    value={user.is_global_admin ? "manage" : user.permission_level}
                    disabled={user.is_global_admin || updatingUserId === user.id}
                    onChange={(event) =>
                      onLevelChange(user.id, event.target.value as WakePermissionLevel)
                    }
                  >
                    <option value="none">{"Aucun acc\u00e8s"}</option>
                    <option value="wake">{"R\u00e9veil uniquement"}</option>
                    <option value="manage">{"Gestion compl\u00e8te"}</option>
                  </select>
                </label>

                <p className="helper-note">
                  {user.is_global_admin
                    ? "Compte verrouill\u00e9: les admins globaux conservent l'acc\u00e8s complet."
                    : "Le niveau Gestion inclut automatiquement le droit de r\u00e9veil."}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
