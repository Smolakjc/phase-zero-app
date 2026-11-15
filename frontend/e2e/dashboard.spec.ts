import { expect, test } from "@playwright/test";

/**
 * Testes E2E (Playwright) com backend mockado (`R-F5`):
 * 1. Mapa limpo inicial (sem painel lateral/inferior antes de selecionar um local)
 * 2. Busca custom via popover de busca (Lat/Lon live) abre a folha do observatório
 * 3. Fechar folha retorna ao mapa limpo
 * 4. Alternância de tema Claro/Escuro
 */
test.describe("PHASE-ZERO Observatório InSAR E2E", () => {
  test("inicia com mapa limpo, revela informações após escolha de local, alterna busca e tema", async ({
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

    // 2. Busca Custom no popover
    await page.getByTestId("open-search-btn").click();
    await page.getByTestId("tab-custom-coords").click();
    await page.getByTestId("custom-name-input").fill("Barragem Teste");
    await page.getByTestId("custom-lat-input").fill("-20.15");
    await page.getByTestId("custom-lon-input").fill("-44.10");
    await page.getByTestId("search-custom-btn").click();
    await expect(sheet).toBeVisible();
    await expect(page.getByTestId("sheet-location-title")).toContainText("-20.15");

    // 3. Fechar folha retorna ao mapa puro
    await page.getByTestId("sheet-close-btn").click();
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("map-prompt-pill")).toBeVisible();

    // 4. Alternar Tema Claro / Escuro
    const metaScheme = page.locator('meta[name="color-scheme"]');
    const themeBtn = page.getByTestId("theme-toggle-btn");
    const initialContent = await metaScheme.getAttribute("content");
    await themeBtn.click();
    const afterFirstClick = await metaScheme.getAttribute("content");
    expect(afterFirstClick).not.toBe(initialContent);
    expect(["light", "dark"]).toContain(afterFirstClick);
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
