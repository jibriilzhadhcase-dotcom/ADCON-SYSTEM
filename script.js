// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyCQjMADu4M4Fp-QWe__vl1eEAAfZxHftP8",
    authDomain: "adcom-database.firebaseapp.com",
    databaseURL: "https://adcom-database-default-rtdb.firebaseio.com",
    projectId: "adcom-database",
    storageBucket: "adcom-database.firebasestorage.app",
    messagingSenderId: "44119990641",
    appId: "1:44119990641:web:c0a08877a70e5c387c16d0",
    measurementId: "G-583ZZT6JV7"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

const SYSTEM_USERS = [
    { username: "Maxamuud", password: "1234", role: "user", isBlocked: false },
    { username: "Cawil Rashiid", password: "user123", role: "user", isBlocked: false },
    { username: "Jibriil Mohamed Ahmed", password: "user123", role: "user", isBlocked: false },
    { username: "Eng. Jibriil Axmed Ali", password: "admin123", role: "admin", isBlocked: false },
    { username: "Caawiyaha Eng", password: "admin123", role: "admin", isBlocked: false }
];

let currentUser = JSON.parse(localStorage.getItem('adcon_current_user')) || null;
let cachedRecords = [];
let selectedChatUser = null;

document.addEventListener('DOMContentLoaded', function () {
    initUserAccounts();
    checkAuthStatus();
    setupLogin();
    setupFormListeners();
    listenToRealtimeData();
    registerServiceWorker();
    loadChatUsers();
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Error:', err));
    }
}

function initUserAccounts() {
    db.ref('users').once('value', snapshot => {
        if (!snapshot.exists()) {
            let usersObj = {};
            SYSTEM_USERS.forEach(u => {
                let key = u.username.replace(/[\.\#\$\[\]]/g, "_");
                usersObj[key] = u;
            });
            db.ref('users').set(usersObj);
        }
    });
}

function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const usernameInput = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value.trim();

            db.ref('users').once('value', snapshot => {
                const users = snapshot.val();
                let foundUser = null;

                if (users) {
                    Object.keys(users).forEach(k => {
                        if (users[k].username.toLowerCase() === usernameInput.toLowerCase()) {
                            foundUser = users[k];
                        }
                    });
                }

                if (!foundUser) {
                    showError("Username ama Password khaldan!");
                    return;
                }

                const actualPassword = foundUser.password || foundUser.pass;

                if (actualPassword !== passwordInput) {
                    showError("Password-ka aad gelisay waa khaldan yahay!");
                    return;
                }

                if (foundUser.isBlocked) {
                    showError("Waxa ka joojiyey isticmaalka Eng Jibriil Axmed Ali");
                    return;
                }

                currentUser = foundUser;
                localStorage.setItem('adcon_current_user', JSON.stringify(currentUser));
                
                const loginModal = document.getElementById('loginModal');
                if (loginModal) loginModal.style.display = 'none';

                updateUIForRole();
                renderReports();
                loadChatUsers();
            });
        });
    }
}

function showError(msg) {
    const errorMsg = document.getElementById('loginErrorMessage');
    if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    } else {
        alert(msg);
    }
}

function checkAuthStatus() {
    const loginModal = document.getElementById('loginModal');
    if (currentUser) {
        let key = currentUser.username.replace(/[\.\#\$\[\]]/g, "_");
        db.ref('users/' + key).on('value', snapshot => {
            let uData = snapshot.val();
            if (uData && uData.isBlocked) {
                alert("Waxa ka joojiyey isticmaalka Eng Jibriil Axmed Ali");
                logout();
            }
        });

        if (loginModal) loginModal.style.display = 'none';
        updateUIForRole();
    } else {
        if (loginModal) loginModal.style.display = 'flex';
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('adcon_current_user');
    const loginModal = document.getElementById('loginModal');
    if (loginModal) loginModal.style.display = 'flex';
}

function updateUIForRole() {
    const userDisplay = document.getElementById('currentUserDisplay');
    const adminMgmtBtn = document.getElementById('adminUserMgmtBtn');

    if (userDisplay && currentUser) {
        userDisplay.textContent = `👤 ${currentUser.username} (${currentUser.role.toUpperCase()})`;
    }

    if (adminMgmtBtn) {
        adminMgmtBtn.style.display = (currentUser && currentUser.role === 'admin') ? 'block' : 'none';
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetSection = document.getElementById(pageId);
    if (targetSection) targetSection.classList.add('active');

    if (pageId === 'user-management') {
        renderUserManagementTable();
    } else if (pageId === 'messages-page') {
        loadChatUsers();
    }
}

function setupFormListeners() {
    handleFormSubmit('formProduction', () => {
        const dust = parseFloat(document.getElementById('prodDust')?.value) || 0;
        const agg10 = parseFloat(document.getElementById('prodAggregate10')?.value) || 0;
        const agg20 = parseFloat(document.getElementById('prodAggregate20')?.value) || 0;
        return { date: document.getElementById('prodDate')?.value || getTodayDate(), type: 'production', info: `Dust: ${dust}, 10mm: ${agg10}, 20mm: ${agg20}`, value: dust + agg10 + agg20 };
    });

    handleFormSubmit('formFuel', () => {
        const driver = document.getElementById('fuelDriverName')?.value || '';
        const plate = document.getElementById('fuelPlateNumber')?.value || '';
        const liters = parseFloat(document.getElementById('fuelLiters')?.value) || 0;
        const station = document.getElementById('fuelStationName')?.value || '';
        return { date: document.getElementById('fuelDate')?.value || getTodayDate(), type: 'fuel', info: `Driver: ${driver} | Plate: ${plate} | Station: ${station}`, value: liters };
    });

    handleFormSubmit('formTrucks', () => {
        const driver = document.getElementById('truckDriverName')?.value || '';
        const dest = document.getElementById('truckDestination')?.value || '';
        const plate = document.getElementById('truckPlateNumber')?.value || '';
        return { date: document.getElementById('truckDate')?.value || getTodayDate(), type: 'trucks', info: `Driver: ${driver} | Dest: ${dest} | Plate: ${plate}`, value: 1 };
    });

    handleFormSubmit('formSales', () => {
        const driver = document.getElementById('salesDriverName')?.value || '';
        const customer = document.getElementById('salesCustomerName')?.value || '';
        const loads = document.getElementById('salesLoads')?.value || 0;
        const truck = document.getElementById('salesTruckInfo')?.value || '';
        const amount = parseFloat(document.getElementById('salesAmount')?.value) || 0;
        return { date: document.getElementById('salesDate')?.value || getTodayDate(), type: 'sales', category: 'Aggregate', info: `Customer: ${customer} | Driver: ${driver} | Truck: ${truck} (${loads} loads)`, value: amount };
    });

    handleFormSubmit('formExpenses', () => {
        const item = document.getElementById('expItemName')?.value || '';
        const amount = parseFloat(document.getElementById('expAmount')?.value) || 0;
        const loc = document.getElementById('expLocation')?.value || '';
        return { date: document.getElementById('expDate')?.value || getTodayDate(), type: 'expenses', category: 'Equipment', info: `Item: ${item} | Location: ${loc}`, value: amount };
    });

    handleFormSubmit('formIncoming', () => {
        const desc = document.getElementById('incDescription')?.value || '';
        const payer = document.getElementById('incPayerName')?.value || '';
        const amount = parseFloat(document.getElementById('incAmount')?.value) || 0;
        return { date: document.getElementById('incDate')?.value || getTodayDate(), type: 'incoming', info: `Payer: ${payer} | Desc: ${desc}`, value: amount };
    });
}

function handleFormSubmit(formId, dataMapper) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!currentUser) return alert("Fadlan soo gal!");

        const newItem = {
            ...dataMapper(),
            createdBy: currentUser.username,
            createdAt: new Date().toISOString(),
            comments: []
        };

        db.ref('records').push(newItem)
            .then(() => {
                alert('Xogta waa la kaydiyay!');
                form.reset();
            })
            .catch(err => alert('Error: ' + err.message));
    });
}

function listenToRealtimeData() {
    db.ref('records').on('value', (snapshot) => {
        const data = snapshot.val();
        cachedRecords = [];
        if (data) {
            Object.keys(data).forEach(key => {
                cachedRecords.push({ id: key, ...data[key] });
            });
        }
        updateDashboard(cachedRecords);
        renderReports();
    });
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function updateDashboard(records) {
    const today = getTodayDate();
    const todayAggregateIncome = records.filter(r => r.type === 'sales' && r.date === today).reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
    const todayEquipmentExpense = records.filter(r => r.type === 'expenses' && r.date === today).reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
    const todayNetBalance = todayAggregateIncome - todayEquipmentExpense;

    if (document.getElementById('dashTodayAggregateIncome')) document.getElementById('dashTodayAggregateIncome').textContent = `$${todayAggregateIncome}`;
    if (document.getElementById('dashTodayEquipmentExpense')) document.getElementById('dashTodayEquipmentExpense').textContent = `$${todayEquipmentExpense}`;
    if (document.getElementById('dashTodayNetBalance')) document.getElementById('dashTodayNetBalance').textContent = `$${todayNetBalance}`;

    const getSum = (type) => records.filter(r => r.type === type).reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
    const getCount = (type) => records.filter(r => r.type === type).length;

    if (document.getElementById('dashTotalSales')) document.getElementById('dashTotalSales').textContent = `$${getSum('sales')}`;
    if (document.getElementById('dashTotalExpenses')) document.getElementById('dashTotalExpenses').textContent = `$${getSum('expenses')}`;
    if (document.getElementById('dashTotalIncoming')) document.getElementById('dashTotalIncoming').textContent = `$${getSum('incoming')}`;
    if (document.getElementById('dashTotalFuel')) document.getElementById('dashTotalFuel').textContent = `${getSum('fuel')} L`;
    if (document.getElementById('dashTotalTrucks')) document.getElementById('dashTotalTrucks').textContent = `${getCount('trucks')}`;
    if (document.getElementById('dashTotalProduction')) document.getElementById('dashTotalProduction').textContent = `${getSum('production')} Loads`;
}

function renderReports() {
    const tableBody = document.getElementById('reportTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    cachedRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.date || 'N/A'}</td>
            <td style="font-weight:bold;">${record.type}</td>
            <td>${record.info || ''}</td>
            <td>$${record.value}</td>
            <td><small>${record.createdBy || 'Unknown'}</small></td>
            <td><i>Diminish</i></td>
            <td><button onclick="addComment('${record.id}')">💬</button></td>
        `;
        tableBody.appendChild(row);
    });
}

function renderUserManagementTable() {
    const tableBody = document.getElementById('userTableBody');
    if (!tableBody) return;

    db.ref('users').once('value', snapshot => {
        const users = snapshot.val();
        tableBody.innerHTML = '';

        if (users) {
            Object.keys(users).forEach(key => {
                const u = users[key];
                const row = document.createElement('tr');

                let statusBadge = u.isBlocked ? '<span style="color:red; font-weight:bold;">Blocked</span>' : '<span style="color:green; font-weight:bold;">Active</span>';
                let toggleBtn = u.isBlocked ? 
                    `<button style="background-color: #10b981; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;" onclick="toggleBlockUser('${key}', false)">🔓 Unblock</button>` :
                    `<button style="background-color: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;" onclick="toggleBlockUser('${key}', true)">🔒 Block</button>`;

                if (u.username === "Eng. Jibriil Axmed Ali") {
                    toggleBtn = '<i>Primary Admin</i>';
                }

                row.innerHTML = `
                    <td>${u.username}</td>
                    <td style="text-transform: capitalize;">${u.role}</td>
                    <td>${statusBadge}</td>
                    <td>${toggleBtn}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    });
}

function toggleBlockUser(userKey, blockStatus) {
    if (!currentUser || currentUser.role !== 'admin') return alert("Admin kaliya!");

    db.ref(`users/${userKey}/isBlocked`).set(blockStatus)
        .then(() => {
            alert(blockStatus ? "User-ka waa la xiray!" : "User-ka waa la furay!");
            renderUserManagementTable();
        });
}

// --- ADD NEW USER FUNCTION (FIXED) ---
function addNewUserHandler(e) {
    if (e) e.preventDefault();

    if (!currentUser || currentUser.role !== 'admin') {
        alert("Admin kaliya ayaa abuuraya user cusub!");
        return false;
    }

    const usernameInput = document.getElementById('newUsername').value.trim();
    const passwordInput = document.getElementById('newUserPassword').value.trim();
    const roleInput = document.getElementById('newUserRole').value;

    if (!usernameInput || !passwordInput) {
        alert("Fadlan buuxi magaca iyo password-ka!");
        return false;
    }

    const key = usernameInput.replace(/[\.\#\$\[\]]/g, "_");
    const newUser = {
        username: usernameInput,
        password: passwordInput,
        role: roleInput,
        isBlocked: false
    };

    db.ref(`users/${key}`).set(newUser)
        .then(() => {
            alert(`User-ka "${usernameInput}" si guul leh ayaa loo abuuray!`);
            document.getElementById('newUsername').value = '';
            document.getElementById('newUserPassword').value = '';
            renderUserManagementTable();
            loadChatUsers();
        })
        .catch(err => alert("Cillad: " + err.message));

    return false;
}

function loadChatUsers() {
    const userListContainer = document.getElementById('chatUserList');
    if (!userListContainer) return;

    db.ref('users').once('value', snapshot => {
        const users = snapshot.val();
        userListContainer.innerHTML = '';

        if (users) {
            Object.keys(users).forEach(key => {
                const u = users[key];
                if (currentUser && u.username.toLowerCase() === currentUser.username.toLowerCase()) return;

                const li = document.createElement('li');
                li.className = 'user-chat-item';
                li.textContent = `👤 ${u.username}`;
                li.onclick = () => selectUserForChat(u.username, li);
                userListContainer.appendChild(li);
            });
        }
    });
}

function selectUserForChat(username, element) {
    selectedChatUser = username;
    document.querySelectorAll('.user-chat-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    document.getElementById('activeChatUser').textContent = `💬 Sheekada: ${username}`;
    document.getElementById('chatInput').disabled = false;
    document.getElementById('chatSendBtn').disabled = false;

    listenToDirectMessages();
}

function sendDirectMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();

    if (!text || !selectedChatUser || !currentUser) return;

    const msgData = {
        sender: currentUser.username.trim(),
        receiver: selectedChatUser.trim(),
        text: text,
        timestamp: new Date().toISOString()
    };

    db.ref('messages').push(msgData).then(() => { input.value = ''; });
}

function listenToDirectMessages() {
    if (!selectedChatUser || !currentUser) return;

    db.ref('messages').on('value', snapshot => {
        const data = snapshot.val();
        const msgContainer = document.getElementById('chatMessages');
        if (!msgContainer) return;

        msgContainer.innerHTML = '';
        if (data) {
            Object.keys(data).forEach(key => {
                const msg = data[key];
                const sender = msg.sender?.toLowerCase().trim();
                const receiver = msg.receiver?.toLowerCase().trim();
                const myName = currentUser.username.toLowerCase().trim();
                const activeUser = selectedChatUser.toLowerCase().trim();

                if ((sender === myName && receiver === activeUser) || (sender === activeUser && receiver === myName)) {
                    const bubble = document.createElement('div');
                    bubble.className = `chat-bubble ${sender === myName ? 'sent' : 'received'}`;
                    bubble.innerHTML = `<div>${msg.text}</div>`;
                    msgContainer.appendChild(bubble);
                }
            });
        }
    });
}

function updateAccountSettingsHandler() {
    if (!currentUser) return;

    const newUsername = document.getElementById('newUsernameInput').value.trim();
    const newPassword = document.getElementById('newPasswordInput').value.trim();

    if (!newUsername && !newPassword) return alert("Fadlan geli xog cusub!");

    const oldKey = currentUser.username.replace(/[\.\#\$\[\]]/g, "_");
    const updates = {};
    if (newUsername) updates.username = newUsername;
    if (newPassword) updates.password = newPassword;

    db.ref(`users/${oldKey}`).update(updates)
        .then(() => {
            alert("Xogtaada si guul leh ayaa loo beddelay!");
            localStorage.setItem('adcon_current_user', JSON.stringify({ ...currentUser, ...updates }));
            location.reload();
        });
}