import { useCallback, useEffect, useState } from "react";
import * as api from "../api/tauri";
import { mapSessionError } from "../lib/sessionErrors";
import type { Profile } from "../types";

export function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [targetMinutes, setTargetMinutes] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, quickId] = await Promise.all([
      api.listProfiles(),
      api.getQuickSessionProfileId(),
    ]);
    setProfiles(list.filter((profile) => profile.id !== quickId));
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(mapSessionError(String(e))));
  }, [load]);

  function resetForm() {
    setName("");
    setColor("");
    setTargetMinutes("");
    setEditingId(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const tgt =
      targetMinutes.trim() === "" ? null : Number.parseInt(targetMinutes, 10);
    if (targetMinutes.trim() !== "" && (Number.isNaN(tgt!) || tgt! < 0)) {
      setError("Daily target must be a non-negative integer (minutes).");
      return;
    }
    try {
      if (editingId) {
        await api.updateProfile({
          id: editingId,
          name,
          color: color.trim() || null,
          dailyTargetMinutes: tgt,
        });
      } else {
        await api.createProfile({
          name,
          color: color.trim() || null,
          dailyTargetMinutes: tgt,
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(mapSessionError(String(err)));
    }
  }

  async function onEdit(p: Profile) {
    setEditingId(p.id);
    setName(p.name);
    setColor(p.color ?? "");
    setTargetMinutes(
      p.dailyTargetMinutes != null ? String(p.dailyTargetMinutes) : "",
    );
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this profile? Tasks and sessions under it will be removed.")) {
      return;
    }
    setError(null);
    try {
      await api.deleteProfile(id);
      if (editingId === id) {
        resetForm();
      }
      await load();
    } catch (err) {
      setError(mapSessionError(String(err)));
    }
  }

  return (
    <div>
      <h1 className="page-heading-soft">Profiles</h1>
      <p className="page-sub">Work areas or roles. Optional color and daily target (minutes).</p>
      {error ? <p className="error">{error}</p> : null}

      {profiles.length === 0 ? (
        <div className="empty-panel" style={{ marginBottom: 16 }}>
          You have no profiles yet. Add your first work area below — you will need one to start the
          timer on the dashboard.
        </div>
      ) : null}

      <section className="card" aria-label={editingId ? "Edit profile" : "Create profile"}>
        <h2 style={{ margin: "0 0 16px", fontSize: "calc(18 / 14 * 1rem)", fontWeight: 600 }}>
          {editingId ? "Edit profile" : "New profile"}
        </h2>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="pf-name">Name</label>
            <input
              id="pf-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Freelance"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pf-color">Color (hex, optional)</label>
            <input
              id="pf-color"
              className="input"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#0099ff"
            />
          </div>
          <div className="field">
            <label htmlFor="pf-target">Daily target (minutes, optional)</label>
            <input
              id="pf-target"
              className="input"
              inputMode="numeric"
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(e.target.value)}
              placeholder="e.g. 240"
            />
          </div>
          <div className="row">
            <button className="btn btn-primary" type="submit">
              {editingId ? "Save" : "Create"}
            </button>
            {editingId ? (
              <button className="btn btn-frost" type="button" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card" aria-label="Profile list">
        <h2 style={{ margin: "0 0 16px", fontSize: "calc(18 / 14 * 1rem)", fontWeight: 600 }}>
          Your profiles
        </h2>
        {profiles.length === 0 ? (
          <p className="muted">No profiles yet. Create one above.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Color</th>
                <th>Daily target</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    {p.color ? (
                      <span className="row" style={{ gap: 8 }}>
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            background: p.color,
                            display: "inline-block",
                            boxShadow: "0 0 0 1px var(--accent-ring)",
                          }}
                        />
                        <span className="muted">{p.color}</span>
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {p.dailyTargetMinutes != null ? (
                      `${p.dailyTargetMinutes} min`
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="btn btn-frost" onClick={() => void onEdit(p)}>
                      Edit
                    </button>{" "}
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void onDelete(p.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
