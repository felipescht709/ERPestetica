// routes/servicos.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');

// GET all services
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM servicos ORDER BY nome');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET service by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const service = await pool.query('SELECT * FROM servicos WHERE id = $1', [id]);
        if (service.rows.length === 0) {
            return res.status(404).json({ msg: 'Serviço não encontrado' });
        }
        res.json(service.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new service
router.post('/', async (req, res) => {
    try {
        const { nome, descricao, duracao_minutos, preco, categoria, ativo } = req.body;
        const newService = await pool.query(
            'INSERT INTO servicos (nome, descricao, duracao_minutos, preco, categoria, ativo) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
            [nome, descricao, duracao_minutos, preco, categoria, ativo]
        );
        res.json(newService.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) a service
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, duracao_minutos, preco, categoria, ativo } = req.body;
        const updatedService = await pool.query(
            'UPDATE servicos SET nome = $1, descricao = $2, duracao_minutos = $3, preco = $4, categoria = $5, ativo = $6 WHERE id = $7 RETURNING *',
            [nome, descricao, duracao_minutos, preco, categoria, ativo, id]
        );
        if (updatedService.rows.length === 0) {
            return res.status(404).json({ msg: 'Serviço não encontrado' });
        }
        res.json(updatedService.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a service
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedService = await pool.query('DELETE FROM servicos WHERE id = $1 RETURNING *', [id]);
        if (deletedService.rows.length === 0) {
            return res.status(404).json({ msg: 'Serviço não encontrado' });
        }
        res.json({ msg: 'Serviço deletado com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;