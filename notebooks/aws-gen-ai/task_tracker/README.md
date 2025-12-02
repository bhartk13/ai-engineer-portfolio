# 📋 Task Tracker

A modern, full-stack task management application built with Flask. Manage your tasks with priority levels (1-5) through an intuitive web interface or command-line interface. Tasks are automatically saved to a local JSON file for persistence.

## ✨ Features

- **Priority-Based Task Management**: Assign priorities from 1 (highest) to 5 (lowest)
- **Automatic Sorting**: Tasks are automatically sorted by priority
- **Duplicate Prevention**: Prevents adding duplicate tasks (case-insensitive)
- **File Persistence**: All tasks are saved to `tasks.json` for persistence across sessions
- **Modern Web UI**: Beautiful, responsive web interface with gradient design
- **RESTful API**: Clean API endpoints for task operations
- **CLI Support**: Original command-line interface included
- **Input Validation**: Comprehensive validation for task names and priorities

## 🚀 Quick Start

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd notebooks/aws-gen-ai/task_tracker
   ```

2. **Install dependencies:**
   ```bash
   pip install -r code/requirements.txt
   ```

### Running the Web Application

1. **Start the Flask server:**
   ```bash
   python app.py
   ```

2. **Open your browser:**
   Navigate to `http://localhost:5000`

3. **Start managing tasks!**
   - Add tasks with names and priorities (1-5)
   - View all tasks sorted by priority
   - Delete tasks you've completed

### Running the CLI Version

For the original command-line interface:

```bash
python task_tracker.py
```

Follow the interactive menu to add, list, or remove tasks.

## 📁 Project Structure

```
task_tracker/
├── app.py                 # Flask web application (main entry point)
├── task_tracker.py        # Original CLI version
├── templates/
│   └── index.html        # Frontend HTML/CSS/JavaScript
├── code/
│   └── requirements.txt  # Python dependencies
├── tasks.json            # Task storage (auto-generated)
└── README.md            # This file
```

## 🔌 API Endpoints

The Flask application provides the following REST API endpoints:

### GET `/api/tasks`
Retrieve all tasks.

**Response:**
```json
[
  {
    "id": 1701234567.89,
    "name": "Complete project",
    "priority": 1,
    "created_at": "2024-01-01T12:00:00"
  }
]
```

### POST `/api/tasks`
Add a new task.

**Request Body:**
```json
{
  "name": "Buy groceries",
  "priority": 2
}
```

**Response (Success):**
```json
{
  "success": true,
  "task": {
    "id": 1701234567.89,
    "name": "Buy groceries",
    "priority": 2,
    "created_at": "2024-01-01T12:00:00"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Task 'Buy groceries' already exists"
}
```

### DELETE `/api/tasks/<task_id>`
Remove a task by ID.

**Response (Success):**
```json
{
  "success": true,
  "message": "Task removed successfully"
}
```

## 🎯 Priority System

Tasks use a priority scale from 1 to 5:
- **Priority 1**: Highest priority (most urgent)
- **Priority 2**: High priority
- **Priority 3**: Medium priority (default)
- **Priority 4**: Low priority
- **Priority 5**: Lowest priority

Tasks are automatically sorted with highest priority (1) appearing first.

## 🛠️ Technologies Used

- **Backend**: Flask 3.0.0
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: JSON file-based persistence
- **Python**: 3.7+

## 📝 Usage Examples

### Adding a Task via API

```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name": "Finish documentation", "priority": 1}'
```

### Getting All Tasks

```bash
curl http://localhost:5000/api/tasks
```

### Deleting a Task

```bash
curl -X DELETE http://localhost:5000/api/tasks/1701234567.89
```

## 🔒 Data Persistence

Tasks are automatically saved to `tasks.json` in the project root directory. The file is created automatically when you add your first task. Tasks persist between application restarts.

**Note**: The `tasks.json` file is included in `.gitignore` by default to prevent committing personal task data.

## 🐛 Error Handling

The application includes comprehensive error handling:

- **Invalid Priority**: Must be an integer between 1 and 5
- **Missing Fields**: Task name and priority are required
- **Duplicate Tasks**: Case-insensitive duplicate detection
- **File Errors**: Graceful handling of file read/write errors

## 🎨 Web Interface Features

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Gradient backgrounds and smooth animations
- **Real-time Updates**: Tasks update immediately after add/delete operations
- **Visual Priority Indicators**: Color-coded priority badges
- **Empty State**: Helpful message when no tasks exist
- **Success/Error Messages**: Clear feedback for all operations

## 🔮 Future Enhancements

Potential improvements for future versions:

- [ ] Task editing/updating functionality
- [ ] Task completion status (mark as done)
- [ ] Due dates and reminders
- [ ] Task categories/tags
- [ ] Search and filter capabilities
- [ ] Export tasks to CSV/PDF
- [ ] User authentication and multi-user support
- [ ] Database backend (SQLite/PostgreSQL)

## 📄 License

This project is part of a learning portfolio and is available for educational purposes.

## 👤 Author

Part of the AI Engineer Portfolio - demonstrating full-stack web development with Flask.

---

**Happy Task Managing! 🎉**

