import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("gestionale offline giornata multi-barber", () => {
  const crm = readFileSync(join(process.cwd(), "components/gestionale/GestionalePanel.tsx"), "utf8");
  const route = readFileSync(join(process.cwd(), "app/api/admin/operator-offline/route.ts"), "utf8");
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("calls operator-offline per selected barber, with Entrambi batch", () => {
    expect(crm).toMatch(/postOperatorOffline/);
    expect(crm).toMatch(/setOfflineForBarbers/);
    expect(crm).toMatch(/barberId: string/);
    expect(crm).toMatch(/__all__/);
    expect(crm).toMatch(/Entrambi/);
    expect(crm).toMatch(/Offline \$\{bothLabel\.toLowerCase\(\)\}/);
    expect(crm).toMatch(/realBarbers\.length <= 1/);
    expect(route).toMatch(/barberId: z\.string\(\)\.min\(1\)/);
    expect(route).toMatch(/setOperatorOfflineDay/);
  });

  it("shows per-barber offline state on agenda columns and occupancy head", () => {
    expect(crm).toMatch(/operator-offline-btn/);
    expect(crm).toMatch(/Offline giornata/);
    expect(crm).toMatch(/agenda-offline-badge/);
    expect(crm).toMatch(/is-offline-day/);
    expect(crm).toMatch(/offlineIds=\{offlineIds\}/);
    expect(crm).toMatch(/onToggleOffline/);
    expect(css).toMatch(/\.operator-offline-btn/);
    expect(css).toMatch(/\.agenda-offline-badge/);
    expect(css).toMatch(/\.offline-day-btn-all/);
  });
});
