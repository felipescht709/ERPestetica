// routes/agendamentos.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');

// GET all appointments (with client and service details)
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT
                a.id,
                a.data,
                a.hora,
                a.duracao_minutos,
                a.preco_total,
                a.status,
                c.nome AS cliente_nome,
                c.telefone AS cliente_telefone,
                s.nome AS servico_nome,
                s.descricao AS servico_descricao,
                v.modelo AS veiculo_modelo,
                v.cor AS veiculo_cor,
                v.placa AS veiculo_placa
            FROM agendamentos a
            JOIN clientes c ON a.cliente_id = c.id
            JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN veiculos v ON c.id = v.cliente_id -- Assuming one primary vehicle or joining first available
            ORDER BY a.data, a.hora;
        `; // Note: This join for vehicles is simplified. For multiple vehicles per client, a more complex logic would be needed.

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET appointments by date (with client and service details)
router.get('/date/:date', async (req, res) => {
    try {
        const { date } = req.params; // Expected format: YYYY-MM-DD
        const query = `
            SELECT
                a.id,
                a.data,
                a.hora,
                a.duracao_minutos,
                a.preco_total,
                a.status,
                c.nome AS cliente_nome,
                c.telefone AS cliente_telefone,
                s.nome AS servico_nome,
                s.descricao AS servico_descricao,
                v.modelo AS veiculo_modelo,
                v.cor AS veiculo_cor,
                v.placa AS veiculo_placa
            FROM agendamentos a
            JOIN clientes c ON a.cliente_id = c.id
            JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN veiculos v ON c.id = v.cliente_id
            WHERE a.data = $1
            ORDER BY a.hora;
        `;
        const result = await pool.query(query, [date]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new appointment
router.post('/', async (req, res) => {
    try {
        const { cliente_id, servico_id, data, hora, duracao_minutos, preco_total, status } = req.body;
        const newAppointment = await pool.query(
            'INSERT INTO agendamentos (cliente_id, servico_id, data, hora, duracao_minutos, preco_total, status) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [cliente_id, servico_id, data, hora, duracao_minutos, preco_total, status]
        );
        res.json(newAppointment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) an appointment
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { cliente_id, servico_id, data, hora, duracao_minutos, preco_total, status } = req.body;
        const updatedAppointment = await pool.query(
            'UPDATE agendamentos SET cliente_id = $1, servico_id = $2, data = $3, hora = $4, duracao_minutos = $5, preco_total = $6, status = $7 WHERE id = $8 RETURNING *',
            [cliente_id, servico_id, data, hora, duracao_minutos, preco_total, status, id]
        );
        if (updatedAppointment.rows.length === 0) {
            return res.status(404).json({ msg: 'Agendamento não encontrado' });
        }
        res.json(updatedAppointment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE an appointment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedAppointment = await pool.query('DELETE FROM agendamentos WHERE id = $1 RETURNING *', [id]);
        if (deletedAppointment.rows.length === 0) {
            return res.status(404).json({ msg: 'Agendamento não encontrado' });
        }
        res.json({ msg: 'Agendamento deletado com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;