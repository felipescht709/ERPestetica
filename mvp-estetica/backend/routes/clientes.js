// routes/clientes.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const auth = require('../middleware/auth'); // Importar o middleware de autenticação

// GET all clients (AGORA PROTEGIDA)
router.get('/', auth, async (req, res) => { // Adicionado 'auth' aqui
    try {
        const result = await pool.query('SELECT * FROM clientes ORDER BY nome');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET client by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const client = await pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
        if (client.rows.length === 0) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        res.json(client.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new client
router.post('/', async (req, res) => {
    try {
        const { nome, email, telefone, ultimo_servico, total_gasto, status } = req.body;
        const newClient = await pool.query(
            'INSERT INTO clientes (nome, email, telefone, ultimo_servico, total_gasto, status) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
            [nome, email, telefone, ultimo_servico, total_gasto, status]
        );
        res.json(newClient.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) a client
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, telefone, ultimo_servico, total_gasto, status } = req.body;
        const updatedClient = await pool.query(
            'UPDATE clientes SET nome = $1, email = $2, telefone = $3, ultimo_servico = $4, total_gasto = $5, status = $6 WHERE id = $7 RETURNING *',
            [nome, email, telefone, ultimo_servico, total_gasto, status, id]
        );
        if (updatedClient.rows.length === 0) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        res.json(updatedClient.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a client
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedClient = await pool.query('DELETE FROM clientes WHERE id = $1 RETURNING *', [id]);
        if (deletedClient.rows.length === 0) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        res.json({ msg: 'Cliente deletado com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;