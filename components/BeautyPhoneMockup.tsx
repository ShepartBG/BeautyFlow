export default function BeautyPhoneMockup(){
  return <div className="bf-device-wrap" aria-label="Примерен BeautyFlow интерфейс на телефон">
    <div className="bf-device-shadow"/>
    <div className="bf-device">
      <div className="bf-device-side bf-device-side-a"/><div className="bf-device-side bf-device-side-b"/>
      <div className="bf-device-screen">
        <div className="bf-island"/>
        <div className="bf-status"><span>9:41</span><span>● ᯤ ▰</span></div>
        <div className="bf-app-head"><div className="bf-app-brand"><span>BF</span><b>Beauty<span>Flow</span></b></div><button aria-label="Меню">≡</button></div>
        <div className="bf-app-greeting"><h3>Здравей, Георги! <i>👋</i></h3><p>Какъв стил те очаква днес?</p></div>
        <div className="bf-app-switch"><button>✂ Красота</button><button>◈ Барбър</button></div>
        <div className="bf-next-slot"><div className="bf-next-title"><span>Най-близък свободен час</span><b>↗</b></div><small>Днес, 18 Май</small><strong>11:30</strong><button>Виж всички часове</button></div>
        <div className="bf-popular"><h4>Популярни услуги</h4>
          <div className="bf-app-service"><span className="bf-avatar barber">✂</span><div><b>Подстригване</b><small>30 мин.</small></div><strong>25 лв.</strong><i>›</i></div>
          <div className="bf-app-service"><span className="bf-avatar beard">⌁</span><div><b>Бръснене + Оформяне</b><small>30 мин.</small></div><strong>25 лв.</strong><i>›</i></div>
          <div className="bf-app-service"><span className="bf-avatar hair">◯</span><div><b>Боядисване</b><small>90 мин.</small></div><strong>80 лв.</strong><i>›</i></div>
        </div>
        <div className="bf-app-tabs"><span><b>⌂</b>Начало</span><span><b>▣</b>Моите записи</span><span><b>♙</b>Профил</span></div>
      </div>
    </div>
  </div>
}
