const path = require('path');
const { app } = require('electron');
const sqlite3 = require('sqlite3').verbose();

// Separate database file for inventory
const dbPath = path.join(app.getPath('userData'), 'inventory.db');

// Initialize the database
const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
        console.error('Inventory database error:', err);
        throw err;
    }
    console.log('Connected to Inventory SQLite database');
    console.log('Inventory database path:', dbPath);
    
    try {
        await initializeInventoryTable();
        console.log('Inventory database initialization completed successfully');
    } catch (error) {
        console.error('Inventory database initialization failed:', error);
        throw error;
    }
});

function initializeInventoryTable() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Create the inventory table
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS inventory (
                    ecs_name TEXT PRIMARY KEY,
                    rds_name TEXT,
                    rds_engine TEXT,
                    project_name TEXT,
                    app_name TEXT,
                    app_lead TEXT,
                    other_developer_contacts TEXT,
                    project_manager TEXT,
                    program_name_updated TEXT,
                    status TEXT,
                    used_by_agencies TEXT,
                    azdo_link TEXT,
                    operation_technical_design_wiki TEXT,
                    technical_design_wiki TEXT,
                    application_summary TEXT,
                    comments_documentation TEXT,
                    comments_alarms TEXT,
                    hosted_environment TEXT
                )
            `;

            db.run(createTableSQL, (err) => {
                if (err) {
                    console.error('Error creating inventory table:', err);
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                }

                // Verify the table exists
                db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'", (err, row) => {
                    if (err) {
                        console.error('Error verifying inventory table:', err);
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    if (!row) {
                        const error = new Error('Inventory table was not created properly');
                        db.run('ROLLBACK');
                        reject(error);
                        return;
                    }

                    db.run('COMMIT', (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log('Inventory table initialized successfully');
                            resolve();
                        }
                    });
                });
            });
        });
    });
}

// Database operations
const inventoryDB = {
    // Fetch all inventory items
    getAllItems: () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM inventory", [], (err, rows) => {
                if (err) {
                    console.error("Error fetching inventory:", err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    },

    // Add a new inventory item
    addItem: (item) => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO inventory (
                ecs_name, rds_name, rds_engine, project_name, app_name, 
                app_lead, other_developer_contacts, project_manager, 
                program_name_updated, status, used_by_agencies, azdo_link,
                operation_technical_design_wiki, technical_design_wiki,
                application_summary, comments_documentation, comments_alarms,
                hosted_environment
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const params = [
                item.ecs_name, item.rds_name, item.rds_engine, item.project_name,
                item.app_name, item.app_lead, item.other_developer_contacts,
                item.project_manager, item.program_name_updated, item.status,
                item.used_by_agencies, item.azdo_link, item.operation_technical_design_wiki,
                item.technical_design_wiki, item.application_summary,
                item.comments_documentation, item.comments_alarms, item.hosted_environment
            ];

            db.run(sql, params, function(err) {
                if (err) {
                    console.error("Error adding inventory item:", err);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    },

    // Update an existing inventory item
    updateItem: (item) => {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE inventory SET 
                rds_name=?, rds_engine=?, project_name=?, app_name=?,
                app_lead=?, other_developer_contacts=?, project_manager=?,
                program_name_updated=?, status=?, used_by_agencies=?,
                azdo_link=?, operation_technical_design_wiki=?,
                technical_design_wiki=?, application_summary=?,
                comments_documentation=?, comments_alarms=?,
                hosted_environment=?
                WHERE ecs_name=?`;

            const params = [
                item.rds_name, item.rds_engine, item.project_name,
                item.app_name, item.app_lead, item.other_developer_contacts,
                item.project_manager, item.program_name_updated, item.status,
                item.used_by_agencies, item.azdo_link, item.operation_technical_design_wiki,
                item.technical_design_wiki, item.application_summary,
                item.comments_documentation, item.comments_alarms,
                item.hosted_environment, item.ecs_name
            ];

            db.run(sql, params, function(err) {
                if (err) {
                    console.error("Error updating inventory item:", err);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    },

    // Delete an inventory item
    deleteItem: (ecs_name) => {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM inventory WHERE ecs_name=?", [ecs_name], function(err) {
                if (err) {
                    console.error("Error deleting inventory item:", err);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }
};

module.exports = inventoryDB; 