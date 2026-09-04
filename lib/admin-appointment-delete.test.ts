import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE, createAdminToken } from "@/lib/admin-auth";
import { DELETE } from "@/app/api/admin/appointments/[id]/route";

const APPT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const deleteMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqSelectMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqSelectMock }));
const eqDeleteMock = vi.fn(() => ({ error: null }));
const fromMock = vi.fn((table: string) => {
  if (table !== "appointments") throw new Error(`unexpected table ${table}`);
  return {
    select: selectMock,
    delete: () => ({ eq: eqDeleteMock }),
  };
});

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => ({ from: fromMock }),
  SUPABASE_MISSING_IT: "Database non configurato.",
}));

vi.mock("@/lib/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-auth")>();
  return {
    ...actual,
    isAdminRequest: vi.fn(),
  };
});

import { isAdminRequest } from "@/lib/admin-auth";

function deleteRequest(id: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = `${ADMIN_COOKIE}=${cookie}`;
  return DELETE(new Request(`http://localhost/api/admin/appointments/${id}`, { method: "DELETE", headers }), {
    params: Promise.resolve({ id }),
  });
}

describe("DELETE /api/admin/appointments/[id]", () => {
  beforeEach(() => {
    vi.mocked(isAdminRequest).mockReset();
    fromMock.mockClear();
    selectMock.mockClear();
    eqSelectMock.mockClear();
    maybeSingleMock.mockReset();
    eqDeleteMock.mockClear();
    deleteMock.mockReset();
    process.env.ADMIN_USER = "admin";
    process.env.ADMIN_PASSWORD = "admin";
    maybeSingleMock.mockResolvedValue({ data: { id: APPT_ID }, error: null });
    eqDeleteMock.mockReturnValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(isAdminRequest).mockResolvedValue(false);
    const res = await deleteRequest(APPT_ID);
    expect(res.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("hard-deletes an appointment when admin session is valid", async () => {
    vi.mocked(isAdminRequest).mockResolvedValue(true);
    const res = await deleteRequest(APPT_ID, createAdminToken()!);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; deletedId: string };
    expect(json.ok).toBe(true);
    expect(json.deletedId).toBe(APPT_ID);
    expect(fromMock).toHaveBeenCalledWith("appointments");
    expect(eqDeleteMock).toHaveBeenCalledWith("id", APPT_ID);
  });

  it("returns 404 when appointment is missing", async () => {
    vi.mocked(isAdminRequest).mockResolvedValue(true);
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const res = await deleteRequest(APPT_ID, createAdminToken()!);
    expect(res.status).toBe(404);
    expect(eqDeleteMock).not.toHaveBeenCalled();
  });
});
