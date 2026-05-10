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
    return "Reveil";
  }

  return "Aucun acces";
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
        <h3>Acces utilisateurs</h3>
        <span className="mono-label">{users.length} comptes</span>
      </div>

      <p className="lede">
        Les admins globaux restent toujours autorises. Pour les autres comptes, choisis le niveau
        d&apos;acces au panel.
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
          <p>Affinez la recherche ou cree un utilisateur dans l&apos;auth globale.</p>
        </div>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Etat</th>
                <th>Acces panel</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.username}</strong>
                    <div className="table-subline">#{user.id}</div>
                  </td>
                  <td>{user.email || "-"}</td>
                  <td>
                    <span className={`permission-pill permission-${user.permission_source}`}>
                      {formatPermissionLabel(user)}
                    </span>
                  </td>
                  <td>
                    <select
                      className="inline-select"
                      value={user.is_global_admin ? "manage" : user.permission_level}
                      disabled={user.is_global_admin || updatingUserId === user.id}
                      onChange={(event) =>
                        onLevelChange(user.id, event.target.value as WakePermissionLevel)
                      }
                    >
                      <option value="none">Aucun acces</option>
                      <option value="wake">Reveil uniquement</option>
                      <option value="manage">Gestion complete</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
