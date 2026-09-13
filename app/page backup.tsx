"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const GAME_ID = "bf8c48a9-4070-4ea7-9f7c-69dc93d74bf2";

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  location: string;
  max_rental_sets: number;
  rules_text: string;
  rules_version: string;
  status: string;
};

export default function Home() {
  const [successCode, setSuccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [rentalPlayers, setRentalPlayers] = useState(0);
  const [game, setGame] = useState<Game | null>(null);

  const freeRentalSets = (game?.max_rental_sets ?? 0) - rentalPlayers;

  async function loadStats() {
    const { data, error } = await supabase
      .from("registrations")
      .select("participation_type")
      .eq("game_id", GAME_ID);

    if (error) {
  alert("Грешка при зареждане на часта: " + error.message);
  console.log(error);
  return;
}

    setTotalPlayers(data.length);
    setRentalPlayers(
      data.filter((item) => item.participation_type === "rental").length
    );
  }

  async function loadGame() {
    
    const { data, error } = await supabase
  .from("games")
  .select("*")
  .eq("id", GAME_ID)
  .single();

console.log("GAME DATA:", data);
console.log("GAME ERROR:", error);

    if (error) {
      console.log(error.message);
      return;
    }

    setGame(data);
  }

  useEffect(() => {
    loadGame();
    loadStats();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const participationType = String(formData.get("participation_type"));
    const phone = String(formData.get("phone")).trim();

    if (participationType === "rental" && freeRentalSets <= 0) {
      alert(
        "Всички ресурси са резервирани. Можете да участвате със собствено оборудване."
      );
      setLoading(false);
      return;
    }

    const { data: existingPhones, error: phoneCheckError } = await supabase
      .from("registrations")
      .select("*")
      .eq("game_id", GAME_ID)
      .eq("phone", phone);

    if (phoneCheckError) {
      alert("Грешка при проверка на телефона.");
      setLoading(false);
      return;
    }

    if (existingPhones && existingPhones.length > 0) {
      alert("Този телефон вече е записан за тази час.");
      setLoading(false);
      return;
    }

    if (!game) {
      alert("Часта още се зарежда. Опитайте отново след секунда.");
      setLoading(false);
      return;
    }

    const code = "BB" + Math.floor(1000 + Math.random() * 9000);

    const { error } = await supabase.from("registrations").insert({
      game_id: GAME_ID,
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      phone: phone,
      age: Number(formData.get("age")),
      participation_type: participationType,
      registration_code: code,
      declaration_accepted: true,
      declaration_text: game.rules_text,
      declaration_accepted_at: new Date().toISOString(),
      rules_version: game.rules_version,
    });

    setLoading(false);

    if (error) {
      alert("Грешка при записване: " + error.message);
      return;
    }

    await loadStats();
    setSuccessCode(code);
  }

  if (successCode) {
    return (
      <main className="min-h-screen bg-white text-zinc-900 flex items-center justify-center p-6">
        <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-green-500 mb-4">
            Успешна регистрация!
          </h1>
          <p className="mb-4">Запази този код за часта:</p>
          <div className="text-4xl font-bold bg-white p-4 rounded-xl">
            {successCode}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-6 flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-green-500 text-center mb-2">
          BeautyFlow
        </h1>

        <p className="text-center text-zinc-500 mb-6">
          {game?.title ?? "Зареждане на час..."}
        </p>

        <div className="bg-zinc-900 rounded-2xl p-5 mb-6">
          <p>📅 Дата: {game?.game_date ?? "..."}</p>
          <p>🕒 Час: {game?.game_time ?? "..."}</p>
          <p>📍 Място: {game?.location ?? "..."}</p>
          <p>👥 Записани: {totalPlayers}</p>
          <p>🎒 Свободни ресурси: {freeRentalSets}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 rounded-2xl p-5 space-y-4"
        >
          <input
            name="first_name"
            className="w-full p-3 rounded-xl bg-white border border-zinc-700"
            placeholder="Име"
            pattern="[A-Za-zА-Яа-яЁё]+"
            title="Моля, въведете валидно име (само букви)."
            required
          />

          <input
            name="last_name"
            className="w-full p-3 rounded-xl bg-white border border-zinc-700"
            placeholder="Фамилия"
            pattern="[A-Za-zА-Яа-яЁё]+"
            title="Моля, въведете валидна фамилия (само букви)."
            required
          />

          <input
            name="phone"
            className="w-full p-3 rounded-xl bg-white border border-zinc-700"
            placeholder="Телефон"
            inputMode="numeric"
            pattern="[0-9]{10}"
            title="Телефонът трябва да съдържа точно 10 цифри, например 0897123456."
            required
          />

          <input
            name="age"
            className="w-full p-3 rounded-xl bg-white border border-zinc-700"
            placeholder="Възраст"
            type="number"
            min="16"
            max="60"
            onInvalid={(e) =>
              e.currentTarget.setCustomValidity(
                "Минималната възраст за участие е 16 години."
              )
            }
            onInput={(e) => e.currentTarget.setCustomValidity("")}
            required
          />

          <select
            name="participation_type"
            className="w-full p-3 rounded-xl bg-white border border-zinc-700"
            required
          >
            <option value="">Избери участие</option>
            {freeRentalSets > 0 && <option value="rental">Под наем</option>}
            <option value="own">Собствено оборудване</option>
          </select>

          {freeRentalSets <= 0 && (
            <p className="text-red-400 text-sm">
              Всички ресурси са резервирани. Можете да участвате само
              със собствено оборудване.
            </p>
          )}

          <label className="flex gap-3 text-sm text-zinc-600">
            <input type="checkbox" required />
            Приемам правилата и декларацията
          </label>

          <button
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl font-bold disabled:bg-zinc-600"
          >
            {loading ? "Записване..." : "Запиши се"}
          </button>
        </form>
      </div>
    </main>
  );
}