class Task:
    def __init__(self, name, priority):
        self.name = name
        self.priority = int(priority)  

    def __str__(self):
        return f"[Priority {self.priority}] {self.name}"

class TaskManager:
    def __init__(self):
        self.tasks = []

    def add_task(self, name, priority):
        task = Task(name, priority)
        self.tasks.append(task)
        self.tasks.sort(key=lambda x: x.priority, reverse=False)

    def list_tasks(self):
        if not self.tasks:
            print("No tasks found.")
        for i, task in enumerate(self.tasks):
            print(f"{i + 1}. {task}")

    def remove_task(self, index):
        if 0 <= index < len(self.tasks):
            self.tasks.pop(index)
            return True
        return False

def print_menu():
    print("\nTask Tracker")
    print("1. Add task")
    print("2. List tasks")
    print("3. Remove task")
    print("4. Exit")

def main():
    manager = TaskManager()
    while True:
        print_menu()
        choice = input("Choose an option: ")

        if choice == "1":
            name = input("Enter task name: ")
            priority = input("Enter priority (1-5): ")
            try:
                priority_int = int(priority)
                if 1 <= priority_int <= 5:
                    manager.add_task(name, priority_int)
                    print("Task added.")
                else:
                    print("Invalid priority. Please enter a number between 1-5.")
            except ValueError:
                print("Invalid priority. Please enter a number between 1-5.")

        elif choice == "2":
            manager.list_tasks()

        elif choice == "3":
            manager.list_tasks()
            if manager.tasks:
                try:
                    index = int(input("Enter task number to remove: "))
                    # Convert from 1-based (user input) to 0-based (list index)
                    if manager.remove_task(index - 1):
                        print("Task removed.")
                    else:
                        print("Invalid task number.")
                except ValueError:
                    print("Invalid input. Please enter a number.")

        elif choice == "4":
            print("Goodbye!")
            break
        else:
            print("Invalid choice.")

if __name__ == "__main__":
    main()