export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { bootstrapDatabase } = await import("./lib/bootstrap-db");
    await bootstrapDatabase();
  } catch (err) {
    // Não derrubar o servidor: sem banco o app fica degradado (500 nas rotas
    // com dados), mas as páginas estáticas seguem no ar e o erro fica no log.
    console.error("[bootstrap] Falha ao preparar o banco de dados:", err);
  }
}
