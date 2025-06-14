// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../banco'); // Seu pool de conexão com o banco de dados
const { authenticateToken } = require('../middleware/auth'); // Importa o middleware de autenticação

// @route    POST /api/auth/register
// @desc     Registrar um novo usuário (ideal para o primeiro gestor da empresa)
// @access   Public (nesta fase, para permitir o registro inicial de uma empresa)
router.post('/register', async (req, res) => {
    const {
        nome_usuario,
        nome_empresa,
        cnpj,
        email,
        senha, // Senha em texto claro vinda do frontend
        role, // Esperamos 'gestor' para o registro inicial de empresa
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
        // 1. Validação de campos obrigatórios no backend
        if (!nome_usuario || !email || !senha || !nome_empresa || !cnpj || !role) {
            return res.status(400).json({ msg: 'Por favor, preencha todos os campos obrigatórios: Nome de Usuário, Email, Senha, Nome da Empresa, CNPJ, e Role.' });
        }
        if (senha.length < 6) {
            return res.status(400).json({ msg: 'A senha deve ter no mínimo 6 caracteres.' });
        }
        // Para o registro inicial da empresa, apenas a role 'gestor' deve ser permitida via esta rota.
        if (role !== 'gestor') {
             return res.status(400).json({ msg: 'Role inválida para registro inicial. Apenas "gestor" é permitido por esta rota.' });
        }
        // Validação de formato de email e CNPJ (exemplo simplificado, pode ser mais robusto com regex)
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ msg: 'Por favor, insira um email válido.' });
        }
        if (cnpj.length < 14) { // CNPJ com 14 dígitos (sem formatação)
            return res.status(400).json({ msg: 'CNPJ inválido. Deve conter pelo menos 14 caracteres numéricos.' });
        }


        // 2. Verificar se o email ou CNPJ já existem no banco de dados
        let userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1 OR cnpj = $2', [email, cnpj]);
        if (userExists.rows.length > 0) {
            if (userExists.rows[0].email === email) {
                return res.status(400).json({ msg: 'Este email já está em uso.' });
            }
            if (userExists.rows[0].cnpj === cnpj) {
                return res.status(400).json({ msg: 'Este CNPJ já está registrado.' });
            }
        }

        // 3. Gerar hash da senha
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // 4. Inserir o novo usuário no banco de dados
        const newUser = await pool.query(
            `INSERT INTO usuarios (
                nome_usuario, nome_empresa, cnpj, email, senha_hash, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf
            ) VALUES($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING cod_usuario, nome_usuario, nome_empresa, cnpj, email, role, ativo, created_at, updated_at`, // Retorna apenas campos não-sensíveis
            [
                nome_usuario, nome_empresa, cnpj, email, senha_hash, role,
                telefone_contato || null, logo_url || null, codigo_ibge || null,
                cep || null, logradouro || null, numero || null, complemento || null,
                bairro || null, cidade || null, uf || null
            ]
        );

        // 5. Criar o payload para o JSON Web Token (JWT)
        const payload = {
            user: {
                id: newUser.rows[0].cod_usuario,
                role: newUser.rows[0].role,
                nome_usuario: newUser.rows[0].nome_usuario,
                nome_empresa: newUser.rows[0].nome_empresa,
                email: newUser.rows[0].email,
                cnpj: newUser.rows[0].cnpj
                // Adicione outros campos do usuário que o frontend precisará frequentemente ou para exibir no painel
            }
        };

        // 6. Assinar o JWT e retorná-lo
        jwt.sign(
            payload,
            process.env.JWT_SECRET, // Sua chave secreta do JWT (deve estar no .env)
            { expiresIn: '1h' }, // Token expira em 1 hora
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ token, user: payload.user }); // Retorna o token e os dados do usuário
            }
        );

    } catch (err) {
        console.error('Erro no registro do usuário:', err.message);
        // Em caso de erro, o middleware de erro global (`server.js`) irá capturá-lo
        // Mas se for um erro de validação (400), já retornamos acima.
        res.status(500).json({ msg: 'Erro interno do servidor durante o registro.' });
    }
});

// @route    POST /api/auth/login
// @desc     Autenticar usuário e obter token
// @access   Public
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        // 1. Validar campos
        if (!email || !senha) {
            return res.status(400).json({ msg: 'Email e senha são obrigatórios.' });
        }
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ msg: 'Por favor, insira um email válido.' });
        }

        // 2. Verificar se o usuário existe
        let user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ msg: 'Credenciais inválidas. Email ou senha incorretos.' });
        }

        // 3. Verificar a senha (comparar hash)
        const isMatch = await bcrypt.compare(senha, user.rows[0].senha_hash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciais inválidas. Email ou senha incorretos.' });
        }

        // 4. Verificar se o usuário está ativo
        if (!user.rows[0].ativo) {
            return res.status(401).json({ msg: 'Sua conta está inativa. Por favor, contate o administrador.' });
        }

        // 5. Criar o payload para o JWT
        const payload = {
            user: {
                id: user.rows[0].cod_usuario,
                role: user.rows[0].role,
                nome_usuario: user.rows[0].nome_usuario,
                nome_empresa: user.rows[0].nome_empresa,
                email: user.rows[0].email,
                cnpj: user.rows[0].cnpj
                // Adicione outros campos relevantes ao payload do JWT para o frontend usar
            }
        };

        // 6. Assinar o JWT e retornar
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }, // Token expira em 1 hora
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload.user }); // Retorna o token e os dados do usuário logado
            }
        );

    } catch (err) {
        console.error('Erro no login do usuário:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor durante o login.' });
    }
});

// @route    GET /api/auth/me
// @desc     Obter dados do usuário logado usando o token JWT
// @access   Private (requer token válido)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // req.user é populado pelo middleware authenticateToken
        // Retorna todos os campos do usuário, exceto a senha_hash
        const user = await pool.query(
            `SELECT
                cod_usuario, nome_usuario, nome_empresa, cnpj, email, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                created_at, updated_at
            FROM usuarios WHERE cod_usuario = $1`,
            [req.user.id]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado.' });
        }

        res.json(user.rows[0]);
    } catch (err) {
        console.error('Erro ao obter dados do usuário logado:', err.message);
        res.status(500).json({ msg: 'Erro interno do servidor ao buscar dados do usuário.' });
    }
});

module.exports = router;