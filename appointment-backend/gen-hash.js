const bcrypt = require('bcryptjs');

async function generateHash() {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash('Admin@2026!', salt);
    console.log('HASH:', hash);
    console.log('LENGTH:', hash.length);
}

generateHash();