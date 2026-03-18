const bcrypt = require('bcrypt');

async function generateHash() {
    // Change these passwords as needed
    const passwords = [
        'Admin@2026!',
        'Staff@2026!',
        'User@2026!'
    ];
    
    console.log('🔐 Generating password hashes...\n');
    
    for (const password of passwords) {
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);
        console.log(`Password: ${password}`);
        console.log(`Hash: ${hash}\n`);
    }
    
    console.log('✅ Done! Copy these hashes for your database inserts.');
}

generateHash().catch(console.error);