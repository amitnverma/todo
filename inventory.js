// inventory.js

async function fetchInventory() {
    try {
        return await window.api.inventoryDb.getAllItems();
    } catch (error) {
        console.error("Error fetching inventory:", error);
        throw error;
    }
}

async function addInventoryItem(item) {
    try {
        return await window.api.inventoryDb.addItem(item);
    } catch (error) {
        console.error("Error adding inventory item:", error);
        throw error;
    }
}

async function updateInventoryItem(item) {
    try {
        return await window.api.inventoryDb.updateItem(item);
    } catch (error) {
        console.error("Error updating inventory item:", error);
        throw error;
    }
}

async function deleteInventoryItem(ecs_name) {
    try {
        return await window.api.inventoryDb.deleteItem(ecs_name);
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        throw error;
    }
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
    }

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
    try {
        const result = await window.api.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'CSV Files', extensions: ['csv'] }]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const csvContent = await window.api.readFile(filePath);
            
            // Parse CSV content
            const lines = csvContent.split('\n').filter(line => line.trim() !== "");
            if (lines.length === 0) {
                throw new Error('The CSV file is empty.');
            }

            const headers = lines[0].split(',').map(header => header.trim());
            const items = lines.slice(1).map(line => {
                const values = line.split(',').map(value => value.trim());
                return headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {});
            });

            // Import each item
            for (const item of items) {
                await addInventoryItem(item);
            }

            alert('CSV data imported successfully.');
            const inventory = await fetchInventory();
            displayInventory(inventory);
        }
    } catch (error) {
        console.error('Error importing CSV:', error);
        alert(`Failed to import CSV: ${error.message}`);
    }
}

async function exportCSV() {
    try {
        const inventory = await fetchInventory();
        if (inventory.length === 0) {
            alert('No data to export.');
            return;
        }

        // Get headers from the first item
        const headers = Object.keys(inventory[0]);
        
        // Create CSV content
        const csvContent = [
            headers.join(','), // Header row
            ...inventory.map(item => 
                headers.map(header => 
                    // Escape special characters and wrap in quotes if needed
                    typeof item[header] === 'string' && (item[header].includes(',') || item[header].includes('"')) 
                        ? `"${item[header].replace(/"/g, '""')}"` 
                        : item[header] || ''
                ).join(',')
            )
        ].join('\n');

        // Show save dialog
        const result = await window.api.showSaveDialog({
            filters: [{ name: 'CSV Files', extensions: ['csv'] }],
            defaultPath: `inventory_export_${new Date().toISOString().split('T')[0]}.csv`
        });

        if (!result.canceled && result.filePath) {
            await window.api.writeFile(result.filePath, csvContent);
            alert('Inventory data exported successfully.');
        }
    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert(`Failed to export CSV: ${error.message}`);
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