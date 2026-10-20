import { formatDisplayHours, loadShopHours } from "@/lib/runtime-shop-hours";

/** Server-rendered contact hours from gestionale (falls back to catalog defaults). */
export async function ShopHoursDisplay() {
  const state = await loadShopHours();
  const display = formatDisplayHours(state);
  return (
    <>
      {display.monday}
      <br />
      {display.tuesday}
      <br />
      {display.wednesday}
      <br />
      {display.thursday}
      <br />
      {display.friday}
      <br />
      {display.saturday}
      <br />
      {display.sunday}
    </>
  );
}
