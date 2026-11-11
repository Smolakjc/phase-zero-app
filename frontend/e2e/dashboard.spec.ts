import { expect, test } from "@playwright/test";

/**
 * Testes E2E (Playwright) com backend mockado (`R-F5`):
 * 1. Carregar página
 * 2. Trocar os 4 cenários e conferir a cor/código do status (🟢 Itaipu, 🟡 Gongo Soco, 🔴 Maceió, 🔴 Brumadinho)
 * 3. Busca custom (Lat/Lon live)
 * 4. Abrir e fechar modal de token NASA Earthdata
 */
test.describe("PHASE-ZERO v5.0 Dashboard E2E", () => {
  test("carrega o dashboard, alterna entre os 4 cenários verificando o status, executa busca custom e gerencia o modal de token", async ({
    page,
  }) => {
    await page.goto("/");

    // Cenário inicial padrão: Gongo Soco -> YELLOW
    const statusCard = page.getByTestId("status-card");
    await expect(statusCard).toBeVisible();
    await expect(statusCard).toHaveAttribute("data-status-code", "YELLOW");

    // 1. Itaipu -> GREEN
    await page.getByTestId("scenario-btn-itaipu_normal").click();
    await expect(statusCard).toHaveAttribute("data-status-code", "GREEN");

    // 2. Maceió -> RED
    await page.getByTestId("scenario-btn-maceio_subsidence").click();
    await expect(statusCard).toHaveAttribute("data-status-code", "RED");

    // 3. Brumadinho -> RED
    await page.getByTestId("scenario-btn-brumadinho_hist").click();
    await expect(statusCard).toHaveAttribute("data-status-code", "RED");

    // 4. Gongo Soco -> YELLOW
    await page.getByTestId("scenario-btn-gongo_soco_active").click();
    await expect(statusCard).toHaveAttribute("data-status-code", "YELLOW");

    // Busca Custom
    await page.getByTestId("custom-name-input").fill("Barragem Teste");
    await page.getByTestId("custom-lat-input").fill("-20.15");
    await page.getByTestId("custom-lon-input").fill("-44.10");
    await page.getByTestId("search-custom-btn").click();
    await expect(statusCard).toBeVisible();

    // Abrir e fechar modal de Token Earthdata
    await page.getByTestId("open-token-modal-btn").click();
    const tokenDialog = page.getByTestId("token-modal-dialog");
    await expect(tokenDialog).toBeVisible();

    await page.getByTestId("token-input").fill("eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9_valid_token");
    await page.getByTestId("save-token-btn").click();
    await expect(tokenDialog).toBeHidden();
    await expect(page.getByTestId("open-token-modal-btn")).toContainText("Ativo");
  });
});

