import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/index';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const usuario = useStore((s) => s.usuario);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleSalir() {
    await logout();
    navigate('/login', { replace: true });
  }

  function cambiarLang(lang) {
    i18n.changeLanguage(lang);
    localStorage.setItem('puku-lang', lang);
  }

  return (
    <header className="navbar">
      <div className="marca">
        <span className="bird">🐦</span> PUKU PUKU
      </div>
      <nav>
        <NavLink to="/buscar" className={({ isActive }) => isActive ? 'activo' : ''}>
          {t('nav.buscar')}
        </NavLink>
        <NavLink to="/frecuentes" className={({ isActive }) => isActive ? 'activo' : ''}>
          {t('nav.frecuentes')}
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => isActive ? 'activo' : ''}>
          {t('nav.analytics')}
        </NavLink>
        {usuario?.rol === 'ADMINISTRADOR' && (
          <>
            <NavLink to="/auditoria" className={({ isActive }) => isActive ? 'activo' : ''}>
              {t('nav.auditoria')}
            </NavLink>
            <NavLink to="/experimentos" className={({ isActive }) => isActive ? 'activo' : ''}>
              {t('nav.experimentos')}
            </NavLink>
            <NavLink to="/feature-store" className={({ isActive }) => isActive ? 'activo' : ''}>
              {t('nav.featureStore')}
            </NavLink>
            <NavLink to="/ab-test" className={({ isActive }) => isActive ? 'activo' : ''}>
              {t('nav.abTest')}
            </NavLink>
          </>
        )}
      </nav>
      <div className="sesion">
        <div className="lang-switcher">
          <button className={`lang-btn${i18n.language === 'es' ? ' lang-activo' : ''}`} onClick={() => cambiarLang('es')}>ES</button>
          <button className={`lang-btn${i18n.language === 'en' ? ' lang-activo' : ''}`} onClick={() => cambiarLang('en')}>EN</button>
        </div>
        <span>{usuario?.nombre}</span>
        <button onClick={handleSalir}>{t('nav.salir')}</button>
      </div>
    </header>
  );
}
