import AdminShell from "@/components/AdminShell";

export default function StatsPage(){
  return (
    <AdminShell>
      <h1>Статистика</h1>
      <p>Тук ще виждаш резервации, свободни часове, клиенти и приходи.</p>
      <div className="admin-grid">
        <div className="admin-card"><span>Резервации</span><br/><strong>32</strong></div>
        <div className="admin-card"><span>Нови клиенти</span><br/><strong>11</strong></div>
        <div className="admin-card"><span>Свободни слотове</span><br/><strong>6</strong></div>
        <div className="admin-card"><span>Приход</span><br/><strong>1840 лв.</strong></div>
      </div>
    </AdminShell>
  );
}
