// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        dashboardContent.addEventListener('sectionActivated', fetchDashboardData);
        // If dashboard is the initial active section, trigger immediately
        if (dashboardContent.classList.contains('active')) {
            fetchDashboardData();
        }
    }
});

function getStatusText(status) {
    switch (status) {
        case 'confirmado': return 'Confirmado';
        case 'em-andamento': return 'Em Andamento';
        case 'pendente': return 'Pendente';
        case 'concluido': return 'Concluído';
        default: return status;
    }
}

async function fetchDashboardData() {
    const statsContainer = document.getElementById('dashboard-stats');
    const recentAppointmentsList = document.getElementById('recent-appointments-list');

    try {
        // Fetching main stats from backend
        const statsResponse = await fetch('http://localhost:3001/api/dashboard');
        const mainStats = await statsResponse.json();

        // Data for rendering stats cards (some data from backend, some simulated)
        const stats = [
            {
                title: "Faturamento Mensal",
                value: `R$ ${parseFloat(mainStats.faturamentoMensal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                change: "+12%", // Simulated change
                colorClass: "text-green-600",
                bgColorClass: "bg-green-100",
                icon: "💵"
            },
            {
                title: "Agendamentos Hoje",
                value: mainStats.agendamentosHoje.toString(),
                change: "+3", // Simulated change
                colorClass: "text-blue-600",
                bgColorClass: "bg-blue-100",
                icon: "📅"
            },
            {
                title: "Clientes Ativos",
                value: mainStats.totalClientes.toLocaleString('pt-BR'),
                change: "+8%", // Simulated change
                colorClass: "text-purple-600",
                bgColorClass: "bg-purple-100",
                icon: "👥"
            },
            {
                title: "Serviços Concluídos",
                value: mainStats.servicosConcluidosMes.toString(),
                change: "+15%", // Simulated change
                colorClass: "text-green-600",
                bgColorClass: "bg-green-100",
                icon: "✅"
            }
        ];

        statsContainer.innerHTML = stats.map(stat => `
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">${stat.title}</p>
                        <p class="info-card-value">${stat.value}</p>
                        <p class="info-card-change ${stat.colorClass}">
                            ${stat.icon} ${stat.change}
                        </p>
                    </div>
                    <div class="info-card-icon ${stat.bgColorClass}">
                        ${stat.icon}
                    </div>
                </div>
            </div>
        `).join('');

        // Fetching recent appointments (for today)
        const today = new Date().toISOString().split('T')[0];
        const appointmentsResponse = await fetch(`http://localhost:3001/api/agendamentos/date/${today}`);
        const recentAppointments = await appointmentsResponse.json();

        if (recentAppointments.length === 0) {
            recentAppointmentsList.innerHTML = '<p class="empty-state" style="padding: 20px; margin-bottom: 0;">Nenhum agendamento para hoje.</p>';
        } else {
            recentAppointmentsList.innerHTML = recentAppointments.map(app => `
                <div class="list-item">
                    <div class="list-item-main-info">
                        <p class="list-item-title">${app.cliente_nome}</p>
                        <p class="list-item-subtitle">${app.servico_nome}</p>
                    </div>
                    <div class="text-right">
                        <p class="list-item-title">${app.hora.substring(0, 5)}</p>
                        <span class="status-badge status-${app.status.replace(/\s/g, '-')}}">
                            ${getStatusText(app.status)}
                        </span>
                    </div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        statsContainer.innerHTML = '<p class="empty-state">Erro ao carregar dados do dashboard.</p>';
        recentAppointmentsList.innerHTML = '<p class="empty-state" style="padding: 20px; margin-bottom: 0;">Erro ao carregar agendamentos.</p>';
    }
}