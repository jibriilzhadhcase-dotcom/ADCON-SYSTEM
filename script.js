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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// --- SYSTEM USERS & ACCOUNTS ---
const SYSTEM_USERS = [
    { username: "Maxamuud", pass: "1234", role: "user", isBlocked: false },
    { username: "Cawil Rashiid", pass: "user123", role: "user", isBlocked: false },
    { username: "Jibriil Mohamed Ahmed", pass: "user123", role: "user", isBlocked: false },
    { username: "Eng. Jibriil Axmed Ali", pass: "admin123", role: "admin", isBlocked: false },
    { username: "Caawiyaha Eng", pass: "admin123", role: "admin", isBlocked: false }
];

let currentUser = JSON.parse(localStorage.getItem('adcon_current_user')) || null;
let cachedRecords = [];

// Ogaanshada Internet-ka
db.ref('.info/connected').on('value', function(snap) {
    if (snap.val() === true) {
        console.log("Internet-ku waa Live (Online)");
    } else {
        console.log("Internet-ku waa Offline");
    }
});

document.addEventListener('DOMContentLoaded', function () {
    initUserAccounts();
    checkAuthStatus();
    setupLogin();
    setupFormListeners();
    listenToRealtimeData();
    registerServiceWorker();
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Error:', err));
    }
}

// Initialize User Accounts in Firebase if not present
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

// 2. AUTHENTICATION & LOGIN LOGIC
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

                if (foundUser.pass !== passwordInput) {
                    showError("Password-ka aad gelisay waa khaldan yahay!");
                    return;
                }

                if (foundUser.isBlocked) {
                    showError("Waxa ka joojiyey isticmaalka Eng Jibriil Axmed Ali");
                    return;
                }

                // Successful Login
                currentUser = foundUser;
                localStorage.setItem('adcon_current_user', JSON.stringify(currentUser));
                
                const errorMsg = document.getElementById('loginErrorMessage');
                if (errorMsg) errorMsg.style.display = 'none';
                
                const loginModal = document.getElementById('loginModal');
                if (loginModal) loginModal.style.display = 'none';

                updateUIForRole();
                renderReports();
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
        // Re-verify if blocked
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
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
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

// 3. NAVIGATION
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetSection = document.getElementById(pageId);
    if (targetSection) targetSection.classList.add('active');

    if (pageId === 'user-management') {
        renderUserManagementTable();
    }
}

// 4. FORM SUBMISSIONS WITH DATA ATTRIBUTION
function setupFormListeners() {
    handleFormSubmit('formProduction', 'production', () => {
        const dust = parseFloat(document.getElementById('prodDust')?.value) || 0;
        const agg10 = parseFloat(document.getElementById('prodAggregate10')?.value) || 0;
        const agg20 = parseFloat(document.getElementById('prodAggregate20')?.value) || 0;
        const date = document.getElementById('prodDate')?.value || getTodayDate();
        return {
            date, type: 'production',
            info: `Dust: ${dust}, 10mm: ${agg10}, 20mm: ${agg20}`,
            value: dust + agg10 + agg20
        };
    });

    handleFormSubmit('formFuel', 'fuel', () => {
        const driver = document.getElementById('fuelDriverName')?.value || '';
        const plate = document.getElementById('fuelPlateNumber')?.value || '';
        const liters = parseFloat(document.getElementById('fuelLiters')?.value) || 0;
        const station = document.getElementById('fuelStationName')?.value || '';
        const date = document.getElementById('fuelDate')?.value || getTodayDate();
        return {
            date, type: 'fuel',
            info: `Driver: ${driver} | Plate: ${plate} | Station: ${station}`,
            value: liters
        };
    });

    handleFormSubmit('formTrucks', 'trucks', () => {
        const driver = document.getElementById('truckDriverName')?.value || '';
        const dest = document.getElementById('truckDestination')?.value || '';
        const plate = document.getElementById('truckPlateNumber')?.value || '';
        const date = document.getElementById('truckDate')?.value || getTodayDate();
        return {
            date, type: 'trucks',
            info: `Driver: ${driver} | Dest: ${dest} | Plate: ${plate}`,
            value: 1
        };
    });

    handleFormSubmit('formSales', 'sales', () => {
        const driver = document.getElementById('salesDriverName')?.value || '';
        const customer = document.getElementById('salesCustomerName')?.value || '';
        const loads = document.getElementById('salesLoads')?.value || 0;
        const truck = document.getElementById('salesTruckInfo')?.value || '';
        const amount = parseFloat(document.getElementById('salesAmount')?.value) || 0;
        const date = document.getElementById('salesDate')?.value || getTodayDate();
        return {
            date, type: 'sales',
            category: 'Aggregate',
            info: `Customer: ${customer} | Driver: ${driver} | Truck: ${truck} (${loads} loads)`,
            value: amount
        };
    });

    handleFormSubmit('formExpenses', 'expenses', () => {
        const item = document.getElementById('expItemName')?.value || '';
        const amount = parseFloat(document.getElementById('expAmount')?.value) || 0;
        const loc = document.getElementById('expLocation')?.value || '';
        const date = document.getElementById('expDate')?.value || getTodayDate();
        return {
            date, type: 'expenses',
            category: 'Equipment',
            info: `Item: ${item} | Location: ${loc}`,
            value: amount
        };
    });

    handleFormSubmit('formIncoming', 'incoming', () => {
        const desc = document.getElementById('incDescription')?.value || '';
        const payer = document.getElementById('incPayerName')?.value || '';
        const amount = parseFloat(document.getElementById('incAmount')?.value) || 0;
        const date = document.getElementById('incDate')?.value || getTodayDate();
        return {
            date, type: 'incoming',
            info: `Payer: ${payer} | Desc: ${desc}`,
            value: amount
        };
    });
}

function handleFormSubmit(formId, pathKey, dataMapper) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        
        if (!currentUser) {
            alert("Fadlan marka hore soo gal (Login)!");
            return;
        }

        const mappedData = dataMapper();
        const newItem = {
            ...mappedData,
            createdBy: currentUser.username,
            createdAt: new Date().toISOString(),
            comments: []
        };

        db.ref('records').push(newItem)
            .then(() => {
                alert('Xogta si guul leh ayaa loogu kaydiyay Database-ka!');
                form.reset();
            })
            .catch(err => {
                alert('Cillad ayaa dhacday: ' + err.message);
            });
    });
}

// 5. REALTIME LISTENER & CALCULATIONS
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

// Helper to check 24-hour / Today's date
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function updateDashboard(records) {
    const today = getTodayDate();

    // Today's Aggregate Income (Sales) & Equipment Expenses
    const todayAggregateIncome = records
        .filter(r => r.type === 'sales' && r.date === today)
        .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

    const todayEquipmentExpense = records
        .filter(r => r.type === 'expenses' && r.date === today)
        .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

    const todayNetBalance = todayAggregateIncome - todayEquipmentExpense;

    // Monthly Accumulated Balance (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimitStr = thirtyDaysAgo.toISOString().split('T')[0];

    const monthlyIncome = records
        .filter(r => r.type === 'sales' && r.date >= dateLimitStr)
        .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

    const monthlyExpense = records
        .filter(r => r.type === 'expenses' && r.date >= dateLimitStr)
        .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

    const monthlyAccumulated = monthlyIncome - monthlyExpense;

    // Daily Activity Summary Cards Update
    if (document.getElementById('dashTodayAggregateIncome')) 
        document.getElementById('dashTodayAggregateIncome').textContent = `$${todayAggregateIncome}`;
    
    if (document.getElementById('dashTodayEquipmentExpense')) 
        document.getElementById('dashTodayEquipmentExpense').textContent = `$${todayEquipmentExpense}`;
    
    if (document.getElementById('dashTodayNetBalance')) 
        document.getElementById('dashTodayNetBalance').textContent = `$${todayNetBalance}`;
    
    if (document.getElementById('dashMonthlyAccumulatedBalance')) 
        document.getElementById('dashMonthlyAccumulatedBalance').textContent = `$${monthlyAccumulated}`;

    // Overall Totals
    const getSum = (type) => records.filter(r => r.type === type).reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
    const getCount = (type) => records.filter(r => r.type === type).length;

    if (document.getElementById('dashTotalSales')) document.getElementById('dashTotalSales').textContent = `$${getSum('sales')}`;
    if (document.getElementById('dashTotalExpenses')) document.getElementById('dashTotalExpenses').textContent = `$${getSum('expenses')}`;
    if (document.getElementById('dashTotalIncoming')) document.getElementById('dashTotalIncoming').textContent = `$${getSum('incoming')}`;
    if (document.getElementById('dashTotalFuel')) document.getElementById('dashTotalFuel').textContent = `${getSum('fuel')} L`;
    if (document.getElementById('dashTotalTrucks')) document.getElementById('dashTotalTrucks').textContent = `${getCount('trucks')}`;
    if (document.getElementById('dashTotalProduction')) document.getElementById('dashTotalProduction').textContent = `${getSum('production')} Loads`;
}

// 6. REPORTS FILTERING (CATEGORY, DATE RANGE) & RENDERING
function renderReports() {
    const tableBody = document.getElementById('reportTableBody');
    const filterSelect = document.getElementById('reportFilter');
    const startDateInput = document.getElementById('reportStartDate');
    const endDateInput = document.getElementById('reportEndDate');

    if (!tableBody) return;

    tableBody.innerHTML = '';
    const filterValue = filterSelect ? filterSelect.value.toLowerCase() : 'all';
    const startDate = startDateInput ? startDateInput.value : '';
    const endDate = endDateInput ? endDateInput.value : '';

    const filteredRecords = cachedRecords.filter(item => {
        // Category Filter
        if (filterValue !== 'all' && item.type !== filterValue) {
            return false;
        }
        // Date Range Filter
        if (startDate && item.date < startDate) {
            return false;
        }
        if (endDate && item.date > endDate) {
            return false;
        }
        return true;
    });

    if (filteredRecords.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Xog ma jirto.</td></tr>';
        return;
    }

    filteredRecords.forEach(record => {
        const row = document.createElement('tr');
        
        let unit = '';
        if (record.type === 'sales' || record.type === 'expenses' || record.type === 'incoming') {
            unit = '$';
        } else if (record.type === 'fuel') {
            unit = 'L ';
        }

        // Render Comments
        let commentsText = '';
        if (record.comments && Array.isArray(record.comments)) {
            commentsText = record.comments.map(c => `<div><small><b>${c.author}:</b> ${c.text}</small></div>`).join('');
        } else if (record.comments && typeof record.comments === 'object') {
            commentsText = Object.values(record.comments).map(c => `<div><small><b>${c.author}:</b> ${c.text}</small></div>`).join('');
        }

        // Actions: Delete (Admin Only) & Comment (Everyone)
        let actionsHtml = `<button style="background-color: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px;" onclick="addComment('${record.id}')">💬 Comment</button>`;

        if (currentUser && currentUser.role === 'admin') {
            actionsHtml += `<button style="background-color: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;" onclick="deleteRecord('${record.id}')">🗑️ Delete</button>`;
        }

        row.innerHTML = `
            <td>${record.date || 'N/A'}</td>
            <td style="text-transform: capitalize; font-weight: bold;">${record.type}</td>
            <td>${record.info || ''}</td>
            <td>${unit}${record.value}</td>
            <td><small><b>By:</b> ${record.createdBy || 'Unknown'}</small></td>
            <td>${commentsText || '<i>Diminish</i>'}</td>
            <td>${actionsHtml}</td>
        `;
        tableBody.appendChild(row);
    });
}

function filterReports() {
    renderReports();
}

// 7. COMMENTS & DELETE ACTIONS
function addComment(recordId) {
    if (!currentUser) {
        alert("Fadlan soo gal si aad comment u bixiso!");
        return;
    }

    const commentText = prompt("Qor comment-kaaga/faalladaada:");
    if (commentText) {
        const newComment = {
            author: currentUser.username,
            text: commentText,
            timestamp: new Date().toISOString()
        };

        db.ref(`records/${recordId}/comments`).push(newComment)
            .then(() => alert("Comment-ka si guul leh ayaa loo kaydiyay!"))
            .catch(err => alert("Cillad ayaa dhacday: " + err.message));
    }
}

function deleteRecord(id) {
    if (!currentUser || currentUser.role !== 'admin') {
        alert("Awood uma lihid inaad xogtan tirtirto! (Admin Only)");
        return;
    }

    if (confirm("Ma ziidtaa inaad tirtirto xogtan?")) {
        db.ref('records/' + id).remove()
            .then(() => alert("Xogta waa la tirtiray!"))
            .catch(error => alert("Cillad ayaa dhacday: " + error.message));
    }
}

// 8. USER MANAGEMENT LOGIC (ADMIN CONTROL)
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

                // Don't block primary admin
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
    if (!currentUser || currentUser.role !== 'admin') {
        alert("Admin kaliya ayaa xiri kara ama furi kara users-ka!");
        return;
    }

    db.ref(`users/${userKey}/isBlocked`).set(blockStatus)
        .then(() => {
            alert(blockStatus ? "User-ka waa la xiray!" : "User-ka waa la furay!");
            renderUserManagementTable();
        })
        .catch(err => alert("Cillad: " + err.message));
}