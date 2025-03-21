// User Authentication Class
class Auth {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    login(email, password) {
        // Simulate authentication
        if (email && password) {
            this.currentUser = {
                id: 1,
                name: 'John Doe',
                email: email,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('John Doe')}`
            };
            this.isAuthenticated = true;
            localStorage.setItem('user', JSON.stringify(this.currentUser));
            return true;
        }
        return false;
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('user');
    }

    checkAuth() {
        const user = localStorage.getItem('user');
        if (user) {
            this.currentUser = JSON.parse(user);
            this.isAuthenticated = true;
            return true;
        }
        return false;
    }
}

// Financial Management Class
class FinanceManager {
    constructor() {
        this.transactions = [];
        this.saccoGroups = [];
        this.settings = {
            currency: 'UGX',
            exchangeRates: {
                UGX: 1,
                USD: 3800,
                EUR: 4100,
                GBP: 4800
            }
        };
        
        // Initialize budgets
        this.budgets = {
            daily: {
                amount: 50000,
                alert: 80 // Alert when 80% of budget is used
            },
            weekly: {
                amount: 300000,
                alert: 80
            },
            monthly: {
                amount: 1200000,
                alert: 80
            },
            categories: {
                Food: { amount: 400000, alert: 80 },
                Transport: { amount: 200000, alert: 80 },
                Entertainment: { amount: 100000, alert: 80 },
                Utilities: { amount: 150000, alert: 80 },
                Shopping: { amount: 200000, alert: 80 },
                Healthcare: { amount: 100000, alert: 80 }
            }
        };
        
        this.loadData();
    }

    // Budget Management Methods
    setBudget(type, amount, category = null, alertThreshold = 80) {
        if (category) {
            if (!this.budgets.categories[category]) {
                this.budgets.categories[category] = {};
            }
            this.budgets.categories[category] = {
                amount: parseFloat(amount),
                alert: alertThreshold
            };
        } else {
            this.budgets[type] = {
                amount: parseFloat(amount),
                alert: alertThreshold
            };
        }
        this.saveData();
    }

    getBudget(type, category = null) {
        if (category) {
            return this.budgets.categories[category] || { amount: 0, alert: 80 };
        }
        return this.budgets[type] || { amount: 0, alert: 80 };
    }

    getBudgetStatus(type, category = null) {
        const budget = this.getBudget(type, category);
        const spent = this.getSpentAmount(type, category);
        const remaining = Math.max(0, budget.amount - spent);
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
        const isOverBudget = spent > budget.amount;
        const isNearLimit = percentage >= budget.alert;

        return {
            budget: budget.amount,
            spent,
            remaining,
            percentage,
            isOverBudget,
            isNearLimit
        };
    }

    getSpentAmount(type, category = null) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let transactions = this.transactions;
        
        if (category) {
            transactions = transactions.filter(t => t.category === category);
        }

        switch (type) {
            case 'daily':
                return transactions
                    .filter(t => new Date(t.date) >= today)
                    .reduce((sum, t) => sum + t.amount, 0);
            case 'weekly':
                return transactions
                    .filter(t => new Date(t.date) >= startOfWeek)
                    .reduce((sum, t) => sum + t.amount, 0);
            case 'monthly':
                return transactions
                    .filter(t => new Date(t.date) >= startOfMonth)
                    .reduce((sum, t) => sum + t.amount, 0);
            default:
                return 0;
        }
    }

    checkBudgetAlert(transaction) {
        const alerts = [];
        
        // Check daily budget
        const dailyStatus = this.getBudgetStatus('daily');
        if (dailyStatus.isNearLimit) {
            alerts.push({
                type: 'daily',
                message: `You've used ${dailyStatus.percentage.toFixed(1)}% of your daily budget`
            });
        }

        // Check category budget
        const categoryStatus = this.getBudgetStatus('category', transaction.category);
        if (categoryStatus.isNearLimit) {
            alerts.push({
                type: 'category',
                category: transaction.category,
                message: `You've used ${categoryStatus.percentage.toFixed(1)}% of your ${transaction.category} budget`
            });
        }

        return alerts;
    }

    loadData() {
        // Load transactions
        const savedTransactions = localStorage.getItem('transactions');
        if (savedTransactions) {
            this.transactions = JSON.parse(savedTransactions);
        }

        // Load SACCO groups
        const savedGroups = localStorage.getItem('saccoGroups');
        if (savedGroups) {
            this.saccoGroups = JSON.parse(savedGroups);
        }
    }

    saveData() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
        localStorage.setItem('saccoGroups', JSON.stringify(this.saccoGroups));
    }

    addTransaction(transaction) {
        transaction.id = Date.now();
        this.transactions.unshift(transaction);
        this.saveData();
        return transaction;
    }

    createSaccoGroup(group) {
        group.id = Date.now();
        group.createdAt = new Date().toISOString();
        group.members = [this.auth.currentUser];
        group.transactions = [];
        this.saccoGroups.push(group);
        this.saveData();
        return group;
    }

    getMonthlyTotal() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.transactions
            .filter(t => new Date(t.date) >= monthStart)
            .reduce((sum, t) => sum + t.amount, 0);
    }

    getCategoryTotals() {
        return this.transactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});
    }

    getMonthlyTrend() {
        const months = {};
        this.transactions.forEach(t => {
            const month = t.date.substring(0, 7);
            months[month] = (months[month] || 0) + t.amount;
        });
        return months;
    }
}

// UI Management Class
class UI {
    constructor(auth, finance) {
        this.auth = auth;
        this.finance = finance;
        this.initializeEventListeners();
        this.setupCharts();
    }

    initializeEventListeners() {
        // Login Form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = e.target.email.value;
                const password = e.target.password.value;
                if (this.auth.login(email, password)) {
                    this.showMainApp();
                    this.updateDashboard();
                }
            });
        }

        // Add Expense Form
        const addExpenseForm = document.getElementById('addExpenseForm');
        if (addExpenseForm) {
            addExpenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const transaction = {
                    date: e.target.date.value,
                    description: e.target.description.value,
                    category: e.target.category.value,
                    amount: parseFloat(e.target.amount.value),
                    paymentMethod: e.target.paymentMethod.value
                };
                this.finance.addTransaction(transaction);
                this.updateDashboard();
                this.hideModal('addExpenseModal');
                e.target.reset();
            });
        }

        // Create SACCO Group Form
        const createGroupForm = document.getElementById('createGroupForm');
        if (createGroupForm) {
            createGroupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const group = {
                    name: e.target.groupName.value,
                    purpose: e.target.groupPurpose.value,
                    savingsGoal: parseFloat(e.target.savingsGoal.value),
                    contributionFrequency: e.target.contributionFrequency.value,
                    minContribution: parseFloat(e.target.minContribution.value),
                    privacy: e.target.privacy.value
                };
                this.finance.createSaccoGroup(group);
                this.updateSaccoGroups();
                this.hideModal('createGroupModal');
                e.target.reset();
            });
        }

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.dataset.section;
                this.showSection(section);
            });
        });

        // Modal Triggers
        document.getElementById('addExpenseBtn')?.addEventListener('click', () => {
            this.showModal('addExpenseModal');
        });

        // Modal Close Buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    showMainApp() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
    }

    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(`${sectionId}-section`).classList.remove('hidden');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    setupCharts() {
        // Category Chart
        const categoryCtx = document.getElementById('categoryChart');
        if (categoryCtx) {
            const categoryTotals = this.finance.getCategoryTotals();
            new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categoryTotals),
                    datasets: [{
                        data: Object.values(categoryTotals),
                        backgroundColor: [
                            '#10B981', '#3B82F6', '#8B5CF6',
                            '#EC4899', '#F59E0B', '#EF4444'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Trend Chart
        const trendCtx = document.getElementById('trendChart');
        if (trendCtx) {
            const monthlyTrend = this.finance.getMonthlyTrend();
            new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: Object.keys(monthlyTrend),
                    datasets: [{
                        label: 'Monthly Spending',
                        data: Object.values(monthlyTrend),
                        borderColor: '#4F46E5',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(79, 70, 229, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    updateDashboard() {
        // Update recent transactions
        const tbody = document.getElementById('recentTransactions');
        if (tbody) {
            tbody.innerHTML = this.finance.transactions.slice(0, 5).map(t => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.date}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${t.description}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ${t.category}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        USh ${t.amount.toLocaleString()}
                    </td>
                </tr>
            `).join('');
        }

        // Update charts
        this.setupCharts();
    }

    updateSaccoGroups() {
        // Implementation for updating SACCO groups view
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    const auth = new Auth();
    const finance = new FinanceManager();
    const ui = new UI(auth, finance);

    // Check if user is already authenticated
    if (auth.checkAuth()) {
        ui.showMainApp();
        ui.updateDashboard();
    }
});
