/** Erro esperado, com código HTTP e mensagem seguros para o cliente. */
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}
