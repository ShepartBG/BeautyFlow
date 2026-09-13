import AdminShell from "@/components/AdminShell";

const requests = [
  ["Beauty Studio Maria", "Мария Иванова", "София", "Очаква преглед"],
  ["Fresh Barber", "Иван Петров", "Враца", "Тестов достъп"],
  ["Glow Nails", "Анелия", "Монтана", "Очаква разговор"],
];

export default function RequestsPage(){
  return (
    <AdminShell>
      <h1>Заявки за достъп</h1>
      <p>Тук ще преглеждаш салони и студиа, които искат тестов достъп.</p>
      <div className="table">
        {requests.map((r)=>(
          <div className="row" key={r[0]}>
            <b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
