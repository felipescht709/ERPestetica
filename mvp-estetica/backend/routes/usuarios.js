// routes/usuarios.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa ambos os middlewares
const bcrypt = require('bcryptjs');

// Middleware para verificar se o usuário é admin
// NOTE: Este middleware pode ser removido, e usar diretamente authorizeRole(['admin'])
// const checkAdmin = (req, res, next) => {
//     if (req.user.role !== 'admin') {
//         return res.status(403).json({ msg: 'Acesso negado. Apenas administradores.' });
//     }
//     next();
// };

// @route    GET /api/usuarios
// @desc     Listar todos os usuários (apenas para admins)
// @access   Private (Admin)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                cod_usuario, nome_usuario, nome_empresa, cnpj, email, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                created_at, updated_at
            FROM usuarios ORDER BY nome_usuario`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    GET /api/usuarios/:id
// @desc     Obter usuário por ID (apenas para admins ou o próprio usuário)
// @access   Private (Admin ou próprio usuário)
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    // Permite que um admin veja qualquer usuário, ou o próprio usuário veja seus dados
    if (req.user.role !== 'admin' && req.user.id.toString() !== id) {
        return res.status(403).json({ msg: 'Acesso negado. Você não tem permissão para visualizar este usuário.' });
    }
    try {
        const user = await pool.query(
            `SELECT
                cod_usuario, nome_usuario, nome_empresa, cnpj, email, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                created_at, updated_at
            FROM usuarios WHERE cod_usuario = $1`,
            [id]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    POST /api/usuarios
// @desc     Criar novo usuário (apenas para admins)
// @access   Private (Admin)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const {
        nome_usuario,
        nome_empresa,
        cnpj,
        email,
        senha,
        role,
        ativo = true, // Default true, mas pode ser enviado como false
        telefone_contato,
        logo_url,
        codigo_ibge,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf
    } = req.body;

    try {
        // 1. Validação de campos obrigatórios
        if (!nome_usuario || !email || !senha || !role || !nome_empresa || !cnpj) {
            return res.status(400).json({ msg: 'Por favor, preencha todos os campos obrigatórios.' });
        }
        if (!['admin', 'gerente', 'atendente', 'tecnico'].includes(role)) {
             return res.status(400).json({ msg: 'Role inválida fornecida.' });
        }

        // 2. Verificar se o email/CNPJ já existe
        let user = await pool.query('SELECT * FROM usuarios WHERE email = $1 OR cnpj = $2', [email, cnpj]);
        if (user.rows.length > 0) {
            if (user.rows[0].email === email) {
                return res.status(400).json({ msg: 'Email já está em uso.' });
            }
            if (user.rows[0].cnpj === cnpj) {
                return res.status(400).json({ msg: 'CNPJ já está em uso.' });
            }
        }

        // 3. Hash da senha
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // 4. Inserir novo usuário no BD com todos os campos
        const newUser = await pool.query(
            `INSERT INTO usuarios (
                nome_usuario, nome_empresa, cnpj, email, senha_hash, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
            [
                nome_usuario, nome_empresa, cnpj, email, senha_hash, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf
            ]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    PUT /api/usuarios/:id
// @desc     Atualizar dados do usuário (apenas para admins, ou o próprio usuário pode atualizar alguns de seus dados)
// @access   Private (Admin ou próprio usuário)
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const {
        nome_usuario,
        nome_empresa,
        cnpj,
        email,
        role,
        ativo,
        senha, // senha será hashed
        telefone_contato,
        logo_url,
        codigo_ibge,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf
    } = req.body;

    // Lógica de autorização: Admin pode editar qualquer um, o próprio usuário só pode editar a si mesmo (e não sua role ou ativo)
    if (req.user.role !== 'admin' && req.user.id.toString() !== id) {
        return res.status(403).json({ msg: 'Acesso negado. Você não tem permissão para editar este usuário.' });
    }
    // Se não for admin e tentar mudar role, ativo, nome_empresa ou cnpj
    if (req.user.role !== 'admin' && (role !== undefined || ativo !== undefined || nome_empresa !== undefined || cnpj !== undefined)) {
        return res.status(403).json({ msg: 'Acesso negado. Você não tem permissão para alterar estes campos.' });
    }

    let query = 'UPDATE usuarios SET ';
    const params = [];
    let i = 1;

    // Adiciona campos à query de forma dinâmica
    if (nome_usuario !== undefined) { query += `nome_usuario = $${i++}, `; params.push(nome_usuario); }
    if (nome_empresa !== undefined) { query += `nome_empresa = $${i++}, `; params.push(nome_empresa); }
    if (cnpj !== undefined) { query += `cnpj = $${i++}, `; params.push(cnpj); }
    if (email !== undefined) { query += `email = $${i++}, `; params.push(email); }
    if (role !== undefined) { query += `role = $${i++}, `; params.push(role); }
    if (ativo !== undefined) { query += `ativo = $${i++}, `; params.push(ativo); }
    if (telefone_contato !== undefined) { query += `telefone_contato = $${i++}, `; params.push(telefone_contato); }
    if (logo_url !== undefined) { query += `logo_url = $${i++}, `; params.push(logo_url); }
    if (codigo_ibge !== undefined) { query += `codigo_ibge = $${i++}, `; params.push(codigo_ibge); }
    if (cep !== undefined) { query += `cep = $${i++}, `; params.push(cep); }
    if (logradouro !== undefined) { query += `logradouro = $${i++}, `; params.push(logradouro); }
    if (numero !== undefined) { query += `numero = $${i++}, `; params.push(numero); }
    if (complemento !== undefined) { query += `complemento = $${i++}, `; params.push(complemento); }
    if (bairro !== undefined) { query += `bairro = $${i++}, `; params.push(bairro); }
    if (cidade !== undefined) { query += `cidade = $${i++}, `; params.push(cidade); }
    if (uf !== undefined) { query += `uf = $${i++}, `; params.push(uf); }

    // Atualiza a senha se fornecida
    if (senha !== undefined && senha.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);
        query += `senha_hash = $${i++}, `; params.push(senha_hash);
    }
    
    query += `updated_at = CURRENT_TIMESTAMP `; // Adiciona atualização do timestamp

    query = query.replace(/,\s*$/, ""); // Remove a última vírgula e espaço se houver
    query += ` WHERE cod_usuario = $${i++} RETURNING *`;
    params.push(id);

    try {
        const updatedUser = await pool.query(query, params);
        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        // Não retornar a senha_hash
        const { senha_hash, ...userWithoutHash } = updatedUser.rows[0];
        res.json(userWithoutHash);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    DELETE /api/usuarios/:id
// @desc     Deletar usuário (apenas para admins)
// @access   Private (Admin)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        // Evitar que um admin se auto-deleteie (opcional, mas boa prática)
        if (req.user.id.toString() === id) {
            return res.status(400).json({ msg: 'Não é possível deletar seu próprio usuário de administrador.' });
        }

        const deletedUser = await pool.query('DELETE FROM usuarios WHERE cod_usuario = $1 RETURNING *', [id]);
        if (deletedUser.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        res.json({ msg: 'Usuário deletado com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;