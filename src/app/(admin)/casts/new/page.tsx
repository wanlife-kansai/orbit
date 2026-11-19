import { getShop } from "@/lib/shop";
import { targetSitesOf } from "@/lib/targets";
import { businessDate } from "@/lib/dates";
import { CastEditor } from "../editor/CastEditor";
import { toInput } from "../types";

export default async function NewCastPage() {
  const shop = await getShop();
  return <CastEditor castId={null} initial={toInput(null)} initialPhotos={[]} targetSites={targetSitesOf(shop)} today={businessDate(shop.dayChangeHour)} />;
}
