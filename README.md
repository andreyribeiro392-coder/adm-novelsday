# NOVELS.DAY Admin

Painel administrativo real da plataforma NOVELS.DAY. O projeto começa vazio e não inclui novelas, episódios, usuários, vendas ou métricas fictícias.

## Stack

- Next.js 15
- React 19
- TypeScript
- Supabase Auth + PostgreSQL
- Vercel

## 1. Criar o banco

Crie um projeto no Supabase e execute, nessa ordem, no **SQL Editor**:

1. `schema.sql`
2. `migrations/002_user_library.sql`

O primeiro arquivo cria catálogo, episódios, administradores, assinaturas e pagamentos. O segundo cria favoritos e progresso de reprodução dos usuários.

## 2. Criar o primeiro administrador

Em **Authentication > Users**, crie seu usuário de administrador. Copie o UUID desse usuário e rode no SQL Editor:

```sql
insert into public.admin_users (user_id)
values ('SEU-UUID-AQUI');
```

Nenhum administrador de exemplo é criado automaticamente.

## 3. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_PUBLIC_SITE_URL=
```

Use o mesmo projeto Supabase no site público `novels-day` e neste painel.

## 4. Rodar localmente

```bash
npm install
npm run dev
```

## 5. Publicar na Vercel

Conecte este repositório à Vercel e adicione as variáveis de ambiente em **Project Settings > Environment Variables**.

## Segurança

- O painel exige autenticação do Supabase.
- A conta também precisa existir em `admin_users`.
- As políticas RLS impedem usuários comuns de gravar novelas e episódios.
- O site público lê somente conteúdo com status `published`.
- Favoritos e progresso pertencem ao próprio usuário autenticado.
- Não coloque `service_role` no navegador ou em variáveis `NEXT_PUBLIC_*`.

## Conteúdo

Pelo painel é possível:

- cadastrar novelas;
- adicionar capa e banner por URL;
- marcar uma novela como destaque;
- salvar como rascunho ou publicar;
- cadastrar episódios;
- marcar episódios como grátis ou Premium;
- adicionar URL real de vídeo e thumbnail;
- publicar/despublicar;
- excluir conteúdo;
- consultar contagens reais de conteúdo, assinaturas e pagamentos.

As tabelas de assinaturas e pagamentos começam vazias. Nenhum gateway é simulado. Quando um provedor real for conectado, ele deve gravar os estados reais nessas tabelas para que o site libere o Premium.
