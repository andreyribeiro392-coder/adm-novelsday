'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BookOpen, CircleDollarSign, ExternalLink, Film, LayoutDashboard, LogOut, Plus, RefreshCw, ShieldCheck, Users, X } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

type Series = {
  id: string
  slug: string
  title: string
  synopsis: string | null
  cover_url: string | null
  hero_url: string | null
  featured: boolean
  status: 'draft' | 'published'
  created_at: string
}

type Episode = {
  id: string
  series_id: string
  number: number
  title: string
  description: string | null
  video_url: string | null
  thumbnail_url: string | null
  access: 'free' | 'premium'
  status: 'draft' | 'published'
  created_at: string
}

type Tab = 'dashboard' | 'series' | 'episodes' | 'subscriptions'

const supabase = getSupabase()

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [series, setSeries] = useState<Series[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState(0)
  const [paymentsCount, setPaymentsCount] = useState(0)
  const [seriesModal, setSeriesModal] = useState(false)
  const [episodeModal, setEpisodeModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const publicSiteUrl = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || ''

  const seriesById = useMemo(() => new Map(series.map(item => [item.id, item.title])), [series])

  async function loadData() {
    if (!supabase) return
    const [seriesResult, episodesResult, subscriptionsResult, paymentsResult] = await Promise.all([
      supabase.from('series').select('*').order('created_at', { ascending: false }),
      supabase.from('episodes').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('payments').select('*', { count: 'exact', head: true })
    ])

    setSeries((seriesResult.data ?? []) as Series[])
    setEpisodes((episodesResult.data ?? []) as Episode[])
    setActiveSubscriptions(subscriptionsResult.count ?? 0)
    setPaymentsCount(paymentsResult.count ?? 0)
  }

  async function verifyAdmin(userId: string) {
    if (!supabase) return false
    const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
    const ok = !error && Boolean(data)
    setAuthorized(ok)
    if (ok) await loadData()
    return ok
  }

  useEffect(() => {
    async function boot() {
      if (!supabase) {
        setLoading(false)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) await verifyAdmin(data.session.user.id)
      setLoading(false)
    }
    boot()

    if (!supabase) return
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await verifyAdmin(session.user.id)
      else setAuthorized(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setMessage('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }
    const ok = data.user ? await verifyAdmin(data.user.id) : false
    if (!ok) {
      await supabase.auth.signOut()
      setMessage('Esta conta não possui acesso administrativo.')
    }
    setLoading(false)
  }

  async function logout() {
    if (!supabase) return
    await supabase.auth.signOut()
    setAuthorized(false)
  }

  async function createSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setMessage('')
    const payload = {
      title: String(form.get('title') || '').trim(),
      slug: String(form.get('slug') || '').trim().toLowerCase(),
      synopsis: String(form.get('synopsis') || '').trim() || null,
      cover_url: String(form.get('cover_url') || '').trim() || null,
      hero_url: String(form.get('hero_url') || '').trim() || null,
      featured: form.get('featured') === 'on',
      status: String(form.get('status') || 'draft')
    }
    const { error } = await supabase.from('series').insert(payload)
    setSaving(false)
    if (error) return setMessage(error.message)
    setSeriesModal(false)
    event.currentTarget.reset()
    await loadData()
  }

  async function createEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setMessage('')
    const payload = {
      series_id: String(form.get('series_id') || ''),
      number: Number(form.get('number')),
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim() || null,
      video_url: String(form.get('video_url') || '').trim() || null,
      thumbnail_url: String(form.get('thumbnail_url') || '').trim() || null,
      access: String(form.get('access') || 'free'),
      status: String(form.get('status') || 'draft')
    }
    const { error } = await supabase.from('episodes').insert(payload)
    setSaving(false)
    if (error) return setMessage(error.message)
    setEpisodeModal(false)
    event.currentTarget.reset()
    await loadData()
  }

  async function setSeriesStatus(id: string, status: 'draft' | 'published') {
    if (!supabase) return
    const { error } = await supabase.from('series').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setMessage(error.message)
    else await loadData()
  }

  async function setEpisodeStatus(id: string, status: 'draft' | 'published') {
    if (!supabase) return
    const { error } = await supabase.from('episodes').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setMessage(error.message)
    else await loadData()
  }

  async function removeSeries(id: string) {
    if (!supabase || !confirm('Excluir esta novela e todos os episódios vinculados?')) return
    const { error } = await supabase.from('series').delete().eq('id', id)
    if (error) setMessage(error.message)
    else await loadData()
  }

  async function removeEpisode(id: string) {
    if (!supabase || !confirm('Excluir este episódio?')) return
    const { error } = await supabase.from('episodes').delete().eq('id', id)
    if (error) setMessage(error.message)
    else await loadData()
  }

  if (!supabase) {
    return <SetupRequired />
  }

  if (loading) {
    return <div className="center-screen"><RefreshCw className="spin"/><span>Carregando painel…</span></div>
  }

  if (!authorized) {
    return (
      <main className="login-page">
        <div className="login-glow"/>
        <form className="login-card" onSubmit={login}>
          <div className="admin-brand"><span>N</span><strong>NOVELS<span>.DAY</span></strong></div>
          <div className="login-heading"><span>PAINEL ADMINISTRATIVO</span><h1>Acesso restrito</h1><p>Entre com uma conta autorizada no Supabase.</p></div>
          <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/></label>
          <label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/></label>
          {message && <div className="alert">{message}</div>}
          <button className="primary" type="submit">Entrar</button>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="admin-brand"><span>N</span><strong>NOVELS<span>.DAY</span></strong></div>
        <small>ADMIN</small>
        <nav>
          <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}><LayoutDashboard/><span>Visão geral</span></button>
          <button className={tab === 'series' ? 'active' : ''} onClick={() => setTab('series')}><BookOpen/><span>Novelas</span></button>
          <button className={tab === 'episodes' ? 'active' : ''} onClick={() => setTab('episodes')}><Film/><span>Episódios</span></button>
          <button className={tab === 'subscriptions' ? 'active' : ''} onClick={() => setTab('subscriptions')}><Users/><span>Assinaturas</span></button>
        </nav>
        <div className="sidebar-bottom">
          {publicSiteUrl && <a href={publicSiteUrl} target="_blank" rel="noreferrer"><ExternalLink/> Ver site</a>}
          <button onClick={logout}><LogOut/> Sair</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div><span className="kicker">NOVELS.DAY</span><h1>{tab === 'dashboard' ? 'Visão geral' : tab === 'series' ? 'Novelas' : tab === 'episodes' ? 'Episódios' : 'Assinaturas'}</h1></div>
          <button className="refresh" onClick={loadData}><RefreshCw size={17}/> Atualizar</button>
        </header>

        {message && <div className="alert workspace-alert">{message}<button onClick={() => setMessage('')}><X size={16}/></button></div>}

        {tab === 'dashboard' && (
          <div className="dashboard">
            <div className="stats-grid">
              <Stat label="Novelas" value={series.length} icon={<BookOpen/>}/>
              <Stat label="Episódios" value={episodes.length} icon={<Film/>}/>
              <Stat label="Assinaturas ativas" value={activeSubscriptions} icon={<Users/>}/>
              <Stat label="Pagamentos registrados" value={paymentsCount} icon={<CircleDollarSign/>}/>
            </div>
            <section className="panel">
              <div className="panel-head"><div><span className="kicker">CONTEÚDO</span><h2>Publicação</h2></div></div>
              <div className="status-lines">
                <div><span>Novelas publicadas</span><strong>{series.filter(item => item.status === 'published').length}</strong></div>
                <div><span>Episódios publicados</span><strong>{episodes.filter(item => item.status === 'published').length}</strong></div>
                <div><span>Episódios Premium</span><strong>{episodes.filter(item => item.access === 'premium').length}</strong></div>
              </div>
            </section>
          </div>
        )}

        {tab === 'series' && (
          <section>
            <div className="content-head"><div><span className="kicker">CATÁLOGO</span><h2>Novelas cadastradas</h2></div><button className="primary compact" onClick={() => setSeriesModal(true)}><Plus size={17}/> Nova novela</button></div>
            {series.length ? <div className="data-list">{series.map(item => <article className="data-row" key={item.id}><div className="thumb" style={item.cover_url ? { backgroundImage: `url(${item.cover_url})` } : undefined}>{!item.cover_url && item.title.slice(0,1)}</div><div className="row-main"><strong>{item.title}</strong><span>/{item.slug}</span></div><span className={`status ${item.status}`}>{item.status === 'published' ? 'Publicado' : 'Rascunho'}</span><div className="row-actions"><button onClick={() => setSeriesStatus(item.id, item.status === 'published' ? 'draft' : 'published')}>{item.status === 'published' ? 'Despublicar' : 'Publicar'}</button><button className="danger" onClick={() => removeSeries(item.id)}>Excluir</button></div></article>)}</div> : <Empty title="Nenhuma novela cadastrada" text="Quando você criar a primeira novela, ela aparecerá aqui e poderá ser publicada no site."/>}
          </section>
        )}

        {tab === 'episodes' && (
          <section>
            <div className="content-head"><div><span className="kicker">CONTEÚDO</span><h2>Episódios cadastrados</h2></div><button className="primary compact" onClick={() => setEpisodeModal(true)} disabled={!series.length}><Plus size={17}/> Novo episódio</button></div>
            {!series.length && <div className="hint">Cadastre uma novela antes de adicionar episódios.</div>}
            {episodes.length ? <div className="data-list">{episodes.map(item => <article className="data-row" key={item.id}><div className="episode-index">{item.number}</div><div className="row-main"><strong>{item.title}</strong><span>{seriesById.get(item.series_id) ?? 'Novela removida'} • {item.access === 'premium' ? 'Premium' : 'Grátis'}</span></div><span className={`status ${item.status}`}>{item.status === 'published' ? 'Publicado' : 'Rascunho'}</span><div className="row-actions"><button onClick={() => setEpisodeStatus(item.id, item.status === 'published' ? 'draft' : 'published')}>{item.status === 'published' ? 'Despublicar' : 'Publicar'}</button><button className="danger" onClick={() => removeEpisode(item.id)}>Excluir</button></div></article>)}</div> : <Empty title="Nenhum episódio cadastrado" text="Os episódios que você adicionar aparecerão aqui sem conteúdo de exemplo."/>}
          </section>
        )}

        {tab === 'subscriptions' && (
          <section>
            <div className="content-head"><div><span className="kicker">RECEITA</span><h2>Assinaturas e pagamentos</h2></div></div>
            <Empty title="Integração de pagamento ainda não conectada" text="As tabelas reais de assinaturas e pagamentos já existem, mas nenhum gateway foi simulado. Quando o provedor real for conectado, os dados aparecerão aqui."/>
          </section>
        )}
      </section>

      {seriesModal && <Modal title="Nova novela" onClose={() => setSeriesModal(false)}><form className="editor-form" onSubmit={createSeries}><label>Título<input name="title" required/></label><label>Slug<input name="slug" placeholder="nome-da-novela" required pattern="[a-z0-9-]+"/></label><label>Sinopse<textarea name="synopsis" rows={4}/></label><label>URL da capa vertical<input name="cover_url" type="url"/></label><label>URL do banner<input name="hero_url" type="url"/></label><div className="two-cols"><label>Status<select name="status" defaultValue="draft"><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label><label className="check"><input type="checkbox" name="featured"/> Destaque da home</label></div><button className="primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar novela'}</button></form></Modal>}

      {episodeModal && <Modal title="Novo episódio" onClose={() => setEpisodeModal(false)}><form className="editor-form" onSubmit={createEpisode}><label>Novela<select name="series_id" required defaultValue=""><option value="" disabled>Selecione</option>{series.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label><div className="two-cols"><label>Número<input name="number" type="number" min="1" required/></label><label>Acesso<select name="access" defaultValue="free"><option value="free">Grátis</option><option value="premium">Premium</option></select></label></div><label>Título<input name="title" required/></label><label>Descrição<textarea name="description" rows={3}/></label><label>URL do vídeo<input name="video_url" type="url"/></label><label>URL da thumbnail<input name="thumbnail_url" type="url"/></label><label>Status<select name="status" defaultValue="draft"><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label><button className="primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar episódio'}</button></form></Modal>}
    </main>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <article className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong></article>
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><div className="empty-symbol"><ShieldCheck/></div><strong>{title}</strong><p>{text}</p></div>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="modal"><button className="modal-close" onClick={onClose}><X/></button><span className="kicker">NOVELS.DAY ADMIN</span><h2>{title}</h2>{children}</div></div>
}

function SetupRequired() {
  return <main className="setup-page"><div className="setup-card"><div className="admin-brand"><span>N</span><strong>NOVELS<span>.DAY</span></strong></div><h1>Conecte o Supabase</h1><p>O painel não usa dados falsos. Para começar, configure as variáveis do arquivo <code>.env.example</code> na Vercel e execute o arquivo <code>schema.sql</code> no Supabase.</p></div></main>
}
