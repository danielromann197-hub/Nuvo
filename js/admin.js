/**
 * NÜVO Admin Dashboard Application
 * Uses LocalStorage for MVP Database
 */

const adminApp = {
    db: {
        users: [{ id: 1, username: 'admin', password: '123', role: 'Administrador' }],
        clients: [],
        accounts: []
    },
    currentUser: null,

    init() {
        this.loadData();
        this.checkAuth();
        this.bindEvents();
    },

    loadData() {
        const storedUsers = localStorage.getItem('nuvo_users');
        const storedClients = localStorage.getItem('nuvo_clients');
        const storedAccounts = localStorage.getItem('nuvo_accounts');

        if (storedUsers) this.db.users = JSON.parse(storedUsers);
        if (storedClients) this.db.clients = JSON.parse(storedClients);
        if (storedAccounts) this.db.accounts = JSON.parse(storedAccounts);
    },

    saveData() {
        localStorage.setItem('nuvo_users', JSON.stringify(this.db.users));
        localStorage.setItem('nuvo_clients', JSON.stringify(this.db.clients));
        localStorage.setItem('nuvo_accounts', JSON.stringify(this.db.accounts));
    },

    checkAuth() {
        const sessionUser = sessionStorage.getItem('nuvo_auth');
        if (sessionUser) {
            this.currentUser = JSON.parse(sessionUser);
            this.showDashboard();
        } else {
            this.showLogin();
        }
    },

    bindEvents() {
        // Login Form
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            
            const user = this.db.users.find(x => x.username === u && x.password === p);
            if (user) {
                sessionStorage.setItem('nuvo_auth', JSON.stringify(user));
                this.currentUser = user;
                document.getElementById('login-form').reset();
                this.showDashboard();
            } else {
                document.getElementById('login-error').innerText = "Usuario o contraseña incorrectos.";
            }
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            sessionStorage.removeItem('nuvo_auth');
            this.currentUser = null;
            this.showLogin();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.switchView(target);
            });
        });
    },

    showLogin() {
        document.getElementById('dashboard-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
    },

    showDashboard() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');
        
        // Update user info
        document.getElementById('current-username').innerText = this.currentUser.username;
        document.getElementById('current-user-avatar').innerText = this.currentUser.username.charAt(0).toUpperCase();

        this.renderAll();
    },

    switchView(viewId) {
        // Update nav buttons
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            if(btn.getAttribute('data-target') === viewId) btn.classList.add('active');
        });

        // Update views
        document.querySelectorAll('.content-view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(viewId).classList.add('active');
    },

    renderAll() {
        this.renderDashboardMetrics();
        this.renderClients();
        this.renderAccounts();
        this.renderUsers();
    },

    renderDashboardMetrics() {
        document.getElementById('metric-clients').innerText = this.db.clients.length;
        document.getElementById('metric-accounts').innerText = this.db.accounts.length;
        
        const revenue = this.db.accounts.reduce((sum, acc) => sum + parseFloat(acc.amount), 0);
        document.getElementById('metric-revenue').innerText = `$${revenue.toLocaleString()}`;
    },

    renderClients() {
        const tbody = document.getElementById('clients-table-body');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        this.db.clients.forEach(c => {
            let statusClass = c.status === 'Activo' ? 'status-active' : (c.status === 'En Progreso' ? 'status-progress' : 'status-inactive');
            tbody.innerHTML += `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.service}</td>
                    <td><span class="status-badge ${statusClass}">${c.status}</span></td>
                    <td>
                        <button class="action-btn delete" onclick="adminApp.deleteClient(${c.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        // Update select options in accounts
        const select = document.getElementById('account-client');
        if(select) {
            select.innerHTML = '<option value="">Ninguno</option>';
            this.db.clients.forEach(c => {
                select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
            });
        }
    },

    renderAccounts() {
        const tbody = document.getElementById('accounts-table-body');
        if(!tbody) return;

        tbody.innerHTML = '';
        this.db.accounts.forEach(a => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${a.concept}</strong></td>
                    <td>${a.client || '-'}</td>
                    <td>$${parseFloat(a.amount).toLocaleString()}</td>
                    <td>${a.date}</td>
                    <td>
                        <button class="action-btn delete" onclick="adminApp.deleteAccount(${a.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });
    },

    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        if(!tbody) return;

        tbody.innerHTML = '';
        this.db.users.forEach(u => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${u.username}</strong></td>
                    <td>${u.role}</td>
                    <td>
                        ${u.username !== 'admin' ? `
                        <button class="action-btn delete" onclick="adminApp.deleteUser(${u.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                        ` : '<small>Protegido</small>'}
                    </td>
                </tr>
            `;
        });
    },

    // Modals
    openModal(id) {
        document.getElementById(id).classList.add('active');
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    },

    // CRUD Clients
    saveClient(e) {
        e.preventDefault();
        const name = document.getElementById('client-name').value;
        const service = document.getElementById('client-service').value;
        const status = document.getElementById('client-status').value;

        this.db.clients.push({ id: Date.now(), name, service, status });
        this.saveData();
        this.renderAll();
        
        document.getElementById('form-client').reset();
        this.closeModal('modal-client');
    },
    
    deleteClient(id) {
        if(confirm("¿Eliminar cliente?")) {
            this.db.clients = this.db.clients.filter(c => c.id !== id);
            this.saveData();
            this.renderAll();
        }
    },

    // CRUD Accounts
    saveAccount(e) {
        e.preventDefault();
        const concept = document.getElementById('account-concept').value;
        const amount = document.getElementById('account-amount').value;
        const client = document.getElementById('account-client').value;
        
        const d = new Date();
        const date = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

        this.db.accounts.push({ id: Date.now(), concept, amount, client, date });
        this.saveData();
        this.renderAll();
        
        document.getElementById('form-account').reset();
        this.closeModal('modal-account');
    },

    deleteAccount(id) {
        if(confirm("¿Eliminar registro?")) {
            this.db.accounts = this.db.accounts.filter(a => a.id !== id);
            this.saveData();
            this.renderAll();
        }
    },

    // CRUD Users
    saveUser(e) {
        e.preventDefault();
        const username = document.getElementById('user-username').value;
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;

        if(this.db.users.find(u => u.username === username)) {
            alert("El usuario ya existe");
            return;
        }

        this.db.users.push({ id: Date.now(), username, password, role });
        this.saveData();
        this.renderAll();
        
        document.getElementById('form-user').reset();
        this.closeModal('modal-user');
    },

    deleteUser(id) {
        if(confirm("¿Eliminar usuario?")) {
            this.db.users = this.db.users.filter(u => u.id !== id);
            this.saveData();
            this.renderAll();
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});
