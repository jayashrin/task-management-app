// ===============================
// LOGIN
// ===============================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);

        window.location.href = "/dashboard.html";
      } else {
        document.getElementById("loginMessage").textContent =
          data.message || "Login failed";
      }

    } catch (error) {
      document.getElementById("loginMessage").textContent =
        "Server error. Please try again.";
    }
  });
}


// ===============================
// SHOW REGISTER FORM
// ===============================

function showRegister() {
  const registerForm = document.getElementById("registerForm");

  if (registerForm) {
    registerForm.style.display = "block";
  }
}


// ===============================
// REGISTER
// ===============================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password
        })
      });

      const data = await response.json();

      const message = document.getElementById("registerMessage");

      if (response.ok) {
        message.textContent = "Registration successful!";

        registerForm.reset();
      } else {
        message.textContent =
          data.message || "Registration failed";
      }

    } catch (error) {
      document.getElementById("registerMessage").textContent =
        "Server error. Please try again.";
    }
  });
}


// ===============================
// DASHBOARD VARIABLES
// ===============================

let editingTaskId = null;


// ===============================
// LOAD TASKS
// ===============================

async function loadTasks() {

  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  try {

    const response = await fetch("/api/tasks", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/index.html";
      return;
    }

    const tasks = await response.json();

    displayTasks(tasks);

  } catch (error) {

    console.error("Error loading tasks:", error);

  }
}


// ===============================
// DISPLAY TASKS
// ===============================

function displayTasks(tasks) {

  const taskList = document.getElementById("taskList");

  if (!taskList) {
    return;
  }

  taskList.innerHTML = "";

  if (tasks.length === 0) {

    taskList.innerHTML = `
      <div class="task-card">
        <h3>No tasks yet</h3>
        <p>Add your first task above.</p>
      </div>
    `;

    return;
  }

  tasks.forEach((task) => {

    const taskCard = document.createElement("div");

    taskCard.className = "task-card";

    taskCard.innerHTML = `
      <h3>${escapeHtml(task.title)}</h3>

      <p>${escapeHtml(task.description || "")}</p>

      <span class="status">
        ${escapeHtml(task.status)}
      </span>

      <br><br>

      <button onclick="editTask('${task._id}')">
        Edit
      </button>

      <button onclick="deleteTask('${task._id}')">
        Delete
      </button>
    `;

    taskList.appendChild(taskCard);

  });
}

// ===============================
// ADD / UPDATE TASK
// ===============================

async function addTask() {

  const title = document.getElementById("taskTitle").value.trim();
  const description =
    document.getElementById("taskDescription").value.trim();
  const status =
    document.getElementById("taskStatus").value;

  if (!title) {
    alert("Please enter a task title.");
    return;
  }

  const token = localStorage.getItem("token");

  try {

    // ===========================
    // UPDATE EXISTING TASK
    // ===========================

    if (editingTaskId) {

      const response = await fetch(
        `/api/tasks/${editingTaskId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },

          body: JSON.stringify({
            title,
            description,
            status
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Could not update task.");
        return;
      }

      alert("Task updated successfully!");

      editingTaskId = null;

      resetTaskForm();

      await loadTasks();

      return;
    }


    // ===========================
    // CREATE NEW TASK
    // ===========================

    const response = await fetch("/api/tasks", {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },

      body: JSON.stringify({
        title,
        description,
        status
      })

    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Could not add task.");
      return;
    }

    alert("Task added successfully!");

    resetTaskForm();

    await loadTasks();

  } catch (error) {

    console.error(error);

    alert("Server error. Please try again.");

  }
}


// ===============================
// EDIT TASK
// ===============================

async function editTask(taskId) {

  const token = localStorage.getItem("token");

  try {

    const response = await fetch(
      `/api/tasks/${taskId}`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const task = await response.json();

    if (!response.ok) {
      alert(task.message || "Could not get task.");
      return;
    }


    // Put existing task data into form

    document.getElementById("taskTitle").value =
      task.title || "";

    document.getElementById("taskDescription").value =
      task.description || "";

    document.getElementById("taskStatus").value =
      task.status || "Pending";


    // Remember which task we're editing

    editingTaskId = taskId;


    // Change button text

    const button = document.querySelector(
      ".task-form > button"
    );

    if (button) {
      button.textContent = "Update Task";
    }


    // Scroll to form

    document.querySelector(".task-form").scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {

    console.error(error);

    alert("Server error. Please try again.");

  }
}


// ===============================
// DELETE TASK
// ===============================

async function deleteTask(taskId) {

  const confirmed = confirm(
    "Are you sure you want to delete this task?"
  );

  if (!confirmed) {
    return;
  }

  const token = localStorage.getItem("token");

  try {

    const response = await fetch(
      `/api/tasks/${taskId}`,
      {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Could not delete task.");
      return;
    }

    alert("Task deleted successfully!");

    await loadTasks();

  } catch (error) {

    console.error(error);

    alert("Server error. Please try again.");

  }
}


// ===============================
// RESET TASK FORM
// ===============================

function resetTaskForm() {

  const titleInput =
    document.getElementById("taskTitle");

  const descriptionInput =
    document.getElementById("taskDescription");

  const statusInput =
    document.getElementById("taskStatus");

  if (titleInput) {
    titleInput.value = "";
  }

  if (descriptionInput) {
    descriptionInput.value = "";
  }

  if (statusInput) {
    statusInput.value = "Pending";
  }


  const button = document.querySelector(
    ".task-form > button"
  );

  if (button) {
    button.textContent = "Add Task";
  }

}


// ===============================
// LOGOUT
// ===============================

function logout() {

  localStorage.removeItem("token");

  window.location.href = "/index.html";

}


// ===============================
// SECURITY HELPER
// ===============================

function escapeHtml(text) {

  const div = document.createElement("div");

  div.textContent = text;

  return div.innerHTML;

}


// ===============================
// LOAD DASHBOARD
// ===============================

if (document.getElementById("taskList")) {

  loadTasks();

}