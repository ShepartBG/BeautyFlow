export default function NoActiveGame() {
  return (
    <main className="bf-page-bg flex min-h-screen items-center justify-center p-6 text-zinc-900">
      <div className="w-full max-w-md rounded-[2rem] border border-red-500/25 bg-white/75 p-8 text-center backdrop-blur-xl">
        <img
          src="/beautyflow-mark.png"
          alt="BeautyFlow"
          className="mx-auto mb-4 h-16 w-16 object-contain opacity-80"
        />
        <h1 className="text-3xl font-black text-red-500">
          Регистрацията е затворена
        </h1>
        <p className="mt-4 text-zinc-600">В момента няма активна час.</p>
      </div>
    </main>
  );
}
