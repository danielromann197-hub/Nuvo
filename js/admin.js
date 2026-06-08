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
        accounts: []
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
            const [usersRes, clientsRes, accountsRes] = await Promise.all([
                this.supabase.from('users').select('*').order('id', { ascending: false }),
                this.supabase.from('clients').select('*').order('id', { ascending: false }),
                this.supabase.from('accounts').select('*').order('id', { ascending: false })
            ]);

            if (usersRes.data) this.db.users = usersRes.data;
            if (clientsRes.data) this.db.clients = clientsRes.data;
            if (accountsRes.data) this.db.accounts = accountsRes.data;
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

        document.getElementById('logout-btn')?.addEventListener('click', () => {
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
                    <td>${a.client_name || '-'}</td>
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
        
        const d = new Date();
        const date = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

        try {
            const { data, error } = await this.supabase
                .from('accounts')
                .insert([{ concept, amount, client_name, date }])
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
                .insert([{ username, password, role }])
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
    }
};

document.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});
