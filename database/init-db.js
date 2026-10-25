const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database/cleanpro.db';
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function initializeDatabase() {
    console.log('🔧 Initializing CleanPro Database...');
    
    // Create database directory if it doesn't exist
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('✓ Created database directory');
    }

    // Create database connection
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            process.exit(1);
        }
        console.log('✓ Connected to SQLite database');
    });

    // Read schema files
    let schema, marketingSchema;
    try {
        schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        console.log('✓ Main schema file loaded');
        
        const marketingSchemaPath = path.join(__dirname, 'marketing-schema.sql');
        marketingSchema = fs.readFileSync(marketingSchemaPath, 'utf8');
        console.log('✓ Marketing schema file loaded');
    } catch (err) {
        console.error('❌ Error reading schema file:', err.message);
        db.close();
        process.exit(1);
    }

    // Execute schemas
    return new Promise((resolve, reject) => {
        // Execute main schema
        db.exec(schema, async (err) => {
            if (err) {
                console.error('❌ Error executing main schema:', err.message);
                db.close();
                reject(err);
                return;
            }
            console.log('✓ Main database schema created');
            
            // Execute marketing schema
            db.exec(marketingSchema, async (err) => {
                if (err) {
                    console.error('❌ Error executing marketing schema:', err.message);
                    db.close();
                    reject(err);
                    return;
                }
                console.log('✓ Marketing CRM schema created');

                // Create default admin user with hashed password
                const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
                const passwordHash = await bcrypt.hash(defaultPassword, 10);

                const insertAdmin = `
                    INSERT OR REPLACE INTO admin_users (username, email, password_hash, full_name, role)
                    VALUES (?, ?, ?, ?, ?)
                `;

                db.run(
                    insertAdmin,
                    [
                        process.env.DEFAULT_ADMIN_USERNAME || 'admin',
                        process.env.DEFAULT_ADMIN_EMAIL || 'admin@cleanpro.sk',
                        passwordHash,
                        'System Administrator',
                        'admin'
                    ],
                    (err) => {
                        if (err) {
                            console.error('❌ Error creating admin user:', err.message);
                        } else {
                            console.log('✓ Default admin user created');
                            console.log('  Username:', process.env.DEFAULT_ADMIN_USERNAME || 'admin');
                            console.log('  Password:', defaultPassword);
                            console.log('  ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!');
                        }

                        db.close((err) => {
                            if (err) {
                                console.error('❌ Error closing database:', err.message);
                                reject(err);
                            } else {
                                console.log('✓ Database connection closed');
                                console.log('✅ Database initialization complete!');
                                resolve();
                            }
                        });
                    }
                );
            });
        });
    });
}

// Run initialization
initializeDatabase()
    .then(() => {
        console.log('\n🎉 Setup complete! You can now start the server with: npm start');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Initialization failed:', err);
        process.exit(1);
    });

// Made with Bob
