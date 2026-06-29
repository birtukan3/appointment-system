const bcrypt = require('bcryptjs');

const hash = '$2a$12$/YjD8MBH1DfiHPI00QShEOYRo21OIZOHH5N1LsYwf5ThpY8.4CKY2';
const password = 'Admin123';

bcrypt.compare(password, hash, (err, result) => {
  if (err) console.error('Error:', err);
  console.log('Password matches:', result);
  console.log('Hash length:', hash.length);
});