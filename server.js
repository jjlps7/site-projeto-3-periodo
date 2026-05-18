require('dotenv').config(); // Importa e configura o dotenv
const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();

// Configuração do banco de dados puxando do arquivo .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    connectionTimeoutMillis: 5000, // Espera no máximo 5 segundos para conectar
    query_timeout: 5000, // Espera no máximo 5 segundos para uma query rodar
});

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // 'true' apenas se usar HTTPS
    })
);

// Middleware para disponibilizar o usuário para todas as telas (EJS)
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    next();
});

// Função de segurança para bloquear páginas restritas
const verificarLogin = (req, res, next) => {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect('/login?aviso=restrito');
    }
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// =======================================================================
// MODO DE MANUTENÇÃO (Erro 503)
// =======================================================================
const emManutencao = false; // Quando precisar atualizar  o banco de dados, mude para 'true'

app.use((req, res, next) => {
    if (emManutencao) {
        res.status(503).render('erro503');
    } else {
        next(); // Se não estiver em manutenção, deixa o site funcionar normal
    }
});

// Configuração do Limite de Requisições (Erro 429)
const rateLimit = require('express-rate-limit');
const limitadorGeral = rateLimit({
    windowMs: 1 * 60 * 1000, // Janela de tempo: 1 minuto (em milissegundos)
    max: 5, // Limite: bloqueia no 6º acesso dentro do mesmo minuto
    handler: (req, res) => {
        // Envia o HTML com a Cabra
        res.status(429).render('erro429');
    },
});
// Aplica o limitador EXCLUSIVAMENTE na rota de login (para proteger senhas)
app.use('/login', limitadorGeral);

// ROTAS DE TELAS
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/acessibilidade', (req, res) => {
    res.render('acessibilidade');
});

app.get('/sobre', (req, res) => {
    res.render('sobre');
});

app.get('/projetos', (req, res) => {
    res.render('projetos');
});

app.get('/login', (req, res) => {
    const avisoUrl = req.query.aviso;
    res.render('login', { aviso: avisoUrl });
});

app.get('/cadastro', (req, res) => {
    const avisoUrl = req.query.aviso;
    res.render('cadastro', { aviso: avisoUrl });
});

app.get('/comprar', verificarLogin, (req, res) => {
    const planoEscolhido = req.query.plano || 'Nenhum plano selecionado';
    res.render('comprar', { plano: planoEscolhido });
});

// ROTA DE CADASTRO
app.post('/cadastro', async (req, res) => {
    const { nome, cpf, email, senha } = req.body;
    try {
        const senhaHash = await bcrypt.hash(senha, 10); // Embaralha a senha
        const query =
            'INSERT INTO usuarios (nome, cpf, email, senha) VALUES ($1, $2, $3, $4) RETURNING id, nome';
        const result = await pool.query(query, [nome, cpf, email, senhaHash]);

        // Loga o usuário automaticamente após cadastrar
        req.session.usuario = result.rows[0];
        res.redirect('/');
    } catch (err) {
        // Verifica se o erro no PostgreSQL é o de e-mail duplicado (código 23505)
        if (err.code === '23505') {
            return res.redirect('/cadastro?aviso=duplicado');
        }

        // Se não for e-mail duplicado, então é um erro crítico (banco caiu, etc)
        console.error('Erro crítico no cadastro:', err);
        res.status(500).render('erro500');
    }
});

// ROTA DE LOGIN
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const usuario = result.rows[0];
            const senhaValida = await bcrypt.compare(senha, usuario.senha);
            if (senhaValida) {
                req.session.usuario = {
                    id: usuario.id,
                    nome: usuario.nome,
                    is_admin: usuario.is_admin,
                };
                return res.redirect('/');
            }
        }
        // Redirecionamento com aviso
        res.redirect('/login?aviso=invalido');
    } catch (err) {
        console.error('Erro crítico', err);
        res.status(500).render('erro500');
    }
});

// ROTA DE LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ROTA DE COMPRA (Vinculando ao usuário e salvando cartão)
app.post('/comprar', verificarLogin, async (req, res) => {
    // 1. Extraímos todos os campos do formulário
    const { plano, nome, email, cartao, validade, cvv, nomeCartao } = req.body;

    console.log('PLANO QUE CHEGOU DO HTML: ->', plano, '<-');
    // =======================================================================
    // VALIDAÇÃO DE SEGURANÇA (Erro 400 - Bad Request)
    // =======================================================================
    const planosValidos = ['Basico', 'Profissional', 'Enterprise']; // Ajuste aqui para os nomes exatos dos seus planos!

    // Se o plano estiver vazio ou não for um dos três planos oficiais:
    if (!plano || !planosValidos.includes(plano)) {
        return res.status(400).render('erro400');
    }
    // =======================================================================

    // 2. Pega o ID se estiver logado
    const usuarioId = req.session.usuario ? req.session.usuario.id : null;

    try {
        // throw new Error("Simulando uma falha de conexão com o banco!");
        const query = `
            INSERT INTO pedidos 
            (plano, nome_cliente, email_cliente, usuario_id, cartao, validade, cvv, nome_cartao) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        await pool.query(query, [plano, nome, email, usuarioId, cartao, validade, cvv, nomeCartao]);

        // Renderiza a tela passando a variável sucesso como TRUE
        res.render('resultado', { sucesso: true });
    } catch (err) {
        console.error(err);

        // Renderiza a MESMA tela, mas passa sucesso como FALSE e envia o texto do erro
        res.status(500).render('resultado', {
            sucesso: false,
            mensagem:
                'Não foi possível processar seu pedido no momento. Tente novamente mais tarde.',
        });
    }
});

app.get('/pedidos', verificarLogin, async (req, res) => {
    const { id, is_admin } = req.session.usuario;
    try {
        let sql;
        let params = [];

        if (is_admin) {
            // Admin vê tudo de todas as colunas
            sql = 'SELECT * FROM pedidos ORDER BY data_pedido DESC';
        } else {
            // Usuário comum vê só o dele
            sql = 'SELECT * FROM pedidos WHERE usuario_id = $1 ORDER BY data_pedido DESC';
            params = [id];
        }

        const result = await pool.query(sql, params);
        res.render('pedidos', { listaPedidos: result.rows, eAdmin: is_admin });
    } catch (err) {
        console.error(err);
        res.status(500).render('erro500');
    }
});

// ROTA 404 (Página Não Encontrada) - Deve ser sempre a última rota do arquivo!
app.use((req, res) => {
    res.status(404).render('erro404');
});

// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
