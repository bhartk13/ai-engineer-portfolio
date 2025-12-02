from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)
TASKS_FILE = 'tasks.json'

class Task:
    def __init__(self, name, priority, task_id=None):
        self.name = name
        self.priority = int(priority)
        self.task_id = task_id or datetime.now().timestamp()
        self.created_at = datetime.now().isoformat()
    
    def to_dict(self):
        return {
            'id': self.task_id,
            'name': self.name,
            'priority': self.priority,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data):
        task = cls(data['name'], data['priority'], data.get('id'))
        task.created_at = data.get('created_at', datetime.now().isoformat())
        return task

class TaskManager:
    def __init__(self, file_path=TASKS_FILE):
        self.file_path = file_path
        self.tasks = []
        self.load_tasks()
    
    def load_tasks(self):
        """Load tasks from JSON file"""
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r') as f:
                    data = json.load(f)
                    self.tasks = [Task.from_dict(task_data) for task_data in data]
                    self.tasks.sort(key=lambda x: x.priority, reverse=False)
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error loading tasks: {e}")
                self.tasks = []
        else:
            self.tasks = []
    
    def save_tasks(self):
        """Save tasks to JSON file"""
        try:
            with open(self.file_path, 'w') as f:
                json.dump([task.to_dict() for task in self.tasks], f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving tasks: {e}")
            return False
    
    def add_task(self, name, priority):
        """Add a new task and save to file"""
        try:
            priority_int = int(priority)
            if not (1 <= priority_int <= 5):
                return False, "Priority must be between 1 and 5"
            
            # Check for duplicate task (case-insensitive)
            name_lower = name.strip().lower()
            for existing_task in self.tasks:
                if existing_task.name.strip().lower() == name_lower:
                    return False, f"Task '{name}' already exists"
            
            task = Task(name, priority_int)
            self.tasks.append(task)
            self.tasks.sort(key=lambda x: x.priority, reverse=False)
            
            if self.save_tasks():
                return True, task.to_dict()
            else:
                return False, "Failed to save task"
        except ValueError:
            return False, "Priority must be a valid number"
    
    def get_tasks(self):
        """Get all tasks as dictionaries"""
        return [task.to_dict() for task in self.tasks]
    
    def remove_task(self, task_id):
        """Remove a task by ID and save to file"""
        try:
            task_id_float = float(task_id)
            for i, task in enumerate(self.tasks):
                if task.task_id == task_id_float:
                    self.tasks.pop(i)
                    if self.save_tasks():
                        return True, "Task removed successfully"
                    else:
                        return False, "Failed to save after removal"
            return False, "Task not found"
        except (ValueError, TypeError):
            return False, "Invalid task ID"

# Initialize task manager
task_manager = TaskManager()

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks"""
    return jsonify(task_manager.get_tasks())

@app.route('/api/tasks', methods=['POST'])
def add_task():
    """Add a new task"""
    data = request.get_json()
    name = data.get('name', '').strip()
    priority = data.get('priority')
    
    if not name:
        return jsonify({'success': False, 'error': 'Task name is required'}), 400
    
    if priority is None:
        return jsonify({'success': False, 'error': 'Priority is required'}), 400
    
    success, result = task_manager.add_task(name, priority)
    
    if success:
        return jsonify({'success': True, 'task': result}), 201
    else:
        return jsonify({'success': False, 'error': result}), 400

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def remove_task(task_id):
    """Remove a task"""
    success, message = task_manager.remove_task(task_id)
    
    if success:
        return jsonify({'success': True, 'message': message}), 200
    else:
        return jsonify({'success': False, 'error': message}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

