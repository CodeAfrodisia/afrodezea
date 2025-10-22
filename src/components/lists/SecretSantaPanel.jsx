import React from "react";

export default function SecretSantaPanel({
  userId,
  createGiftGroup, addMember, listMembers, runDraw, getDraw
}) {
  const [group, setGroup] = React.useState(null); // {id,name}
  const [members, setMembers] = React.useState([]);
  const [draw, setDraw] = React.useState([]);
  const [name, setName] = React.useState("");

  async function handleCreate() {
    if (!userId || !name.trim()) return;
    const g = await createGiftGroup(userId, name.trim());
    setGroup(g);
    setName("");
    const m = await listMembers(g.id);
    setMembers(m);
    setDraw([]);
  }
  async function handleAddMember(display_name) {
    if (!group || !display_name.trim()) return;
    await addMember(group.id, { display_name });
    const m = await listMembers(group.id);
    setMembers(m);
  }
  async function handleRunDraw() {
    if (!group) return;
    await runDraw(group.id);
    const d = await getDraw(group.id);
    setDraw(d);
  }

  return (
    <div>
      <h4 style={{ marginTop: 0 }}>Secret Santa</h4>
      {!group ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Group name (e.g., Family 2025)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <button className="btn btn-action" onClick={handleCreate}>Create Group</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <strong>Group:</strong> {group.name}
          </div>

          <MemberAdder onAdd={handleAddMember} />

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Members</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {members.map(m => <li key={m.id}>{m.display_name}</li>)}
            </ul>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-outline-gold" disabled={members.length < 2} onClick={handleRunDraw}>
              Run Draw
            </button>
            {members.length < 2 && <span style={{ opacity: .75 }}>Add at least 2 members.</span>}
          </div>

          {draw.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Assignments (admin view)</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {draw.map(d => (
                  <li key={d.id}>
                    {d.giver?.display_name} → <strong>{d.receiver?.display_name}</strong>
                  </li>
                ))}
              </ul>
              <div style={{ opacity: .8, marginTop: 8 }}>
                Later we’ll show each participant only their own assignment via a private link.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MemberAdder({ onAdd }) {
  const [val, setVal] = React.useState("");
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input
        className="input"
        placeholder="Add member name"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => (e.key === "Enter" ? (onAdd(val), setVal("")) : null)}
        style={{ minWidth: 200 }}
      />
      <button className="btn btn--ghost" onClick={() => { onAdd(val); setVal(""); }}>
        Add
      </button>
    </div>
  );
}

