async function queryDB(sql, params = []) {
  return window.api.queryDB(sql, params);
}

// Load projects from the database
async function loadProjects() {
  console.log("Refreshing project list...");

  const projects = await queryDB(`
      SELECT * FROM projects 
      WHERE id NOT IN (SELECT project_id FROM project_archive)
  `);

  console.log("Projects fetched from DB:", projects); // Debugging log

  const projectList = document.getElementById('project-list');
  if (!projectList) {
    console.error("Error: #project-list element not found!");
    return;
  }

  if (projects.length === 0) {
    projectList.innerHTML = "<p>No projects available.</p>";
    return;
  }

  // Render projects
  projectList.innerHTML = projects.map(p => `
      <li data-id="${p.id}" onclick="setSelectedProject(${p.id})">
          ${p.name}
          <button onclick="loadTasks(${p.id})">View</button>
          <button onclick="openTaskModal(${p.id})">Add Task</button>
          <button onclick="deleteProject(${p.id})">Delete</button>
      </li>
  `).join('');

  console.log("Project list updated in UI.");
}



// Store the selected project ID
// let selectedProjectId = null;

function setSelectedProject(projectId) {
  selectedProjectId = projectId;

  // Remove 'selected-project' class from all project items
  document.querySelectorAll("#project-list li").forEach(li => {
    li.classList.remove("selected-project");
  });

  // Highlight the selected project
  const selectedProjectItem = document.querySelector(`#project-list li[data-id='${projectId}']`);
  if (selectedProjectItem) {
    selectedProjectItem.classList.add("selected-project");
  }

  console.log(`🔹 Project ${projectId} selected, loading details...`);
  
  // Fix: Ensure project details load
  loadProjectDetails(projectId);
}






// Load project details
async function loadProjectDetails(projectId) {
  console.log(`🔍 Fetching details for project ID: ${projectId}`);

  const details = await queryDB('SELECT * FROM project_details WHERE project_id = ?', [projectId]);

  console.log("📊 Project details fetched:", details); // Debugging log

  // Reference UI elements
  const descSpan = document.getElementById('project-description');
  const devLeadSpan = document.getElementById('dev-lead');
  const businessContactSpan = document.getElementById('business-contact');
  const linksDiv = document.getElementById('links');
  const commentsDiv = document.getElementById('comments');

  // Ensure elements exist before updating
  if (!descSpan || !devLeadSpan || !businessContactSpan || !linksDiv || !commentsDiv) {
      console.error("🚨 UI elements for project details not found in DOM.");
      return;
  }

  if (details.length > 0) {
      console.log("✅ Updating UI with project details...");
      
      const project = details[0];

      // Fix: Ensure proper fallback values if empty
      descSpan.textContent = project.description && project.description.trim() ? project.description : 'No description available';
      devLeadSpan.textContent = project.dev_lead && project.dev_lead.trim() !== "N/A" ? project.dev_lead : 'Not Assigned';
      businessContactSpan.textContent = project.business_contact && project.business_contact.trim() !== "N/A" ? project.business_contact : 'Not Available';

      // Fix: Ensure links display properly
      linksDiv.innerHTML = project.links && project.links.trim() !== "N/A"
          ? project.links.split('\n').map(link => `<div class="link-item">${link.trim()}</div>`).join('')
          : '<div>No links available</div>';

      // Load and display comments
      await loadComments(projectId);

  } else {
      console.warn(`⚠ No details found for project ID: ${projectId}`);
      descSpan.textContent = 'No description available';
      devLeadSpan.textContent = 'Not Assigned';
      businessContactSpan.textContent = 'Not Available';
      linksDiv.innerHTML = '<div>No links available</div>';
      commentsDiv.innerHTML = '<p>No comments yet.</p>';
  }
}




// Open the edit details modal
function openEditDetailsModal(projectId) {
  console.log('Edit Details button clicked'); // Debugging log
  const modal = document.getElementById('edit-details-modal');
  const editDescriptionInput = document.getElementById('edit-description'); // New description field
  const editDevLeadInput = document.getElementById('edit-dev-lead');
  const editBusinessContactInput = document.getElementById('edit-business-contact');
  const editLinksInput = document.getElementById('edit-links');
  const closeModal = document.querySelector('#edit-details-modal .close');

  if (!modal || !editDescriptionInput || !editDevLeadInput || !editBusinessContactInput || !editLinksInput || !closeModal) {
    console.error('Modal or input elements not found'); // Debugging log
    return;
  }

  // Load existing details (if any)
  queryDB('SELECT * FROM project_details WHERE project_id = ?', [projectId])
    .then(details => {
      if (details.length > 0) {
        console.log('Existing details loaded:', details[0]); // Debugging log
        editDescriptionInput.value = details[0].description || '';
        editDevLeadInput.value = details[0].dev_lead || '';
        editBusinessContactInput.value = details[0].business_contact || '';
        editLinksInput.value = details[0].links || '';
      } else {
        console.log('No existing details found'); // Debugging log
        editDescriptionInput.value = '';
        editDevLeadInput.value = '';
        editBusinessContactInput.value = '';
        editLinksInput.value = '';
      }
    })
    .catch(error => {
      console.error('Error loading project details:', error); // Debugging log
    });

  // Show the modal
  modal.style.display = 'block';
  console.log('Modal displayed'); // Debugging log

  // Close the modal when the user clicks the close button
  closeModal.onclick = () => {
    modal.style.display = 'none';
    console.log('Modal closed'); // Debugging log
  };

  // Save the details when the Save button is clicked
  document.getElementById('save-details').onclick = async () => {
    const description = editDescriptionInput.value.trim(); // Capture description
    const devLead = editDevLeadInput.value.trim();
    const businessContact = editBusinessContactInput.value.trim();
    const links = editLinksInput.value.trim();

    console.log('Saving details:', { description, devLead, businessContact, links }); // Debugging log

    try {
      // Check if details already exist
      const existingDetails = await queryDB('SELECT * FROM project_details WHERE project_id = ?', [projectId]);
      if (existingDetails.length > 0) {
        // Update existing details (including description)
        await queryDB(`
          UPDATE project_details 
          SET description = ?, dev_lead = ?, business_contact = ?, links = ?
          WHERE project_id = ?
        `, [description, devLead, businessContact, links, projectId]);
        console.log('Details updated successfully'); // Debugging log
      } else {
        // Insert new details (including description)
        await queryDB(`
          INSERT INTO project_details (project_id, description, dev_lead, business_contact, links)
          VALUES (?, ?, ?, ?, ?)
        `, [projectId, description, devLead, businessContact, links]);
        console.log('Details inserted successfully'); // Debugging log
      }

      // Refresh the details section
      await loadProjectDetails(projectId);
      modal.style.display = 'none'; // Close the modal
    } catch (error) {
      console.error('Error saving project details:', error); // Debugging log
    }
  };
}




// Load tasks for a project
async function loadTasks(projectId) {
  const tasks = await queryDB('SELECT * FROM tasks WHERE project_id = ?', [projectId]);
  const tasksDiv = document.getElementById('tasks');

  // Load tasks with notes
  const tasksWithNotes = await Promise.all(
    tasks.map(async (t) => {
      const notes = await loadNotes(t.id);
      return { ...t, notes };
    })
  );

  // Render tasks
  tasksDiv.innerHTML = tasksWithNotes.map(t => `
    <div class="task">
      <h3>${t.title}</h3>
      <p>Created: ${t.created_date}</p>
      ${t.due_date ? `<p>Due: ${t.due_date}</p>` : ''}
      <button onclick="editTask(${t.id})">Edit</button>
      <button onclick="deleteTask(${t.id})">Delete</button>
      <button onclick="openAddNoteModal(${t.id})">Add Note</button>
      ${t.notes}
    </div>
  `).join('');

  // Load project details
  await loadProjectDetails(projectId);

  // Load comments for the selected project
  await loadComments(projectId);

  // Add event listener for the "Edit Details" button
  const editDetailsButton = document.getElementById('edit-details');
  if (editDetailsButton) {
    editDetailsButton.onclick = () => {
      console.log('Edit Details button clicked'); // Debugging log
      openEditDetailsModal(projectId);
    };
  } else {
    console.error('Edit Details button not found'); // Debugging log
  }
}



// Load notes for a task
async function loadNotes(taskId) {
  const notes = await queryDB('SELECT * FROM notes WHERE task_id = ?', [taskId]);
  return notes.map(n => `
    <div class="note">
      <p>${n.content}</p>
      <small>${formatDateTime(n.note_date)}</small>
    </div>
  `).join('');
}

// Helper function to format the date
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Add a new project
async function addProject() {
  const modal = document.getElementById('project-modal');
  const projectNameInput = document.getElementById('project-name');
  const closeModal = document.querySelector('#project-modal .close');

  // Show the modal
  modal.style.display = 'block';

  // Close the modal when the user clicks the close button
  closeModal.onclick = () => {
    modal.style.display = 'none';
  };

  // Save the project when the user clicks the Save button
  document.getElementById('save-project').onclick = async () => {
    const projectName = projectNameInput.value.trim();
    if (projectName) {
      try {
        await queryDB('INSERT INTO projects (name) VALUES (?)', [projectName]);
        await loadProjects(); // Refresh the project list
        modal.style.display = 'none'; // Hide the modal
        projectNameInput.value = ''; // Clear the input
      } catch (error) {
        console.error('Error adding project:', error);
      }
    }
  };
}

// Open the task modal
function openTaskModal(projectId) {
  const modal = document.getElementById('task-modal');
  const taskTitleInput = document.getElementById('task-title');
  const taskDueDateInput = document.getElementById('task-due-date');
  const closeModal = document.querySelector('#task-modal .close');

  // Set default date to today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const dd = String(today.getDate()).padStart(2, '0');
  taskDueDateInput.value = `${yyyy}-${mm}-${dd}`;

  // Show the modal
  modal.style.display = 'block';

  // Close the modal when the user clicks the close button
  closeModal.onclick = () => {
    modal.style.display = 'none';
  };

  // Save the task when the user clicks the Save button
  document.getElementById('save-task').onclick = async () => {
    const taskTitle = taskTitleInput.value.trim();
    const taskDueDate = taskDueDateInput.value || null;
    const taskPriority = document.getElementById('task-priority').value;
    const taskStatus = document.getElementById('task-status').value;

    if (taskTitle) {
      try {
        await queryDB(`
          INSERT INTO tasks (project_id, title, due_date, created_date, priority, status) 
          VALUES (?, ?, ?, DATE('now'), ?, ?)
        `, [projectId, taskTitle, taskDueDate, taskPriority, taskStatus]);

        await loadTasks(projectId);
        modal.style.display = 'none';
        taskTitleInput.value = '';
        taskDueDateInput.value = `${yyyy}-${mm}-${dd}`; // Reset to today
      } catch (error) {
        console.error('Error adding task:', error);
      }
    } else {
      alert('Task title is required!');
    }
  };
}

// Edit a task
async function editTask(taskId) {
  const task = await queryDB('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (task.length > 0) {
    const modal = document.getElementById('edit-task-modal');
    const editTaskTitleInput = document.getElementById('edit-task-title');
    const editTaskDueDateInput = document.getElementById('edit-task-due-date');
    const closeModal = document.querySelector('#edit-task-modal .close');

    // Populate the modal with the current task details
    editTaskTitleInput.value = task[0].title;
    editTaskDueDateInput.value = task[0].due_date || '';

    // Show the modal
    modal.style.display = 'block';

    // Close the modal when the user clicks the close button
    closeModal.onclick = () => {
      modal.style.display = 'none';
    };

    // Save the edited task when the user clicks the Save button
    document.getElementById('save-edit-task').onclick = async () => {
      const newTitle = editTaskTitleInput.value.trim();
      const newDueDate = editTaskDueDateInput.value || null;

      if (newTitle) {
        try {
          await queryDB(`
            UPDATE tasks 
            SET title = ?, due_date = ?
            WHERE id = ?
          `, [newTitle, newDueDate, taskId]);

          await loadTasks(task[0].project_id); // Refresh the task list
          modal.style.display = 'none'; // Hide the modal
        } catch (error) {
          console.error('Error editing task:', error);
        }
      } else {
        alert('Task title is required!');
      }
    };
  }
}

// Delete a task
async function deleteTask(taskId) {
  const task = await queryDB('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (task.length > 0) {
    const confirmDelete = confirm('Are you sure you want to delete this task?');
    if (confirmDelete) {
      await queryDB('DELETE FROM tasks WHERE id = ?', [taskId]);
      await loadTasks(task[0].project_id); // Refresh the task list
    }
  }
}

// Delete a project
async function deleteProject(projectId) {
  const confirmDelete = confirm('Are you sure you want to delete this project and all its tasks?');
  if (confirmDelete) {
    try {
      // Delete all tasks and notes associated with the project
      await queryDB('DELETE FROM tasks WHERE project_id = ?', [projectId]);
      await queryDB('DELETE FROM notes WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)', [projectId]);
      
      // Delete the project
      await queryDB('DELETE FROM projects WHERE id = ?', [projectId]);

      // Refresh the project list
      await loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }
}

// Search tasks by title
async function searchTasks() {
  const searchQuery = document.getElementById('search').value.trim();

  if (!selectedProjectId) {
      alert("Please select a project first.");
      return;
  }

  // Query to search tasks, notes, and comments
  const tasks = await queryDB(`
      SELECT DISTINCT tasks.* 
      FROM tasks
      LEFT JOIN notes ON tasks.id = notes.task_id
      LEFT JOIN project_comments ON tasks.project_id = project_comments.project_id
      WHERE tasks.project_id = ?
      AND (
          tasks.title LIKE ? 
          OR notes.content LIKE ?
          OR project_comments.comment LIKE ?
      )
      GROUP BY tasks.id
      ORDER BY tasks.created_date DESC
  `, [selectedProjectId, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);

  const tasksDiv = document.getElementById('tasks');

  // Load notes for each matched task
  const tasksWithNotes = await Promise.all(
      tasks.map(async (t) => {
          const notes = await loadNotes(t.id); // Fetch notes
          return { ...t, notes };
      })
  );

  // Render search results
  tasksDiv.innerHTML = tasksWithNotes.length > 0 ? tasksWithNotes.map(t => `
      <div class="task">
          <h3>${t.title}</h3>
          <p>Created: ${t.created_date}</p>
          ${t.due_date ? `<p>Due: ${t.due_date}</p>` : ''}
          <button onclick="editTask(${t.id})">Edit</button>
          <button onclick="deleteTask(${t.id})">Delete</button>
          <button onclick="openAddNoteModal(${t.id})">Add Note</button>
          ${t.notes}
      </div>
  `).join('') : "<p>No matching tasks, notes, or comments found.</p>";
}


// Open the add note modal
function openAddNoteModal(taskId) {
  const modal = document.getElementById('add-note-modal');
  const noteContentInput = document.getElementById('note-content');
  const closeModal = document.querySelector('#add-note-modal .close');

  // Show the modal
  modal.style.display = 'block';

  // Close the modal when the user clicks the close button
  closeModal.onclick = () => {
    modal.style.display = 'none';
  };

  // Save the note when the user clicks the Save button
  document.getElementById('save-note').onclick = async () => {
    const noteContent = noteContentInput.value.trim();
    if (noteContent) {
      try {
        await queryDB(`
          INSERT INTO notes (task_id, content) 
          VALUES (?, ?)
        `, [taskId, noteContent]);

        await loadTasks(taskId); // Refresh the task list
        modal.style.display = 'none'; // Hide the modal
        noteContentInput.value = ''; // Clear the input
      } catch (error) {
        console.error('Error adding note:', error);
      }
    }
  };
}


// ====================== EXPORT FUNCTION ======================
async function exportData() {
  try {
    console.log('Export initiated');

    // Fetch projects and their details
    const projects = await queryDB('SELECT * FROM projects');
    const projectDetails = await queryDB(`
      SELECT pd.*, p.name 
      FROM project_details pd
      JOIN projects p ON pd.project_id = p.id
    `);

    if (projectDetails.length === 0) {
      alert("No data to export.");
      return;
    }

    // CSV Header
    let csvContent = "name,dev_lead,business_contact,links\n";

    // Create CSV rows
    projectDetails.forEach(d => {
      // Replace newlines in links with a delimiter
      const formattedLinks = d.links ? d.links.replace(/\n/g, " | ") : "NA";
      csvContent += `${d.name},${d.dev_lead || "NA"},${d.business_contact || "NA"},${formattedLinks}\n`;
    });

    // Prompt user to save the file
    const { filePath } = await window.api.showSaveDialog({
      title: 'Export Data',
      defaultPath: 'todo-data.csv',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (!filePath) {
      console.log('Export cancelled');
      return;
    }

    // Write the CSV file
    await window.api.writeFile(filePath, csvContent);
    alert('Data exported successfully!');
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed! Check the console for details.');
  }
}


async function importData() {
  try {
    console.log('Import initiated');

    // Prompt user to select a CSV file
    const { filePaths } = await window.api.showOpenDialog({
      title: 'Import Data',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile'],
    });

    if (!filePaths || filePaths.length === 0) {
      console.log('Import cancelled');
      return;
    }

    // Read the CSV file
    const csvContent = await window.api.readFile(filePaths[0]);

    // Parse CSV (keeping original logic)
    const rows = csvContent.split('\n').map(row => row.split(','));

    if (rows.length < 2) {
      alert("Invalid CSV format: No data found.");
      return;
    }

    const headers = rows[0].map(header => header.trim().toLowerCase());
    console.log("Detected headers:", headers);

    const expectedHeaders = ["name", "dev_lead", "business_contact", "links"];

    if (!expectedHeaders.every(h => headers.includes(h))) {
      alert(`Invalid CSV format. Required columns: ${expectedHeaders.join(', ')}`);
      return;
    }

    // Get column indexes
    const nameIdx = headers.indexOf("name");
    const devLeadIdx = headers.indexOf("dev_lead");
    const businessContactIdx = headers.indexOf("business_contact");
    const linksIdx = headers.indexOf("links");

    // Start a database transaction
    await queryDB('BEGIN TRANSACTION');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      if (row.length < headers.length) {
        console.warn(`Skipping row ${i + 1}: Incorrect number of columns.`);
        continue;
      }

      const projectName = row[nameIdx]?.trim();
      const devLead = row[devLeadIdx]?.trim() || "N/A";
      const businessContact = row[businessContactIdx]?.trim() || "N/A";
      const links = row[linksIdx]?.trim() || "N/A";

      if (!projectName) {
        console.warn(`Skipping row ${i + 1}: Missing project name.`);
        continue;
      }

      // Check if the project already exists
      let projectId;
      const existingProject = await queryDB('SELECT id FROM projects WHERE name = ?', [projectName]);

      if (existingProject.length > 0) {
        projectId = existingProject[0].id;
      } else {
        await queryDB('INSERT INTO projects (name) VALUES (?)', [projectName]);
        const newProject = await queryDB('SELECT id FROM projects WHERE name = ?', [projectName]);
        projectId = newProject[0].id;
      }

      // Insert project details
      await queryDB(
        `INSERT INTO project_details (project_id, dev_lead, business_contact, links)
         VALUES (?, ?, ?, ?)`,
        [projectId, devLead, businessContact, links]
      );
    }

    // Commit the transaction
    await queryDB('COMMIT');

    console.log("Data imported successfully. Refreshing project list...");

    // **Force UI to Refresh**
    await loadProjects();

    alert(`Imported ${rows.length - 1} records successfully!`);

  } catch (error) {
    await queryDB('ROLLBACK');
    console.error('Import failed:', error);
    alert('Import failed! Check the console for details.');
  }
}



// Archive a project
async function archiveProject() {
  const projectId = selectedProjectId; // Ensure you set `selectedProjectId` when a project is selected
  if (!projectId) {
      alert("Please select a project to archive.");
      return;
  }

  try {
      await queryDB('INSERT INTO project_archive (project_id) VALUES (?)', [projectId]);
      alert("Project archived successfully.");
      await loadProjects(); // Refresh the project list
  } catch (error) {
      console.error("Error archiving project:", error);
      alert("Failed to archive project.");
  }
}

// Attach event listener for archive button
document.getElementById('archive-project').addEventListener('click', archiveProject);

// Load archived projects
async function loadArchivedProjects() {
  try {
      const archivedProjects = await queryDB(`
          SELECT p.id, p.name, pa.archived_date 
          FROM projects p 
          JOIN project_archive pa ON p.id = pa.project_id
      `);
      const archivedList = document.getElementById('archived-projects-list');

      if (archivedProjects.length === 0) {
          archivedList.innerHTML = "<li>No archived projects.</li>";
          return;
      }

      archivedList.innerHTML = archivedProjects.map(p => `
          <li class="archived-project">
              <div class="archived-project-name">${p.name}</div>
              <div class="archived-project-details">
                  <p><strong>Archived Date:</strong> ${p.archived_date}</p>
              </div>
              <button onclick="unarchiveProject(${p.id})">Unarchive</button>
          </li>
      `).join('');
  } catch (error) {
      console.error("Error loading archived projects:", error);
      alert("Failed to load archived projects.");
  }
}

// Open archived projects modal
document.getElementById('view-archived-projects').addEventListener('click', () => {
  document.getElementById('archived-projects-modal').style.display = 'block';
  loadArchivedProjects();
});

// Close archived projects modal
document.querySelector('#archived-projects-modal .close').addEventListener('click', () => {
  document.getElementById('archived-projects-modal').style.display = 'none';
});

// Unarchive a project
async function unarchiveProject(projectId) {
  try {
      await queryDB('DELETE FROM project_archive WHERE project_id = ?', [projectId]);
      alert("Project unarchived successfully.");
      
      await loadArchivedProjects(); // Refresh archived projects list
      await loadProjects(); // Refresh active projects list
      
  } catch (error) {
      console.error("Error unarchiving project:", error);
      alert("Failed to unarchive project.");
  }
}

async function addComment() {
  const projectId = selectedProjectId;
  const commentText = document.getElementById('new-comment').value.trim();

  if (!projectId) {
      alert("Please select a project before adding a comment.");
      return;
  }

  if (!commentText) {
      alert("Comment cannot be empty.");
      return;
  }

  try {
      await queryDB(`
          INSERT INTO project_comments (project_id, comment, comment_date) 
          VALUES (?, ?, DATETIME('now'))
      `, [projectId, commentText]);

      document.getElementById('new-comment').value = ''; // Clear input
      alert("Comment added successfully.");
      
      await loadComments(projectId); // Refresh comments list
  } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment.");
  }
}

// Attach event listener to "Add Comment" button
document.getElementById('add-comment').addEventListener('click', addComment);


async function loadComments(projectId) {
  const comments = await queryDB(`
      SELECT * FROM project_comments WHERE project_id = ? ORDER BY comment_date DESC
  `, [projectId]);

  const commentsDiv = document.getElementById('comments');
  if (comments.length === 0) {
      commentsDiv.innerHTML = "<p>No comments yet.</p>";
      return;
  }

  commentsDiv.innerHTML = comments.map(c => `
      <div class="note">
          <p>${c.comment}</p>
          <small>${formatDateTime(c.comment_date)}</small>
      </div>
  `).join('');
}

// Call this function whenever a project is selected
async function loadProjectDetails(projectId) {
  console.log(`🔍 Fetching details for project ID: ${projectId}`);

  const details = await queryDB('SELECT * FROM project_details WHERE project_id = ?', [projectId]);

  console.log("📊 Project details fetched:", details); // Debugging log

  // Reference UI elements
  const descriptionSpan = document.getElementById('project-description');
  const devLeadSpan = document.getElementById('dev-lead');
  const businessContactSpan = document.getElementById('business-contact');
  const linksDiv = document.getElementById('links');

  if (!descriptionSpan || !devLeadSpan || !businessContactSpan || !linksDiv) {
      console.error("🚨 UI elements for project details not found in DOM.");
      return;
  }

  if (details.length > 0) {
      console.log("✅ Updating UI with project details...");

      // Extract first (and only) result
      const project = details[0];

      // Update UI with project details
      descriptionSpan.textContent = project.description && project.description.trim() ? project.description : 'No description available';
      devLeadSpan.textContent = project.dev_lead && project.dev_lead.trim() ? project.dev_lead : 'Not Assigned';
      businessContactSpan.textContent = project.business_contact && project.business_contact.trim() ? project.business_contact : 'Not Available';

      // Properly format and display links
      linksDiv.innerHTML = project.links && project.links.trim()
          ? project.links.split('\n').map(link => `<div class="link-item">${link.trim()}</div>`).join('')
          : '<div>No links available</div>';
  } else {
      console.warn(`⚠ No details found for project ID: ${projectId}`);
      descriptionSpan.textContent = 'No description available';
      devLeadSpan.textContent = 'Not Assigned';
      businessContactSpan.textContent = 'Not Available';
      linksDiv.innerHTML = '<div>No links available</div>';
  }
}



// Initialize the app
window.addEventListener('DOMContentLoaded', async () => {
  console.log('App Loaded');
  await loadProjects();

  const addProjectButton = document.getElementById('add-project');
  const importDataButton = document.getElementById('import-data');
  const exportDataButton = document.getElementById('export-data');

  if (addProjectButton) {
    addProjectButton.addEventListener('click', addProject);
    console.log('Add Project button listener attached');
  } else {
    console.error('Add Project button not found');
  }

  if (importDataButton) {
    importDataButton.addEventListener('click', async () => {
      console.log('Import button clicked');
      await importData();
    });
    console.log('Import button listener attached');
  } else {
    console.error('Import button not found');
  }

  if (exportDataButton) {
    exportDataButton.addEventListener('click', async () => {
      console.log('Export button clicked');
      await exportData();
    });
    console.log('Export button listener attached');
  } else {
    console.error('Export button not found');
  }
});