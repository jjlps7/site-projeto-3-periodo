-- 1. Criação da Tabela de Usuários 
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE
);

-- 2. Criação da Tabela de Pedidos 
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    plano VARCHAR(50) NOT NULL,
    nome_cliente VARCHAR(100) NOT NULL,
    email_cliente VARCHAR(100) NOT NULL,
    cartao VARCHAR(20) NOT NULL,
    validade VARCHAR(5) NOT NULL,
    cvv VARCHAR(4) NOT NULL,
    nome_cartao VARCHAR(100) NOT NULL,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER,
    CONSTRAINT fk_usuario_pedido 
        FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) 
        ON DELETE SET NULL
);

-- 3. Script para criar um admin inicial (Opcional) rodar APÓS ter criado o usuário pelo site e ele estiver no BD
-- INSERT INTO usuarios (nome, email, senha, is_admin) 
-- VALUES ('Administrador', 'admin@admin.com', 'SENHA_HASH_AQUI', TRUE);