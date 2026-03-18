const bcrypt = require('bcrypt');

async function createUsers() {
    const saltRounds = 10;
    
    // Admin password: Admin@2026!
    const adminHash = await bcrypt.hash('Admin@2026!', saltRounds);
    console.log('Admin hash:', adminHash);
    
    // Staff password: Staff@2026!
    const staffHash = await bcrypt.hash('Staff@2026!', saltRounds);
    console.log('Staff hash:', staffHash);
}

createUsers();