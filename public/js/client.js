// public/js/client.js (ONE ORIGIN ONLY, cookie auth)

let editingTodoId = null;

// Material Tailwind utility classes
const MT = {
    list: "grid grid-cols-3 pb-4 px-1",
    li: "rounded-2xl bg-gray-800 p-5 m-2 border border-white/10 flex flex-col",
    main: "flex flex-col gap-1",
    others: "mt-3 flex flex-wrap gap-3 text-sm text-gray-300",
    buttons: "mt-4 flex gap-3",
    title: "text-xl font-bold text-white",
    desc: "text-md leading-snug h-[60px] text-gray-300 italic overflow-hidden",
    meta: "text-xs text-gray-400 flex items-center gap-2",
    badgeBase: "inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold uppercase",
    badgeLow: "bg-green-700 text-white",
    badgeMedium: "bg-yellow-600 text-white",
    badgeHigh: "bg-red-600 text-white",
    btnBase: "inline-flex ",
    btnPrimary:
        "middle none rounded-lg bg-white py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-gray-900 shadow-md shadow-gray-900/20 transition-all hover:shadow-lg hover:shadow-gray-900/30",
    btnSecondary:
        "middle none rounded-lg bg-gray-700 py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-gray-900/20 transition-all hover:bg-gray-600 hover:shadow-lg hover:shadow-gray-900/30",
    buttons: "inline-flex gap-2 justify-end px-4 py-1",
};

window.onload = function () {
    const addBtn = document.querySelector("#big-button");
    const cancelBtn = document.querySelector("#cancel-btn");
    const form = document.querySelector("#todo-form");

    if (addBtn) {
        addBtn.onclick = () => {
            history.pushState({}, "", "/index?add");
            renderRoute();
        };
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            editingTodoId = null;
            document.querySelector("#todo-form h2").textContent = "Add New Todo";
            document.querySelector("#todo-form button[type='submit']").textContent = "Add";

            history.pushState({}, "", "/index");
            renderRoute();
        };
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await submit(e);
            history.pushState({}, "", "/index");
            renderRoute();
            loadTodos();
            form.reset();
        };
    }

    window.onpopstate = renderRoute;

    loadTodos();
    renderRoute();
};

const submit = async function (event) {
    event.preventDefault();

    const task = document.querySelector("#task").value;
    const priority = document.querySelector("#priority").value;
    const desc = document.querySelector("#description").value;
    const deadline = document.querySelector("#deadline").value;
    const date = new Date().toLocaleString();

    let response;

    if (editingTodoId === null) {
        response = await fetch("/api/data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ task, desc, priority, deadline, date }),
        });
    } else {
        response = await fetch(`/api/data/${editingTodoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ task, desc, priority, deadline, date }),
        });

        editingTodoId = null;
    }

    if (response.status === 401) window.location.href = "/login";
};

const loadTodos = async function () {
    const response = await fetch("/api/data", { credentials: "include" });

    if (response.status === 401) {
        window.location.href = "/login";
        return;
    }

    const todos = await response.json();

    const list = document.querySelector("#todo-list");
    list.innerHTML = "";
    list.className = MT.list;

    todos.forEach((todo) => {
        const main = document.createElement("div");
        main.className = MT.main;

        const content = document.createElement("div");
        content.className = MT.others;

        const buttons = document.createElement("div");
        buttons.className = MT.buttons;

        const txt = document.createElement("span");
        txt.textContent = todo.task;
        txt.className = MT.title;

        const desc = document.createElement("span");
        desc.textContent = todo.desc;
        desc.className = MT.desc;

        const createDate = document.createElement("span");
        const d = new Date(todo.date).toLocaleString();
        createDate.textContent = `Created on ${d}`;
        createDate.className = MT.meta;

        const deadline = document.createElement("span");
        deadline.textContent = `Deadline in ${todo.deadline} days`;
        deadline.className = `${MT.badgeBase} ${MT.badgeLow}`;

        const priority = document.createElement("span");
        priority.textContent = `Priority: ${todo.priority}`;

        if ((todo.priority || "").toLowerCase() === "high") {
            priority.className = `${MT.badgeBase} ${MT.badgeHigh}`;
        } else if ((todo.priority || "").toLowerCase() === "low") {
            priority.className = `${MT.badgeBase} ${MT.badgeLow}`;
        } else {
            priority.className = `${MT.badgeBase} ${MT.badgeMedium}`;
        }

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = `${MT.btnPrimary} ${MT.btnBase}`;
        editBtn.setAttribute("data-ripple-dark", "true");
        editBtn.onclick = () => editTodo(todo);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = `${MT.btnSecondary} ${MT.btnBase}`;
        deleteBtn.setAttribute("data-ripple-dark", "true");
        deleteBtn.onclick = () => deleteTodo(todo._id);

        main.appendChild(txt);
        if (todo.desc && todo.desc.trim().length > 0) main.appendChild(desc);
        main.appendChild(createDate);

        content.appendChild(priority);
        content.appendChild(deadline);

        buttons.appendChild(editBtn);
        buttons.appendChild(deleteBtn);

        const li = document.createElement("li");
        li.className = MT.li;
        li.appendChild(main);
        li.appendChild(content);
        li.appendChild(buttons);

        list.appendChild(li);
    });
};

const deleteTodo = async function (id) {
    const response = await fetch(`/api/data/${id}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (response.status === 401) window.location.href = "/login";
    else loadTodos();
};

const editTodo = function (todo) {
    editingTodoId = todo._id;

    document.querySelector("#task").value = todo.task;
    document.querySelector("#description").value = todo.desc;
    document.querySelector("#priority").value = todo.priority;

    document.querySelector("#todo-form h2").textContent = "Edit Todo";
    document.querySelector("#todo-form button[type='submit']").textContent = "Save";

    history.pushState({}, "", "/index?add");
    renderRoute();
};

const renderRoute = function () {
    const params = new URLSearchParams(window.location.search);
    const addCard = document.querySelector("#add-card");

    if (params.has("add")) {
        addCard.classList.remove("hidden");
        addCard.classList.add("flex");
    } else {
        addCard.classList.add("hidden");
        addCard.classList.remove("flex");
    }
};
