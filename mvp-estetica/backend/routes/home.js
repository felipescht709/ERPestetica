// backend/routes/home.js
const express = require('express');
const router = express.Router();
const pool = require('../banco'); // Seu pool de conexão com o banco de dados
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa os middlewares

// @route    GET /api/home
// @desc     Obter dados do dashboard/home
// @access   Private (Admin, Gerente, Gestor, Atendente, Técnico)
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'gestor', 'atendente', 'tecnico']), async (req, res) => { // AGORA COM 'gestor', 'atendente', 'tecnico' INCLUÍDOS
    try {
        // Exemplo de como buscar dados para o dashboard
        const totalClientesResult = await pool.query('SELECT COUNT(*) FROM clientes WHERE ativo = TRUE');
        const agendamentosHojeResult = await pool.query(`
            SELECT COUNT(*) FROM agendamentos WHERE data_hora_inicio::date = CURRENT_DATE
        `);
        const servicosConcluidosMesResult = await pool.query(`
            SELECT COUNT(*) FROM agendamentos
            WHERE status = 'Concluído' AND EXTRACT(MONTH FROM data_hora_inicio) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM data_hora_inicio) = EXTRACT(YEAR FROM CURRENT_DATE)
        `);
        const faturamentoMensalResult = await pool.query(`
            SELECT SUM(preco_total) FROM agendamentos
            WHERE status = 'Concluido' AND EXTRACT(MONTH FROM data_hora_inicio) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM data_hora_inicio) = EXTRACT(YEAR FROM CURRENT_DATE)
        `);

        // Métricas de Avaliações (assumindo que a tabela 'avaliacoes' já existe e tem dados)
        const mediaAvaliacoesResult = await pool.query(`
            SELECT AVG(nota) FROM avaliacoes
        `);
        const totalAvaliacoesResult = await pool.query(`
            SELECT COUNT(*) FROM avaliacoes
        `);

        res.json({
            totalClientes: parseInt(totalClientesResult.rows[0].count),
            agendamentosHoje: parseInt(agendamentosHojeResult.rows[0].count),
            servicosConcluidosMes: parseInt(servicosConcluidosMesResult.rows[0].count),
            faturamentoMensal: parseFloat(faturamentoMensalResult.rows[0].sum || 0).toFixed(2),
            mediaAvaliacoes: parseFloat(mediaAvaliacoesResult.rows[0].avg || 0).toFixed(1),
            totalAvaliacoes: parseInt(totalAvaliacoesResult.rows[0].count)
        });

    } catch (err) {
        console.error('Erro ao buscar dados da Home no backend:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao carregar dados da Home.' });
    }
});

module.exports = router;