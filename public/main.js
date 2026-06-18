async function checkAuth() {
  const r = await fetch('/api/auth/status');
  const j = await r.json();
  document.getElementById('status').innerText = j.authenticated ? 'Signed in' : 'Not signed in';
  document.getElementById('app').style.display = j.authenticated ? 'block' : 'none';
}

document.getElementById('signin').addEventListener('click', () => {
  window.location.href = '/auth/google';
});

document.getElementById('download').addEventListener('click', async () => {
  const val = document.getElementById('senders').value || '';
  const senders = val.split(',').map(s => s.trim()).filter(Boolean);
  if (senders.length === 0) return alert('Enter at least one sender email');
  document.getElementById('result').innerText = 'Searching and downloading...';
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({senders})
    });
    const json = await res.json();
    document.getElementById('result').innerText = JSON.stringify(json, null, 2);
  } catch (err) {
    document.getElementById('result').innerText = 'Error: ' + err.message;
  }
});

checkAuth();
