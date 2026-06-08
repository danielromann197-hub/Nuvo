/**
 * NÜVO Admin Dashboard Application
 * Uses Supabase (PostgreSQL) for Database
 */

const supabaseUrl = 'https://pgsmwsuwapjajszhwaps.supabase.co';
const supabaseKey = 'sb_publishable_O6sgosXbiPAiCvmtsCdB0A_tHg-YgI8';

const adminApp = {
    db: {
        users: [],
        clients: [],
        accounts: [],
        tasks: []
    },
    currentUser: null,
    supabase: null,

    async init() {
        this.bindEvents();
        try {
            if (!window.supabase) {
                throw new Error("No se pudo cargar la librería de Supabase (Posible bloqueo por AdBlock o Firewall).");
            }
            this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            await this.checkAuth();
        } catch (err) {
            console.error("Error crítico de inicialización:", err);
            alert("Error crítico: " + err.message);
        }
    },

    async loadData() {
        try {
            const [usersRes, clientsRes, accountsRes, tasksRes] = await Promise.all([
                this.supabase.from('users').select('*').order('id', { ascending: false }),
                this.supabase.from('clients').select('*').order('id', { ascending: false }),
                this.supabase.from('accounts').select('*').order('id', { ascending: false }),
                this.supabase.from('tasks').select('*').order('client_name', { ascending: true })
            ]);

            if (usersRes.data) this.db.users = usersRes.data;
            if (clientsRes.data) this.db.clients = clientsRes.data;
            if (accountsRes.data) this.db.accounts = accountsRes.data;
            if (tasksRes.data) this.db.tasks = tasksRes.data;
        } catch (error) {
            console.error("Error loading data:", error);
            alert("Error al cargar los datos. Verifica tu conexión.");
        }
    },

    async checkAuth() {
        const sessionUser = sessionStorage.getItem('nuvo_auth');
        if (sessionUser) {
            this.currentUser = JSON.parse(sessionUser);
            this.showDashboard();
            
            document.getElementById('current-username').innerText = "Cargando...";
            await this.loadData();
            this.updateDashboardUser();
            this.renderAll();
        } else {
            this.showLogin();
        }
    },

    updateDashboardUser() {
        document.getElementById('current-username').innerText = this.currentUser.username;
        document.getElementById('current-user-avatar').innerText = this.currentUser.username.charAt(0).toUpperCase();
    },

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (!this.supabase) {
                    alert("Error: Supabase no está conectado.");
                    return;
                }

                const btn = e.target.querySelector('button[type="submit"]');
                const originalText = btn.innerText;
                btn.innerText = 'Validando...';
                btn.disabled = true;

                const uElement = document.getElementById('username');
                const pElement = document.getElementById('password');
                
                const u = uElement ? uElement.value.trim() : '';
                const p = pElement ? pElement.value.trim() : '';
                
                try {
                    const { data, error } = await this.supabase
                        .from('users')
                        .select('*')
                        .eq('username', u)
                        .eq('password', p)
                        .single();

                    if (error) {
                        console.error("Supabase Error:", error);
                        document.getElementById('login-error').innerText = "Credenciales incorrectas o error de conexión.";
                        return;
                    }

                    if (data) {
                        sessionStorage.setItem('nuvo_auth', JSON.stringify(data));
                        this.currentUser = data;
                        document.getElementById('login-form').reset();
                        document.getElementById('login-error').innerText = "";
                        this.showDashboard();
                        
                        document.getElementById('current-username').innerText = "Cargando...";
                        await this.loadData();
                        this.updateDashboardUser();
                        this.renderAll();
                    } else {
                        document.getElementById('login-error').innerText = "Usuario o contraseña incorrectos.";
                    }
                } catch (err) {
                    console.error(err);
                    document.getElementById('login-error').innerText = "Error inesperado al intentar iniciar sesión.";
                } finally {
                    if (btn) {
                        btn.innerText = originalText;
                        btn.disabled = false;
                    }
                }
            });
        }

        document.getElementById('logout-link')?.addEventListener('click', () => {
            sessionStorage.removeItem('nuvo_auth');
            this.currentUser = null;
            this.showLogin();
        });

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
    },

    switchView(viewId) {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            if(btn.getAttribute('data-target') === viewId) btn.classList.add('active');
        });

        document.querySelectorAll('.content-view').forEach(view => {
            view.classList.remove('active');
        });
        const viewEl = document.getElementById(viewId);
        if(viewEl) viewEl.classList.add('active');
    },

    renderAll() {
        this.renderDashboardMetrics();
        this.renderClients();
        this.renderAccounts();
        this.renderUsers();
        this.renderTasks();
    },

    renderDashboardMetrics() {
        document.getElementById('metric-clients').innerText = this.db.clients.length;
        document.getElementById('metric-accounts').innerText = this.db.accounts.length;
        
        const ingresos = this.db.accounts.filter(a => a.type !== 'Egreso').reduce((sum, acc) => sum + parseFloat(acc.amount), 0);
        const egresos = this.db.accounts.filter(a => a.type === 'Egreso').reduce((sum, acc) => sum + parseFloat(acc.amount), 0);
        const balance = ingresos - egresos;
        
        document.getElementById('metric-revenue').innerText = `$${balance.toLocaleString()}`;
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
        
        const select = document.getElementById('account-client');
        if(select) {
            select.innerHTML = '<option value="">Ninguno</option>';
            this.db.clients.forEach(c => {
                select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
            });
        }
        const taskSelect = document.getElementById('task-client');
        if(taskSelect) {
            taskSelect.innerHTML = '<option value="">Seleccione un cliente</option>';
            this.db.clients.forEach(c => {
                taskSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
            });
        }
    },

    renderAccounts() {
        const tbody = document.getElementById('accounts-table-body');
        if(!tbody) return;

        let ingresos = 0;
        let egresos = 0;

        tbody.innerHTML = '';
        this.db.accounts.forEach(a => {
            const isEgreso = a.type === 'Egreso';
            if (isEgreso) {
                egresos += parseFloat(a.amount);
            } else {
                ingresos += parseFloat(a.amount);
            }
            
            const tipoBadge = isEgreso 
                ? '<span style="color: #ef4444; font-weight: 600;">Egreso</span>' 
                : '<span style="color: #10b981; font-weight: 600;">Ingreso</span>';
            const montoColor = isEgreso ? '#ef4444' : '#10b981';
            const signo = isEgreso ? '-' : '+';

            tbody.innerHTML += `
                <tr>
                    <td><strong>${a.concept}</strong></td>
                    <td>${a.client_name || '-'}</td>
                    <td>${tipoBadge}</td>
                    <td style="color: ${montoColor}; font-weight: 600;">${signo}$${parseFloat(a.amount).toLocaleString()}</td>
                    <td>${a.date}</td>
                    <td>
                        <button class="action-btn delete" onclick="adminApp.deleteAccount(${a.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        const fIncome = document.getElementById('finance-income');
        const fExpense = document.getElementById('finance-expense');
        const fBalance = document.getElementById('finance-balance');

        if (fIncome) fIncome.innerText = `$${ingresos.toLocaleString()}`;
        if (fExpense) fExpense.innerText = `$${egresos.toLocaleString()}`;
        if (fBalance) {
            const balance = ingresos - egresos;
            fBalance.innerText = `$${balance.toLocaleString()}`;
            fBalance.style.color = balance >= 0 ? '#10b981' : '#ef4444';
        }
    },

    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        if(!tbody) return;

        const term = document.getElementById('filter-user-search')?.value.toLowerCase() || '';
        const filteredUsers = term ? this.db.users.filter(u => 
            u.username.toLowerCase().includes(term) || 
            (u.email && u.email.toLowerCase().includes(term)) ||
            u.role.toLowerCase().includes(term)
        ) : this.db.users;

        tbody.innerHTML = '';
        filteredUsers.forEach(u => {
            const email = u.email || 'correo@agencia.com';
            tbody.innerHTML += `
                <tr>
                    <td><strong>${u.username}</strong></td>
                    <td>${u.role}</td>
                    <td style="color: var(--text-secondary);">${email}</td>
                    <td>
                        <button class="action-btn delete" onclick="adminApp.deleteUser(${u.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        // Update Executors in Tasks
        const taskExecutorSelect = document.getElementById('task-executor');
        if (taskExecutorSelect) {
            taskExecutorSelect.innerHTML = '<option value="">Seleccione ejecutor</option>';
            this.db.users.forEach(u => {
                taskExecutorSelect.innerHTML += `<option value="${u.username}">${u.username}</option>`;
            });
        }

        const filterExecutorSelect = document.getElementById('filter-executor');
        if (filterExecutorSelect) {
            filterExecutorSelect.innerHTML = '<option value="">🔍 Todos los Ejecutores</option>';
            this.db.users.forEach(u => {
                filterExecutorSelect.innerHTML += `<option value="${u.username}">${u.username}</option>`;
            });
        }
    },

    openModal(id) {
        document.getElementById(id)?.classList.add('active');
    },

    closeModal(id) {
        document.getElementById(id)?.classList.remove('active');
    },

    async saveClient(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Guardando...';
        btn.disabled = true;

        const name = document.getElementById('client-name').value;
        const service = document.getElementById('client-service').value;
        const status = document.getElementById('client-status').value;

        try {
            const { data, error } = await this.supabase
                .from('clients')
                .insert([{ name, service, status }])
                .select();
                
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.db.clients.unshift(data[0]);
                this.renderAll();
            }
            
            document.getElementById('form-client').reset();
            this.closeModal('modal-client');
        } catch (err) {
            console.error(err);
            alert("Error al guardar cliente");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },
    
    async deleteClient(id) {
        if(confirm("¿Eliminar cliente permanentemente?")) {
            try {
                const { error } = await this.supabase.from('clients').delete().eq('id', id);
                if (error) throw error;
                
                this.db.clients = this.db.clients.filter(c => c.id !== id);
                this.renderAll();
            } catch (err) {
                console.error(err);
                alert("Error al eliminar cliente");
            }
        }
    },

    async saveAccount(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Guardando...';
        btn.disabled = true;

        const concept = document.getElementById('account-concept').value;
        const amount = parseFloat(document.getElementById('account-amount').value);
        const client_name = document.getElementById('account-client').value || null;
        const type = document.getElementById('account-type').value;
        
        const d = new Date();
        const date = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

        try {
            const { data, error } = await this.supabase
                .from('accounts')
                .insert([{ concept, amount, client_name, date, type }])
                .select();
                
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.db.accounts.unshift(data[0]);
                this.renderAll();
            }
            
            document.getElementById('form-account').reset();
            this.closeModal('modal-account');
        } catch (err) {
            console.error(err);
            alert("Error al guardar cuenta");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    async deleteAccount(id) {
        if(confirm("¿Eliminar registro permanentemente?")) {
            try {
                const { error } = await this.supabase.from('accounts').delete().eq('id', id);
                if (error) throw error;
                
                this.db.accounts = this.db.accounts.filter(a => a.id !== id);
                this.renderAll();
            } catch (err) {
                console.error(err);
                alert("Error al eliminar registro");
            }
        }
    },

    async saveUser(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Guardando...';
        btn.disabled = true;

        const username = document.getElementById('user-username').value;
        const email = document.getElementById('user-email').value;
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;

        if(this.db.users.find(u => u.username === username)) {
            alert("El usuario ya existe");
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('users')
                .insert([{ username, email, password, role }])
                .select();
                
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.db.users.unshift(data[0]);
                this.renderAll();
            }
            
            document.getElementById('form-user').reset();
            this.closeModal('modal-user');
        } catch (err) {
            console.error(err);
            alert("Error al crear usuario. Revisa que el nombre de usuario sea único.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    async deleteUser(id) {
        if(confirm("¿Eliminar usuario permanentemente?")) {
            try {
                const { error } = await this.supabase.from('users').delete().eq('id', id);
                if (error) throw error;
                
                this.db.users = this.db.users.filter(u => u.id !== id);
                this.renderAll();
            } catch (err) {
                console.error(err);
                alert("Error al eliminar usuario");
            }
        }
    },

    renderTasks() {
        const tbody = document.getElementById('tasks-table-body');
        if(!tbody) return;

        tbody.innerHTML = '';
        
        let lastClient = null;

        this.db.tasks.forEach(t => {
            const isCompleted = t.completed ? 'checked' : '';
            const rowClass = t.completed ? 'task-completed' : '';
            
            if (t.client_name !== lastClient) {
                tbody.innerHTML += `
                    <tr style="background: var(--bg-secondary);">
                        <td colspan="7" style="color: #6C63FF; padding-top: 1.5rem; font-weight: bold; border-bottom: 2px solid #6C63FF; font-size: 0.9rem; text-transform: uppercase;">
                            ${t.client_name}
                        </td>
                    </tr>
                `;
                lastClient = t.client_name;
            }

            tbody.innerHTML += `
                <tr class="${rowClass}">
                    <td style="color: transparent; user-select: none;">-</td>
                    <td style="color: var(--text-secondary);">${t.executor}</td>
                    <td><span class="badge-priority priority-${t.priority}">${t.priority}</span></td>
                    <td class="task-desc">
                        <input type="checkbox" class="task-checkbox" ${isCompleted} onchange="adminApp.toggleTaskStatus(${t.id}, this.checked)">
                        <span class="task-desc-text">${t.description}</span>
                    </td>
                    <td><span class="badge-status status-${t.status}">${t.status}</span></td>
                    <td style="color: var(--text-secondary);">${t.deadline || 'Sin fecha'}</td>
                    <td>
                        <button class="action-btn delete" onclick="adminApp.deleteTask(${t.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });
    },

    async saveTask(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Guardando...';
        btn.disabled = true;

        const client_name = document.getElementById('task-client').value;
        const executor = document.getElementById('task-executor').value;
        const priority = document.getElementById('task-priority').value;
        const description = document.getElementById('task-desc').value;
        const status = document.getElementById('task-status').value;
        const deadline = document.getElementById('task-deadline').value;

        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .insert([{ client_name, executor, priority, description, status, deadline }])
                .select();
                
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.db.tasks.push(data[0]);
                this.db.tasks.sort((a, b) => a.client_name.localeCompare(b.client_name));
                this.renderAll();
            }
            
            document.getElementById('form-task').reset();
            this.closeModal('modal-task');
        } catch (err) {
            console.error(err);
            alert("Error al guardar pendiente");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    async toggleTaskStatus(id, isCompleted) {
        try {
            const { error } = await this.supabase
                .from('tasks')
                .update({ completed: isCompleted })
                .eq('id', id);
                
            if (error) throw error;
            
            const task = this.db.tasks.find(t => t.id === id);
            if(task) task.completed = isCompleted;
            this.renderTasks();
        } catch (err) {
            console.error(err);
            alert("Error al actualizar pendiente");
            this.renderTasks();
        }
    },

    async deleteTask(id) {
        if(confirm("¿Eliminar pendiente permanentemente?")) {
            try {
                const { error } = await this.supabase.from('tasks').delete().eq('id', id);
                if (error) throw error;
                
                this.db.tasks = this.db.tasks.filter(t => t.id !== id);
                this.renderAll();
            } catch (err) {
                console.error(err);
                alert("Error al eliminar pendiente");
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});
