import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/tauri";
import { mapSessionError } from "../lib/sessionErrors";
import type { Profile, Task } from "../types";

export function Tasks() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    const [list, quickId] = await Promise.all([
      api.listProfiles(),
      api.getQuickSessionProfileId(),
    ]);
    const filtered = list.filter((profile) => profile.id !== quickId);
    setProfiles(filtered);
    setProfileId((cur) => cur || filtered[0]?.id || "");
  }, []);

  const loadTasks = useCallback(async () => {
    if (!profileId) {
      setTasks([]);
      return;
    }
    setTasks(await api.listTasks(profileId));
  }, [profileId]);

  useEffect(() => {
    void loadProfiles().catch((e) => setError(mapSessionError(String(e))));
  }, [loadProfiles]);

  useEffect(() => {
    void loadTasks().catch((e) => setError(mapSessionError(String(e))));
  }, [loadTasks]);

  function resetForm() {
    setName("");
    setEditingId(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId) {
      setError("Select a profile first.");
      return;
    }
    setError(null);
    try {
      if (editingId) {
        await api.updateTask(editingId, name);
      } else {
        await api.createTask(profileId, name);
      }
      resetForm();
      await loadTasks();
    } catch (err) {
      setError(mapSessionError(String(err)));
    }
  }

  function onEdit(t: Task) {
    setEditingId(t.id);
    setName(t.name);
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this task?")) {
      return;
    }
    setError(null);
    try {
      await api.deleteTask(id);
      if (editingId === id) {
        resetForm();
      }
      await loadTasks();
    } catch (err) {
      setError(mapSessionError(String(err)));
    }
  }

  return (
    <div>
      <h1 className="page-heading-soft">Tasks</h1>
      <p className="page-sub">Tasks belong to a profile. Tracking can run with or without a task.</p>
      {error ? <p className="error">{error}</p> : null}

      {profiles.length === 0 ? (
        <div className="empty-panel" style={{ marginBottom: 16 }}>
          Create a profile first, then add tasks for it.
          <div style={{ marginTop: 10 }}>
            <Link to="/profiles">Go to Profiles</Link>
          </div>
        </div>
      ) : null}

      <section className="card" aria-label="Profile filter">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="task-profile">Profile</label>
          <select
            id="task-profile"
            className="select"
            value={profileId}
            onChange={(e) => {
              setProfileId(e.target.value);
              resetForm();
            }}
          >
            {profiles.length === 0 ? <option value="">No profiles</option> : null}
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card" aria-label={editingId ? "Edit task" : "Create task"}>
        <h2 className="section-title-sm">{editingId ? "Edit task" : "New task"}</h2>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="task-name">Name</label>
            <input
              id="task-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client invoicing"
              required
            />
          </div>
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={!profileId}>
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

      <section className="card" aria-label="Task list">
        <h2 className="section-title-sm">Tasks for profile</h2>
        {!profileId ? (
          <p className="muted">Create a profile first.</p>
        ) : tasks.length === 0 ? (
          <p className="muted">No tasks for this profile yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="btn btn-frost" onClick={() => onEdit(t)}>
                      Edit
                    </button>{" "}
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void onDelete(t.id)}
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
