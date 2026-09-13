import Image from "next/image";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import PricingSection from "@/components/PricingSection";

const categories = [
  { title: "Фризьорски салони", image: "/brand/bf-cat-hair.jpg", category: "hair" },
  { title: "Барбър", image: "/brand/bf-cat-barber.jpg", category: "barber" },
  { title: "Маникюр", image: "/brand/bf-cat-nails.jpg", category: "nails" },
  { title: "Мигли", image: "/brand/bf-cat-lashes.jpg", category: "lashes" },
  { title: "Масажи", image: "/brand/bf-cat-massage.jpg", category: "massage" },
  { title: "Други услуги", image: "/brand/bf-cat-other.jpg", category: "other" },
];

const miniBenefits = [
  ["◫", "Онлайн записване"],
  ["⌁", "Умен график"],
  ["✦", "Имейл известия"],
  ["◇", "Контрол на бизнеса"],
];

const businessBenefits = [
  ["01", "Работи по твоите правила", "Работно време, почивки, отпуски и услуги — настройваш ги веднъж."],
  ["02", "Свободни часове в реално време", "Клиентът вижда само възможните часове според реалния ти график."],
  ["03", "Клиенти и история", "Записванията и клиентите са събрани на едно място и лесни за преглед."],
  ["04", "Професионален профил", "Услуги, екип, снимки и информация за бизнеса в завършено публично представяне."],
];

const appointments = [
 ["Иван Петров","Подстрижка","24 май, 16:30","30 лв.","0888 123 456"],
 ["Георги Иванов","Скъсяване + брада","25 май, 11:00","40 лв.","0899 654 321"],
 ["Мария Николова","Маникюр с гел лак","26 май, 14:00","45 лв.","0877 987 654"],
 ["Елена Стоянова","Мигли – обемни","27 май, 10:30","60 лв.","0886 111 222"],
];

const realPhotos = {
  hair: "https://images.pexels.com/photos/3992873/pexels-photo-3992873.jpeg?auto=compress&cs=tinysrgb&w=1600",
  barber: "https://images.pexels.com/photos/13138585/pexels-photo-13138585.jpeg?auto=compress&cs=tinysrgb&w=1600",
  nails: "https://images.pexels.com/photos/34930163/pexels-photo-34930163.jpeg?auto=compress&cs=tinysrgb&w=1600",
  reception: "https://images.pexels.com/photos/6925914/pexels-photo-6925914.jpeg?auto=compress&cs=tinysrgb&w=1600",
  massage: "https://images.pexels.com/photos/31234760/pexels-photo-31234760.jpeg?auto=compress&cs=tinysrgb&w=1600",
  studio: "https://images.pexels.com/photos/7750108/pexels-photo-7750108.jpeg?auto=compress&cs=tinysrgb&w=1600",
};

export default function Home(){return <main className="page bf-public-page bf-v230-home bf-home-refined"><ScrollReveal/><PublicNav/>
<section className="bf-v230-hero bf-cinematic-section"><div className="bf-v230-hero-inner bf-v256-hero-surface"><div className="bf-v230-copy">
<span className="bf-v230-kicker">ПРОФЕСИОНАЛНА СИСТЕМА ЗА ЗАПИСВАНИЯ</span>
<h1><span className="bf-outline-word">Контрол</span><br/>върху времето.<br/><strong className="bf-outline-word bf-outline-purple">Свобода</strong><br/>за стила.</h1>
<p>BeautyFlow свързва клиенти и beauty бизнеси в една система — онлайн записване, реален график, услуги, екип, клиенти, почивки и управление от едно място.</p>
<div className="bf-v230-actions"><Link href="/salons" className="bf-v230-btn bf-v230-btn-dark">▣ <span>Намери място</span></Link><Link href="/register-salon" className="bf-v230-btn bf-v230-btn-light">▱ <span>Добави своя бизнес</span></Link></div>
<div className="bf-v230-mini-benefits">{miniBenefits.map(([i,l])=><div key={l}><span>{i}</span><b>{l}</b></div>)}</div></div>
<div className="bf-v230-phone-stage bf-phone-showcase-real"><Image src="/brand/beautyflow-admin-phone-v257.png" alt="BeautyFlow мобилен бизнес панел" width={896} height={1792} priority className="bf-real-phone-image"/></div>

</div></section>

<section className="bf-home-scale-intro bf-cinematic-section">
  <div className="bf-home-scale-copy"><span>ЕДНА ПЛАТФОРМА · ЦЕЛИЯТ ПРОЦЕС</span><h2>От намирането на салон до последния свободен час в графика.</h2><p>Клиентът избира подходящ салон, разглежда услугите и запазва час. Бизнесът управлява работното време, услугите, екипа, клиентите и записванията без хаос и без разпиляна информация.</p></div>
  <div className="bf-home-scale-stats"><div><b>24/7</b><span>онлайн записване</span></div><div><b>1</b><span>централен график</span></div><div><b>100%</b><span>контрол върху часовете</span></div></div>
</section>

<section className="bf-v230-services-shell bf-cinematic-section"><div className="bf-v230-section-head"><span>УСЛУГИ ЗА ВСЕКИ СТИЛ</span><h2>Избери категория и намери специалист за теб.</h2><p>BeautyFlow е създаден да събира различни beauty услуги в една ясна и лесна за използване среда.</p></div><div className="bf-v230-category-grid">{categories.map(item=><Link href={`/salons?category=${item.category}`} className="bf-v230-category" key={item.category}><div className="bf-v230-category-image"><Image src={item.image} alt={item.title} fill sizes="(max-width:760px) 46vw,220px"/></div><div className="bf-v230-category-copy"><h3>{item.title}</h3><i>→</i></div></Link>)}</div></section>

<section className="bf-v230-business-benefits bf-cinematic-section">{businessBenefits.map(([i,t,x])=><article key={t}><span>{i}</span><div><h3>{t}</h3><p>{x}</p></div></article>)}</section>

<section className="bf-home-editorial bf-cinematic-section">
  <article className="bf-home-story bf-home-story-wide">
    <div className="bf-home-story-media"><img src={realPhotos.reception} alt="Клиент в модерен beauty салон" /></div>
    <div className="bf-home-story-copy"><span>ЗА КЛИЕНТИТЕ</span><h2>Намираш. Избираш. Записваш.</h2><p>Разглеждаш профила, услугите и наличните часове и правиш резервация без обаждания и излишно чакане.</p><Link href="/salons">Разгледай салоните <b>→</b></Link></div>
  </article>
  <div className="bf-home-story-pair">
    <article className="bf-home-story bf-home-story-dark">
      <div className="bf-home-story-media"><img src={realPhotos.barber} alt="Барбър по време на работа" /></div>
      <div className="bf-home-story-copy"><span>ГРАФИК И УСЛУГИ</span><h2>Свободните часове следват реалния ти ден.</h2><p>Продължителност на услугите, почивка след тях, работно време и заети часове се събират в една логика.</p></div>
    </article>
    <article className="bf-home-story bf-home-story-light">
      <div className="bf-home-story-media"><img src={realPhotos.nails} alt="Маникюр в салон" /></div>
      <div className="bf-home-story-copy"><span>КЛИЕНТИ И ЗАПИСВАНИЯ</span><h2>По-малко хаос. Повече време за работата ти.</h2><p>Виждаш кой идва, кога е часът, каква е услугата и какво се е случило със записа.</p></div>
    </article>
  </div>
</section>

<section className="bf-home-reminders bf-cinematic-section">
  <div className="bf-home-reminders-media"><img src={realPhotos.hair} alt="Beauty специалист по време на работа"/></div>
  <div className="bf-home-reminders-copy"><span>АВТОМАТИЧНИ ИЗВЕСТИЯ</span><h2>По-малко забравени часове. По-малко изгубено време.</h2><p>След записване BeautyFlow автоматично изпраща email до клиента с данните за часа. По желание известие получава и човекът, който извършва услугата, така че важната информация да не се губи между чатове и бележки.</p><div className="bf-home-reminders-points"><b>✓ Клиентът получава потвърждение</b><b>✓ Екипът може да бъде известен</b><b>✓ Часът остава видим в графика</b></div></div>
</section>

<section className="bf-home-platform-map bf-cinematic-section bf-v256-platform">
  <div className="bf-home-platform-head"><span>КАКВО СЪБИРА BEAUTYFLOW</span><h2>Не е просто форма за записване.</h2><p>Платформата е изградена като цяла работна среда за клиента и бизнеса.</p></div>
  <div className="bf-home-platform-grid">
    <article><b>01</b><h3>Публичен профил</h3><p>Снимки, описание, услуги, екип, контакти и собствено представяне.</p></article>
    <article><b>02</b><h3>Онлайн резервации</h3><p>Клиентът избира услуга, специалист, дата и реално свободен час.</p></article>
    <article><b>03</b><h3>Дневен календар</h3><p>Всички часове и статути на записванията са видими в един график.</p></article>
    <article><b>04</b><h3>Работно време</h3><p>Почивки, почивни дни и отпуски се отразяват автоматично в наличността.</p></article>
    <article><b>05</b><h3>Клиенти</h3><p>История на посещенията и инструменти за управление на проблемни клиенти.</p></article>
    <article><b>06</b><h3>Известия</h3><p>Имейл комуникация при важни действия около записването.</p></article>
  </div>
</section>

<section className="bf-home-photo-band bf-cinematic-section">
  <div className="bf-home-photo-main"><img src={realPhotos.hair} alt="Фризьор и клиент в салон"/><div><span>ЗА ПРОФЕСИОНАЛИСТИТЕ</span><h2>BeautyFlow остава на заден план. Работата ти е отпред.</h2><p>Идеята е технологията да подрежда деня, без да се превръща в още една сложна система за обслужване.</p></div></div>
  <div className="bf-home-photo-side"><img src={realPhotos.massage} alt="Професионална масажна терапия"/><div><b>Различни услуги. Един начин за организация.</b><span>Фризьор, барбър, маникюр, мигли, масаж, козметика и още.</span></div></div>
</section>


<section className="bf-home-business-story bf-cinematic-section">
  <div className="bf-home-business-story-media"><img src={realPhotos.studio} alt="Модерен beauty салон и работна среда"/></div>
  <div className="bf-home-business-story-copy"><span>ПОВЕЧЕ ОТ КАЛЕНДАР</span><h2>Профилът, графикът и клиентите работят като една система.</h2><p>BeautyFlow събира ежедневната работа на едно място — от първото разглеждане на салона и избора на услуга до записа, известието и дневния график на екипа.</p><div><b>Публичен профил</b><b>Услуги и екип</b><b>Работно време</b><b>Клиентска история</b></div></div>
</section>


<section className="bf-v266-team-story bf-cinematic-section">
  <div className="bf-v266-team-story-media"><img src="https://images.pexels.com/photos/3993443/pexels-photo-3993443.jpeg?auto=compress&cs=tinysrgb&w=1600" alt="Фризьор работи с клиент в професионален салон"/></div>
  <div className="bf-v266-team-story-copy"><span>ЕДИН САЛОН · ОТДЕЛНИ СПЕЦИАЛИСТИ</span><h2>Всеки човек работи по своя график, независимо от графика на колегите си.</h2><p>Собственикът управлява салона и екипа, а всеки специалист има собствено работно време, почивки, отпуски, услуги и публичен профил. Клиентът може да избере конкретен човек или най-ранния свободен час.</p><div><b>Отделни календари</b><b>Специалности и услуги</b><b>Instagram и Facebook профили</b><b>До 10 снимки за салона</b></div><Link href="/specialists">Разгледай специалистите →</Link></div>
</section>

<PricingSection/>
<section className="bf-v230-business-cta bf-cinematic-section"><div className="bf-v230-calendar-art" aria-hidden="true"><span>✓</span><span>✓</span><span>✓</span></div><div><h2>Подреди деня си. Остави BeautyFlow да се погрижи за останалото.</h2><p>Създай своя профил, покажи услугите си и приемай записвания по ясен и професионален начин.</p><Link href="/register-salon" className="bf-v230-btn bf-v230-btn-dark">Добави своя бизнес <span>→</span></Link></div><div className="bf-v230-plant" aria-hidden="true">❦</div></section><Footer/></main>}
