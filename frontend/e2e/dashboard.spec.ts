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

    await page.getByTestId("sheet-close-btn").click();
    await expect(sheet).toBeHidden();

    await page.getByTestId("scenario-btn-maceio_subsidence").click();
    await expect(sheet).toBeVisible();
    await expect(statusCard).toHaveAttribute("data-status-code", "RED");

    await page.getByTestId("sheet-close-btn").click();
    await expect(sheet).toBeHidden();

    await page.getByTestId("scenario-btn-brumadinho_hist").click();
    await expect(sheet).toBeVisible();
    await expect(statusCard).toHaveAttribute("data-status-code", "RED");

    await page.getByTestId("sheet-close-btn").click();
    await expect(sheet).toBeHidden();

    await page.getByTestId("scenario-btn-gongo_soco_active").click();
    await expect(sheet).toBeVisible();
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

    // Recolhe a folha para voltar ao mapa
    await page.getByTestId("sheet-close-btn").click();
    await expect(sheet).toBeHidden();

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

  test("clique no mapa faz o menu Busca Live NASA deslizar da esquerda para a direita, cobrindo a tela menos 25px à direita, com botão de recolher", async ({
    page,
  }) => {
    const viewportWidth = 1440;
    const viewportHeight = 900;
    await page.setViewportSize({ width: viewportWidth, height: viewportHeight });
    await page.goto("/");

    const sheet = page.getByTestId("observatory-sheet");
    await expect(sheet).toBeHidden();

    // 1. Clicar em um ponto livre no mapa
    const mapCanvas = page.locator(".maplibregl-canvas");
    await expect(mapCanvas).toBeVisible();
    await mapCanvas.click({ position: { x: 500, y: 450 } });

    // 2. Menu completo Busca Live NASA surge da esquerda para a direita
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveClass(/pz-drawer-left/);

    // 3. Valida que a largura cobre a tela inteira deixando exatamente uns 25px visíveis à direita (após a transição da esquerda para a direita)
    await expect(async () => {
      const b = await sheet.boundingBox();
      expect(b).not.toBeNull();
      expect(Math.round(b!.width)).toBe(viewportWidth - 25);
      expect(Math.round(b!.x)).toBe(0);
      expect(viewportWidth - (Math.round(b!.x) + Math.round(b!.width))).toBe(25);
    }).toPass({ timeout: 2000 });

    const box = await sheet.boundingBox();

    // 4. Botão de recolher no topo à direita dentro do espaço do menu
    const closeBtn = page.getByTestId("sheet-close-btn");
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn).toContainText("Recolher");

    const closeBox = await closeBtn.boundingBox();
    expect(closeBox).not.toBeNull();
    if (closeBox && box) {
      // O botão está dentro do menu, posicionado no topo e alinhado à direita
      expect(closeBox.y).toBeLessThan(70);
      expect(closeBox.x).toBeGreaterThan(box.width - 250);
    }

    // 5. Clicar em recolher executa a animação saindo para a esquerda e voltando ao mapa
    await closeBtn.click();
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("map-prompt-pill")).toBeVisible();

    // 6. Clicar novamente no mapa reabre o menu suavemente
    await mapCanvas.click({ position: { x: 520, y: 460 } });
    await expect(sheet).toBeVisible();

    // 7. Clicar na faixa de 25px do mapa à direita também recolhe o menu
    const rightStrip = page.locator('div[title="Clique para recolher o menu e voltar ao mapa"]');
    await expect(rightStrip).toBeVisible();
    await rightStrip.click({ position: { x: 12, y: 300 } });
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("map-prompt-pill")).toBeVisible();
  });
});
