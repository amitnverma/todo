// inventory.js

const db = require('./database');

async function fetchInventory() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM inventory", [], (err, rows) => {
            if (err) {
                console.error("Error fetching inventory:", err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function addInventoryItem(item) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO inventory (ecs_name, rds_name, rds_engine, project_name, app_name, app_lead, other_developer_contacts, project_manager, program_name_updated, status, used_by_agencies, azdo_link, operation_technical_design_wiki, technical_design_wiki, application_summary, comments_documentation, comments_alarms, hosted_environment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [item["ECS name"], item["RDS name"], item["RDS engine"], item["Project Name"], item["AppName"], item["App Lead"], item["Other Developer Contacts"], item["Project Manager"], item["Program Name_updated"], item["Status"], item["Used By (Agencies)"], item["AzDo Link( If Any)"], item["Operation Technical Design wiki"], item["Technical Design Wiki"], item["Application Summary"], item["Comments (Documentation)"], item["Comments (Alarms)"], item["Hosted environment"]], function (err) {
            if (err) {
                console.error("Error adding inventory item:", err);
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

async function updateInventoryItem(item) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE inventory SET rds_name=?, rds_engine=?, project_name=?, app_name=?, app_lead=?, other_developer_contacts=?, project_manager=?, program_name_updated=?, status=?, used_by_agencies=?, azdo_link=?, operation_technical_design_wiki=?, technical_design_wiki=?, application_summary=?, comments_documentation=?, comments_alarms=?, hosted_environment=? WHERE ecs_name=?`;
        db.run(sql, [item["RDS name"], item["RDS engine"], item["Project Name"], item["AppName"], item["App Lead"], item["Other Developer Contacts"], item["Project Manager"], item["Program Name_updated"], item["Status"], item["Used By (Agencies)"], item["AzDo Link( If Any)"], item["Operation Technical Design wiki"], item["Technical Design Wiki"], item["Application Summary"], item["Comments (Documentation)"], item["Comments (Alarms)"], item["Hosted environment"], item["ECS name"]], function (err) {
            if (err) {
                console.error("Error updating inventory item:", err);
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

async function deleteInventoryItem(ecs_name) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM inventory WHERE ecs_name=?", [ecs_name], function (err) {
            if (err) {
                console.error("Error deleting inventory item:", err);
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

function displayInventory(data) {
    const inventorySection = document.getElementById("inventory-items");
    if (inventorySection) inventorySection.innerHTML = ""; // Clear existing items

    if (data.length === 0) {
        if (inventorySection) inventorySection.textContent = "No items found.";
        return;
    }

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    table.appendChild(thead);
    table.appendChild(tbody);

    // Error handling for missing data in items
    if (data.length > 0 && data[0]) {

          // Create table headers dynamically
        const headers = Object.keys(data[0]);
        thead.innerHTML = `
            <thead>
                <tr>
                    ${headers.map(header => `<th>${header}</th>`).join('')}
                    <th>Actions</th> 
                </tr>
            </thead>`;

        data.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = headers.map(header => `<td><input type="text" id="${header}-${item["ecs_name"]}" value="${item[header] || ""}" class="inventory-input" ${header === "ecs_name" ? "readonly" : ""}></td>`).join('');

            // Add Update and Delete buttons
            const actionsCell = document.createElement("td");
            actionsCell.innerHTML = `
                <button class="update-button" data-ecs="${item["ecs_name"]}">Update</button>
                <button class="delete-button" data-ecs="${item["ecs_name"]}">Delete</button>
            `;
            row.appendChild(actionsCell);
            tbody.appendChild(row);
        });
    } else {
        inventorySection.textContent = "No items found.";
        return;
    }

    // Add event listeners for Update and Delete buttons
    tbody.querySelectorAll(".update-button").forEach(button => {
        button.addEventListener("click", async (event) => {
            const ecs_name = event.target.dataset.ecs;
            await updateInventoryItemFromForm(ecs_name);
        });
    });

    tbody.querySelectorAll(".delete-button").forEach(button => {
        button.addEventListener("click", async (event) => {
            const ecs_name = event.target.dataset.ecs;
            if (confirm("Are you sure you want to delete this item?")) {
                try {
                    await deleteInventoryItem(ecs_name);
                    alert("Item deleted successfully.");
                    displayInventory(await fetchInventory()); // Refresh inventory
                } catch (error) {
                    console.error("Error deleting item:", error);
                    alert("Failed to delete item.");
                }
            }
        });
    });

    if (inventorySection) {
        inventorySection.appendChild(table);
    }
}

async function addInventoryItemFromForm() {
    const newItem = {};
    const headers = ["ecs_name", "rds_name", "rds_engine", "project_name", "app_name", "app_lead", "other_developer_contacts", "project_manager", "program_name_updated", "status", "used_by_agencies", "azdo_link", "operation_technical_design_wiki", "technical_design_wiki", "application_summary", "comments_documentation", "comments_alarms", "hosted_environment"];

    headers.forEach(header => {
        newItem[header] = document.getElementById(header)?.value || "";
    });

    // Client-side validation
    if (!newItem.ecs_name) {
        alert("ECS Name is required.");
        return; // Prevent submission
    }

    // Optional: Add more validation as needed, e.g.,
    // if (newItem.some_numeric_field && isNaN(newItem.some_numeric_field)) {
    //     alert("Some Numeric Field must be a number.");
    //     return;
    // }

    try {
    await addInventoryItem(newItem);
    alert("Item added successfully!");
    displayInventory(await fetchInventory()); // Refresh inventory

    // Clear input fields after successful addition
    headers.forEach(header => { document.getElementById(header).value = ""; });
        // Clear input fields after successful addition, except for ecs_name which should likely be auto-generated or a special case.
        headers.forEach(header => {
            if (header !== "ecs_name") document.getElementById(header).value = "";
        });
    } catch (error) {
        console.error("Error adding item:", error);
        alert("Failed to add item.");
    }
}

async function updateInventoryItemFromForm(ecs_name) {
    const updatedItem = { "ecs_name": ecs_name };
    const headers = ["rds_name", "rds_engine", "project_name", "app_name", "app_lead", "other_developer_contacts", "project_manager", "program_name_updated", "status", "used_by_agencies", "azdo_link", "operation_technical_design_wiki", "technical_design_wiki", "application_summary", "comments_documentation", "comments_alarms", "hosted_environment"];

      headers.forEach(header => {
          updatedItem[header] = document.getElementById(`${header}-${ecs_name}`).value;
      });

    // Basic validation - check if any fields are empty (you might want to adjust this based on your requirements)
    for (const key in updatedItem) {
        if (key !== "ecs_name" && updatedItem[key].trim() === "") { // Allow empty ecs_name as it's not editable
            alert(`Please fill in the "${key}" field.`);
            return; // Stop the update if any field is empty
        }
    }

      // Validation (add more as needed)
      if (!ecs_name) {
          alert("ECS Name cannot be empty.");
          return;
    });

    try {
        await updateInventoryItem(updatedItem);
        alert("Item updated successfully!");
        displayInventory(await fetchInventory()); // Refresh inventory
    } catch (error) {
        console.error("Error updating item:", error);
        alert("Failed to update item.");
    }
}

async function searchInventory(searchTerm) {
    try {
        const inventoryData = await fetchInventory();
        const filteredData = inventoryData.filter(item => {
            return Object.values(item).some(value =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
        displayInventory(filteredData);
    } catch (error) {
        console.error("Error searching inventory:", error);
    }
}

async function importCSV() {
    const fileInput = document.getElementById('csv-file');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Please select a CSV file to import.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function (event) {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== "");
        if (lines.length === 0) {
            alert('The CSV file is empty.');
            return;
        }

        const headers = lines[0].split(',').map(header => header.trim());
        const items = lines.slice(1).map(line => {
            const values = line.split(',').map(value => value.trim());
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        });

        try {
            for (const item of items) {
                await addInventoryItem(item);
            }
            alert('CSV data imported successfully.');
            displayInventory(await fetchInventory());
        } catch (error) {
            console.error('Error importing CSV data:', error);
            alert('Error importing CSV data. Please check the file format.');
        }
    };
    reader.readAsText(file);
}

async function exportCSV() {
    try {
        const inventoryData = await fetchInventory();
        if (inventoryData.length === 0) {
            alert('No data to export.');
            return;
        }

        const headers = Object.keys(inventoryData[0]);
        const csvContent = [
            headers.join(','),
            ...inventoryData.map(item => headers.map(header => item[header]).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'inventory.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Error exporting CSV data.');
    }
}

// Initial display of inventory
document.addEventListener("DOMContentLoaded", async () => {
    const inventorySection = document.getElementById("inventory-items");
    try {
        const inventoryData = await fetchInventory();
        displayInventory(inventoryData);

        // Add event listener for the "Add" button
        const addButton = document.getElementById("add-item");
        if (addButton) {
            addButton.addEventListener("click", addInventoryItemFromForm);
        } else {
            console.warn("Add button not found.");
        }

    } catch (error) {
        console.error("Error fetching initial inventory:", error);
        if (inventorySection) inventorySection.textContent = "Error loading inventory.";
    }

    const searchBar = document.getElementById("search-bar");
    if (searchBar) searchBar.addEventListener("input", (event) => {
        if (event && event.target) searchInventory(event.target.value);
    });

    const importButton = document.getElementById("import-csv");
    if (importButton) importButton.addEventListener("click", importCSV);

    const exportButton = document.getElementById("export-csv");
    if (exportButton) exportButton.addEventListener("click", exportCSV);
});

                </tr>
            </thead>
            <tbody></tbody> 
        `;
        const tbody = table.querySelector("tbody");

        data.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = Object.values(item).map(value => `<td>${value}</td>`).join('');
            tbody.appendChild(row);
        });

        if (inventorySection) inventorySection.appendChild(table);
    }
}

async function searchInventory(searchTerm) {
    try {
        const inventoryData = await fetchInventory();
        const filteredData = inventoryData.filter(item => {
            return Object.values(item).some(value =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
        displayInventory(filteredData);
    } catch (error) {
        console.error("Error searching inventory:", error);
    }
}

async function importCSV() {
    const fileInput = document.getElementById('csv-file');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Please select a CSV file to import.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function (event) {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== "");
        if (lines.length === 0) {
            alert('The CSV file is empty.');
            return;
        }

        const headers = lines[0].split(',').map(header => header.trim());
        const items = lines.slice(1).map(line => {
            const values = line.split(',').map(value => value.trim());
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        });

        try {
            for (const item of items) {
                await addInventoryItem(item);
            }
            alert('CSV data imported successfully.');
            displayInventory(await fetchInventory());
        } catch (error) {
            console.error('Error importing CSV data:', error);
            alert('Error importing CSV data. Please check the file format.');
        }
    };
    reader.readAsText(file);
}

async function exportCSV() {
    try {
        const inventoryData = await fetchInventory();
        if (inventoryData.length === 0) {
            alert('No data to export.');
            return;
        }

        const headers = Object.keys(inventoryData[0]);
        const csvContent = [
            headers.join(','),
            ...inventoryData.map(item => headers.map(header => item[header]).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'inventory.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Error exporting CSV data.');
    }
}

// Initial display of inventory
document.addEventListener("DOMContentLoaded", () => {
    try {
        const inventoryData = await fetchInventory();
        displayInventory(inventoryData);
    } catch (error) {
        console.error("Error fetching initial inventory:", error);
        const inventorySection = document.getElementById("inventory-items");
        if (inventorySection) inventorySection.textContent = "Error loading inventory.";
    }

    const searchBar = document.getElementById("search-bar");
    if (searchBar) searchBar.addEventListener("input", (event) => {
        if (event && event.target) searchInventory(event.target.value);
    });

    const importButton = document.getElementById("import-csv");
    if (importButton) importButton.addEventListener("click", importCSV);

    const exportButton = document.getElementById("export-csv");
    if (exportButton) exportButton.addEventListener("click", exportCSV);
});