async function test() {
  const loginRes = await fetch("http://127.0.0.1:8000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "david.kim@pureglow.co", password: "precedent" })
  });
  const data = await loginRes.json();
  const token = data.token;
  console.log("Logged in as:", data.user.email, "Role:", data.user.role);

  const rulesRes = await fetch("http://127.0.0.1:8000/rules", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const rules = await rulesRes.json();
  console.log("Rules count:", rules.length);
  if (rules.length > 0) {
    console.log("First rule:", rules[0]);
    console.log("Rule statuses:", [...new Set(rules.map(r => r.status))]);
    console.log("Rule subjects:", [...new Set(rules.map(r => r.subject))]);
  }

  const conflictsRes = await fetch("http://127.0.0.1:8000/rules/conflicts", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const conflicts = await conflictsRes.json();
  console.log("Conflicts count:", conflicts.length);
  if (conflicts.length > 0) {
    console.log("First conflict:", conflicts[0]);
  }
}
test();
