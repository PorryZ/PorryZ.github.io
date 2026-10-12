const parseCsv = (text) => {
    const rows = [];
    let current = '';
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '"' && next === '"') {
            current += '"';
            i++;
            continue;
        }
        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
            continue;
        }
        if (char === '\n' && !inQuotes) {
            row.push(current);
            if (row.length > 1 || row[0] !== '') {
                rows.push(row);
            }
            row = [];
            current = '';
            continue;
        }
        if (char !== '\r') {
            current += char;
        }
    }
    if (current.length || row.length) {
        row.push(current);
        rows.push(row);
    }
    return rows;
};

const renderTable = (containerId, rows) => {
    const container = document.getElementById(containerId);
    if (!container || rows.length === 0) {
        return;
    }
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    rows[0].forEach((header) => {
        const th = document.createElement('th');
        th.textContent = header;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.slice(1).forEach((row) => {
        const tr = document.createElement('tr');
        rows[0].forEach((_, index) => {
            const td = document.createElement('td');
            const value = row[index] || '';
            td.innerHTML = value.replace(/\\n/g, '<br>');
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
};

const loadTable = async (csvPath, containerId) => {
    const response = await fetch(csvPath);
    const text = await response.text();
    const rows = parseCsv(text.trim());
    renderTable(containerId, rows);
};

loadTable('data/terraria/boss.csv', 'boss-table');
loadTable('data/terraria/npc.csv', 'npc-table');

const tabButtons = document.querySelectorAll('.tab-button');
const panels = document.querySelectorAll('.table-panel');

tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const target = button.getAttribute('data-target');
        tabButtons.forEach((btn) => btn.classList.remove('active'));
        panels.forEach((panel) => panel.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(target).classList.add('active');
    });
});
