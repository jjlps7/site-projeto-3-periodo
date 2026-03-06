# Base 5 Automações

Projeto acadêmico que simula o site institucional de uma empresa fictícia de automação financeira para empresas. Desenvolvido em HTML e CSS puro, sem frameworks ou bibliotecas externas.

---

## 📄 Páginas

| Arquivo | Descrição |
|---|---|
| `login.html` | Tela de login |
| `cadastro.html` | Tela de cadastro de usuário |
| `home_page.html` | Página inicial |
| `sobre.html` | Página institucional com detalhes dos serviços |
| `acessibilidade.html` | Declaração de acessibilidade |

---

## 🗂️ Estrutura de arquivos

```
├── login.html
├── cadastro.html
├── home_page.html
├── sobre.html
├── acessibilidade.html
├── css/
│   └── style.css
└── imgs/
    └── Logo.jpeg
```

---

## 🖥️ HTML

O projeto utiliza tags semânticas para estruturar o conteúdo: `<header>` para o cabeçalho com logo e navegação, `<nav>` para os links do menu, `<main>` para o conteúdo principal de cada página, `<section>` e `<article>` para organizar o conteúdo interno e `<footer>` para o rodapé com o link de acessibilidade.

Os formulários de login e cadastro são estruturados com `<label>` vinculado a cada `<input>` pelo atributo `for`, garantindo que o rótulo e o campo sejam reconhecidos como um par. Todos os campos têm `id` único e `name` definido para envio dos dados.

A navegação entre páginas é feita por links `<a href="">` simples. O formulário usa `method="get"` em vez de `post` para simular o redirecionamento sem necessidade de backend.

---

## 🎨 CSS

O layout das telas de login e cadastro é centralizado com `flexbox` no `body`, criando um card branco sobre fundo azul. As páginas internas (home, sobre, acessibilidade) seguem um layout com header fixo no topo, conteúdo em card com fundo azul escuro e texto claro, e footer ao final.

O header usa `position: sticky` para acompanhar a rolagem da página. O `.header-container` tem `max-width: 1200px` para não esticar demais em telas grandes, com os itens distribuídos via `justify-content: space-between`.

O card de conteúdo `.secao-principal` usa `width: 100%` para ocupar toda a largura disponível independente da quantidade de conteúdo, evitando variação de tamanho entre páginas.

A imagem do logo nas telas de login e cadastro usa `object-fit: cover` para manter as proporções sem distorcer. Na página sobre, o logo é exibido em formato circular via `border-radius: 50%`.

---

## ♿ Acessibilidade

O projeto segue as diretrizes **WCAG 2.2 Nível AA**.

**Navegação por teclado —** todos os formulários são navegáveis via Tab e Shift+Tab, com `tabindex` numérico definido em cada campo e botão. O Enter avança campo por campo em vez de submeter o formulário imediatamente, submetendo apenas quando o usuário está no último campo.

**Skip link —** páginas com menu de navegação têm um link invisível como primeiro elemento do `<body>`. Ele aparece no canto superior direito no primeiro Tab, permitindo pular os links do menu e ir direto ao conteúdo principal. O `<main>` tem `tabindex="-1"` para garantir que receba o foco corretamente.

**Foco visível —** o outline padrão do browser foi substituído por um estilo personalizado via `:focus-visible`, exibindo um contorno azul apenas durante a navegação por teclado.

**Declaração de acessibilidade —** disponível em `acessibilidade.html`, acessível pelo rodapé de todas as páginas, contendo o padrão adotado, o que foi implementado e canal de contato para feedback.
