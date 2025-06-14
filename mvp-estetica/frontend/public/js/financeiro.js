// public/js/financeiro.js

document.addEventListener('DOMContentLoaded', () => {
    const financeiroContent = document.getElementById('financeiro-content');
    if (financeiroContent) {
        financeiroContent.addEventListener('sectionActivated', fetchFinancialData);
        if (financeiroContent.classList.contains('active')) {
            fetchFinancialData();
        }
    }
});

function getTransactionIcon(type) {
    return type === 'receita' ? '⬆️' : '⬇️';
}

function getTransactionColorClass(type) {
    return type === 'receita' ? 'income' : 'expense';
}

async function fetchFinancialData() {
    const financialOverviewContainer = document.getElementById('financial-overview');
    const recentTransactionsList = document.getElementById('recent-transactions-list');
    const paymentMethodsList = document.getElementById('payment-methods-list');
    const cashFlowChart = document.getElementById('cash-flow-chart');

    try {
        // Fetch financial overview from backend (reusing dashboard data for simplicity)
        const dashboardResponse = await fetch('http://localhost:3001/api/dashboard');
        const dashboardData = await dashboardResponse.json();

        // Simulate more detailed financial data or fetch from dedicated financial endpoints if available
        const financialData = {
            monthlyRevenue: parseFloat(dashboardData.faturamentoMensal || 0),
            monthlyExpenses: 12340, // Simulated for now
            netProfit: parseFloat(dashboardData.faturamentoMensal || 0) - 12340, // Simulated for now
            pendingPayments: 8750, // Simulated for now
            cashFlow: [ // Simulated. In a real app, this would be a dedicated API endpoint
                { month: 'Jan', revenue: 38500, expenses: 11200 },
                { month: 'Fev', revenue: 42300, expenses: 12800 },
                { month: 'Mar', revenue: 39800, expenses: 10950 },
                { month: 'Abr', revenue: parseFloat(dashboardData.faturamentoMensal || 0), expenses: 12340 },
            ]
        };

        const recentTransactions = [ // Simulated. Fetch from a /api/transactions endpoint in real app.
            { id: 1, type: 'receita', description: 'Detalhamento - João Silva', amount: 250, date: '2025-06-14', method: 'Cartão' },
            { id: 2, type: 'receita', description: 'Lavagem Completa - Maria Santos', amount: 80, date: '2025-06-14', method: 'PIX' },
            { id: 3, type: 'despesa', description: 'Produtos de Limpeza', amount: -150, date: '2025-06-13', method: 'Débito' },
            { id: 4, type: 'receita', description: 'Enceramento - Pedro Costa', amount: 120, date: '2025-06-13', method: 'Dinheiro' },
            { id: 5, type: 'despesa', description: 'Energia Elétrica', amount: -280, date: '2025-06-12', method: 'Débito' },
        ];

        const paymentMethods = [ // Simulated. Fetch from backend.
            { method: 'PIX', amount: 18450, percentage: 40.2, icon: '💰' },
            { method: 'Cartão', amount: 15230, percentage: 33.2, icon: '💳' },
            { method: 'Dinheiro', amount: 8910, percentage: 19.4, icon: '💵' },
            { method: 'Débito', amount: 3300, percentage: 7.2, icon: '💳' },
        ];


        // Renderizar visão geral financeira
        financialOverviewContainer.innerHTML = `
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Receita Mensal</p>
                        <p class="info-card-value text-green-600">R$ ${financialData.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p class="info-card-change text-green-600">⬆️ +12%</p>
                    </div>
                    <div class="info-card-icon bg-green-100">💵</div>
                </div>
            </div>
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Despesas Mensais</p>
                        <p class="info-card-value text-red-600">R$ ${financialData.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p class="info-card-change text-red-600">⬇️ +3%</p>
                    </div>
                    <div class="info-card-icon bg-red-100">📉</div>
                </div>
            </div>
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Lucro Líquido</p>
                        <p class="info-card-value text-blue-600">R$ ${financialData.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p class="info-card-change text-blue-600">📈 +15%</p>
                    </div>
                    <div class="info-card-icon bg-blue-100">📊</div>
                </div>
            </div>
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Pendente Recebimento</p>
                        <p class="info-card-value text-orange-600">R$ ${financialData.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p class="info-card-change text-orange-600">📅 5 clientes</p>
                    </div>
                    <div class="info-card-icon bg-orange-100">🗓️</div>
                </div>
            </div>
        `;

        // Renderizar transações recentes
        recentTransactionsList.innerHTML = recentTransactions.map(transaction => `
            <div class="list-item">
                <div class="flex items-center space-x-3">
                    <div class="financial-transaction-icon ${getTransactionColorClass(transaction.type)}">
                        ${getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${transaction.description}</p>
                        <p class="text-sm text-gray-600">
                            ${new Date(transaction.date).toLocaleDateString('pt-BR')} • ${transaction.method}
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-semibold financial-amount ${getTransactionColorClass(transaction.type)}">
                        ${transaction.amount > 0 ? '+' : ''}R$ ${Math.abs(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
        `).join('');

        // Renderizar formas de pagamento
        paymentMethodsList.innerHTML = paymentMethods.map(payment => `
            <div class="flex-between-center">
                <div class="flex items-center space-x-3">
                    <div class="financial-transaction-icon bg-blue-100">
                        ${payment.icon}
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${payment.method}</p>
                        <p class="text-sm text-gray-600">${payment.percentage}% do total</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-gray-900">R$ ${payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <div class="payment-method-progress-bar">
                        <div
                            class="payment-method-progress-fill"
                            style="width: ${payment.percentage}%;"
                        ></div>
                    </div>
                </div>
            </div>
        `).join('');

        // Renderizar fluxo de caixa
        cashFlowChart.innerHTML = `
            <div class="info-card-grid">
                ${financialData.cashFlow.map(data => `
                    <div class="cash-flow-item">
                        <p class="cash-flow-month">${data.month}</p>
                        <p class="cash-flow-revenue">R$ ${data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p class="cash-flow-expense">-R$ ${data.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p class="cash-flow-net">Líquido: R$ ${(data.revenue - data.expenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error fetching financial data:', error);
        financialOverviewContainer.innerHTML = '<p class="empty-state">Erro ao carregar dados financeiros.</p>';
        recentTransactionsList.innerHTML = '';
        paymentMethodsList.innerHTML = '';
        cashFlowChart.innerHTML = '';
    }
}