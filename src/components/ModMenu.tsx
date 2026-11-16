import { useMemo, useState } from 'react';
import { SlidersHorizontal, X, Search, Zap } from 'lucide-react';
import { useApp } from '../store/appStore';
import { FEATURES, FEATURE_CATEGORIES, FEATURES_COUNT } from '../features/registry';
import type { FeatureCategory } from '../features/registry';

export default function ModMenu() {
  const open = useApp((s) => s.modMenuOpen);
  const toggle = useApp((s) => s.toggleModMenu);
  const flags = useApp((s) => s.flags);
  const toggleFlag = useApp((s) => s.toggleFlag);
  const [cat, setCat] = useState<FeatureCategory | 'Все'>('Все');
  const [q, setQ] = useState('');

  const list = useMemo(() => FEATURES.filter((f) =>
    (cat === 'Все' || f.category === cat) &&
    (!q || `${f.title} ${f.desc}`.toLowerCase().includes(q.toLowerCase())),
  ), [cat, q]);

  if (!open) return null;

  return (
    <>
      <div className="overlay" onClick={() => toggle(false)} />
      <div className="drawer">
        <div className="grabber" />
        <div className="drawer-head">
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--grad)', display: 'grid', placeItems: 'center' }}>
            <SlidersHorizontal size={18} />
          </div>
          <div style={{ flex: 1 }}><h3>Мод-меню ГРАММ</h3><div style={{ fontSize: 11, color: 'var(--muted)' }}>{FEATURES_COUNT}+ возможностей</div></div>
          <button className="icon-btn" onClick={() => toggle(false)}><X size={18} /></button>
        </div>

        <div style={{ padding: '10px 16px 0' }}>
          <div className="search" style={{ margin: 0 }}><Search size={16} /><input placeholder="Найти фичу…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>

        <div className="chips" style={{ marginTop: 8 }}>
          {(['Все', ...FEATURE_CATEGORIES] as const).map((c) => (
            <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>

        <div className="drawer-body">
          <div className="card">
            {list.map((f) => (
              <div key={f.id} className="card-row" onClick={() => toggleFlag(f.id)}>
                <div className="ico">{f.ready ? <Zap size={16} /> : <span style={{ fontSize: 15 }}>◇</span>}</div>
                <div className="row-main">
                  <div className="row-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {f.title}
                    {f.ready && <span className="pill ready">готово</span>}
                    {f.pro && <span className="pill pro">PRO</span>}
                  </div>
                  <div className="row-desc">{f.desc}</div>
                </div>
                <div className={`switch ${flags[f.id] ? 'on' : ''}`} />
              </div>
            ))}
            {!list.length && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Ничего не найдено</div>}
          </div>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, marginTop: 16 }}>
            ГРАММ · {list.length} фич показано · настройки сохраняются локально
          </p>
        </div>
      </div>
    </>
  );
}
