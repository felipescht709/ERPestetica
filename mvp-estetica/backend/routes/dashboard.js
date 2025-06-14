// routes/dashboard.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');

router.get('/', async (req, res) => {
    try {
        // Exemplo de como buscar dados para o dashboard
        const totalClientesResult = await pool.query('SELECT COUNT(*) FROM clientes');
        const agendamentosHojeResult = await pool.query(`
            SELECT COUNT(*) FROM agendamentos WHERE data = CURRENT_DATE
        `);
        const servicosConcluidosMesResult = await pool.query(`
            SELECT COUNT(*) FROM agendamentos
            WHERE status = 'concluido' AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)
        `);
        const faturamentoMensalResult = await pool.query(`
            SELECT SUM(preco_total) FROM agendamentos
            WHERE status = 'concluido' AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)
        `);

        // Mais dados poderiam ser buscados aqui, como transações recentes, etc.

        res.json({
            totalClientes: parseInt(totalClientesResult.rows[0].count),
            agendamentosHoje: parseInt(agendamentosHojeResult.rows[0].count),
            servicosConcluidosMes: parseInt(servicosConcluidosMesResult.rows[0].count),
            faturamentoMensal: parseFloat(faturamentoMensalResult.rows[0].sum || 0).toFixed(2)
            // Você pode adicionar mais dados conforme a necessidade do dashboard
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;