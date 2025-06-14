// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Obter o token do cabeçalho da requisição
    const token = req.header('x-auth-token');

    // Verificar se não há token
    if (!token) {
        return res.status(401).json({ msg: 'Nenhum token, autorização negada' });
    }

    // Verificar token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Adiciona o usuário decodificado ao objeto de requisição
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token inválido' });
    }
};