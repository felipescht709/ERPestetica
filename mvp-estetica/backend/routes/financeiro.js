const express = require('express');
const router = express.Router();
const pool = require('../banco'); 
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Middleware para verificar se o usuário é 'admin' ou 'gerente'
const authorizeFinanceView = (req, res, next) => {
    if (req.user && ['admin', 'gerente'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Apenas administradores e gerentes podem visualizar o financeiro.' });
    }
};

// GET Resumo Financeiro (Receita, Custo, Lucro) por período
// Exemplo de uso: /api/financeiro/resumo?startDate=2024-01-01&endDate=2024-01-31
router.get(
  '/resumo',
  authenticateToken,
  authorizeRole(['admin', 'gerente']),
  async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Parâmetros startDate e endDate são obrigatórios.' });
    }

    try {
        const query = `
            SELECT
                COALESCE(SUM(a.preco_total), 0) AS total_revenue,
                COALESCE(SUM(s.custo_material * (a.preco_total / s.preco)), 0) AS total_material_cost,
                COALESCE(SUM(s.custo_mao_de_obra * (a.preco_total / s.preco)), 0) AS total_labor_cost
            FROM
                agendamentos a
            JOIN
                servicos s ON a.servico_cod = s.cod_servico
            WHERE
                a.status = 'concluido'
                AND a.data_hora_fim BETWEEN $1::timestamp AND $2::timestamp;
        `;
        const result = await pool.query(query, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

        res.json(result.rows[0]); 
    } catch (err) {
        console.error('Erro ao buscar resumo financeiro:', err);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar resumo financeiro.' });
    }
});

module.exports = router;