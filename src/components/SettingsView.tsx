import { Palette, SlidersHorizontal, ShieldCheck, Type, RotateCcw, LogOut, Github, Info } from 'lucide-react';
import { useApp, type ThemeId } from '../store/appStore';
import { FEATURES } from '../features/registry';
import { telegram } from '../telegram/client';

const THEMES: { id: ThemeId; label: string; color: string }[] = [
  { id: 'midnight', label: 'Midnight', color: 'linear-gradient(135deg,#4facfe,#6c5ce7,#fd5ba2)' },
  { id: 'amoled', label: 'AMOLED', color: '#000' },
  { id: 'aurora', label: 'Aurora', color: 'linear-gradient(135deg,#00c9a7,#3fd0ff)' },
  { id: 'sunset', label: 'Sunset', color: 'linear-gradient(135deg,#ff7a59,#fd5ba2)' },
  { id: 'matrix', label: 'Matrix', color: 'linear-gradient(135deg,#1db954,#0e8f5a)' },
];

export default function SettingsView() {
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const fontSize = useApp((s) => s.fontSize);
  const setFontSize = useApp((s) => s.setFontSize);
  const proxy = useApp((s) => s.proxyReport);
  const toggleModMenu = useApp((s) => s.toggleModMenu);
  const reset = useApp((s) => s.resetSettings);
  const toast = useApp((s) => s.toastMsg);
  const setAuthorized = useApp((s) => s.setAuthorized);
  const ready = FEATURES.filter((f) => f.ready).length;

  return (
    <>
      <header className="header"><div className="brand"><span className="brand-logo">✈</span><div className="brand-name">Настройки</div></div></header>
      <div className="view">
        <div className="section">
          <div className="section-title">ГРАММ</div>
          <div className="card">
            <div className="card-row" onClick={() => toggleModMenu(true)}>
              <div className="ico"><SlidersHorizontal size={17} /></div>
              <div className="row-main"><div className="row-title">Мод-меню</div><div className="row-desc">{FEATURES.length} фич · {ready} уже работает</div></div>
              <span className="pill ready">OPEN</span>
            </div>
            <div className="card-row">
              <div className="ico"><ShieldCheck size={17} /></div>
              <div className="row-main">
                <div className="row-title">Соединение</div>
                <div className="row-desc">{proxy?.selected ? `${proxy.selected.host}:${proxy.selected.port} · ${proxy.selected.latency} мс` : 'Прямое соединение'}</div>
              </div>
              <span className="pill">{proxy?.mode ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Тема</div>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Palette size={17} color="var(--muted)" />
              {THEMES.map((t) => (
                <button key={t.id} title={t.label} onClick={() => setTheme(t.id)}
                  style={{ width: 34, height: 34, borderRadius: 10, background: t.color, border: theme === t.id ? '2px solid #fff' : '1px solid var(--line)' }} />
              ))}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Интерфейс</div>
          <div className="card">
            <div className="card-row">
              <div className="ico"><Type size={17} /></div>
              <div className="row-main"><div className="row-title">Размер текста</div><div className="row-desc">{fontSize}px</div></div>
              <input type="range" min="12" max="20" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: 110 }} />
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Прочее</div>
          <div className="card">
            <div className="card-row" onClick={() => { reset(); toast('Настройки сброшены'); }}>
              <div className="ico"><RotateCcw size={17} /></div><div className="row-main"><div className="row-title">Сбросить настройки</div></div>
            </div>
            <a className="card-row" href="https://github.com/kirilltitov777z-dotcom/gramm-client" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="ico"><Github size={17} /></div><div className="row-main"><div className="row-title">Исходный код</div><div className="row-desc">GitHub · Actions · Issues</div></div>
            </a>
            <div className="card-row">
              <div className="ico"><Info size={17} /></div><div className="row-main"><div className="row-title">Версия 1.0.0</div><div className="row-desc">Сделано с душой и без границ</div></div>
            </div>
            <div className="card-row" onClick={async () => { await telegram.logout(); setAuthorized(false); }}>
              <div className="ico" style={{ color: '#ff7675' }}><LogOut size={17} /></div><div className="row-main"><div className="row-title" style={{ color: '#ff7675' }}>Выйти из аккаунта</div></div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, padding: 20 }}>ГРАММ · Телеграм без границ</div>
      </div>
    </>
  );
}
