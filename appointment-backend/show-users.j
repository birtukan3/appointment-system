const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function showUsers() {
  await client.connect();
  const res = await client.query('SELECT id, email, name, role, password IS NOT NULL as has_password FROM users');
  console.table(res.rows);
  await client.end();
}

showUsers();