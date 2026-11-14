import { expect, test } from "@playwright/test";

/**
 * Testes E2E (Playwright) com backend mockado (`R-F5`):
 * 1. Mapa limpo inicial (sem painel lateral/inferior antes de selecionar um local)
 * 2. Seleção dos 4 cenários abre a folha do observatório e valida os status (🟢 Itaipu, 🔴 Maceió, 🔴 Brumadinho, 🟡 Gongo Soco)
 * 3. Fechar folha retorna ao mapa limpo
 * 4. Busca custom via popover de busca (Lat/Lon live)
 * 5. Alternância de tema Claro/Escuro
 * 6. Abrir e gerenciar modal de token NASA Earthdata
 */
test.describe("PHASE-ZERO Observatório InSAR E2E", () => {
  test("inicia com mapa limpo, revela informações após escolha de local, alterna cenários e tema", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // 1. Estado inicial limpo: painel de local oculto até escolha explícita
    const sheet = page.getByTestId("observatory-sheet");
    const statusCard = page.getByTestId("status-card");
    await expect(sheet).toBeHidden();
    await expect(statusCard).toBeHidden();
    await expect(page.getByTestId("map-prompt-pill")).toBeVisible();

    // 2. Cenários calibrados no HUD superior (desktop)
    await page.getByTestId("scenario-btn-itaipu_normal").click();
    await expect(sheet).toBeVisible();
    await expect(statusCard).toHaveAttribute("data-status-code", "GREEN");

    await page.getByTestId("scenario-btn-maceio_subsidence").click();
    await expect(statusCard).toHaveAttribute("data-status-code", "RED");

    await page.getByTestId("scenario-btn-brumadinho_hist").click();
    await expect(statusCard).toHaveAttribute("data-status-code", "RED");

    await page.getByTestId("scenario-btn-gongo_soco_active").click();
    await expect(statusCard).toHaveAttribute("data-status-code", "YELLOW");

    // 3. Fechar folha retorna ao mapa puro
    await page.getByTestId("sheet-close-btn").click();
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("map-prompt-pill")).toBeVisible();

    // 4. Busca Custom no popover
    await page.getByTestId("open-search-btn").click();
    await page.getByTestId("tab-custom-coords").click();
    await page.getByTestId("custom-name-input").fill("Barragem Teste");
    await page.getByTestId("custom-lat-input").fill("-20.15");
    await page.getByTestId("custom-lon-input").fill("-44.10");
    await page.getByTestId("search-custom-btn").click();
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId("sheet-location-title")).toContainText("-20.15");

    // 5. Alternar Tema Claro / Escuro
    const metaScheme = page.locator('meta[name="color-scheme"]');
    const themeBtn = page.getByTestId("theme-toggle-btn");
    const initialContent = await metaScheme.getAttribute("content");
    await themeBtn.click();
    const afterFirstClick = await metaScheme.getAttribute("content");
    expect(afterFirstClick).not.toBe(initialContent);
    expect(["light", "dark"]).toContain(afterFirstClick);

    // 6. Modal de Token Earthdata
    await page.getByTestId("open-token-modal-btn").click();
    const tokenDialog = page.getByTestId("token-modal-dialog");
    await expect(tokenDialog).toBeVisible();

    await page.getByTestId("token-input").fill("eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9_valid_token");
    await page.getByTestId("save-token-btn").click();
    await expect(tokenDialog).toBeHidden();
    await expect(page.getByTestId("open-token-modal-btn")).toContainText("Ativo");
  });
});
