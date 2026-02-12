class Todo {
    constructor(task, desc, priority, deadlineDate, deadline, date, userId) {
        this.task = task;
        this.desc = desc;
        this.priority = priority;
        this.deadlineDate = deadlineDate;
        this.deadline = deadline;
        this.date = date;
        this.userId = userId;
    }
}

module.exports = Todo