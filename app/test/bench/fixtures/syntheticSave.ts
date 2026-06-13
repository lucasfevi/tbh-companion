import { sampleItemKeys } from "./catalog";

export interface LargeSaveOptions {
  itemCount?: number;
  heroCount?: number;
}

const DEFAULT_ITEM_COUNT = 1500;
const DEFAULT_HERO_COUNT = 24;

function buildHeroEntries(heroCount: number): string {
  return Array.from({ length: heroCount }, (_, index) => {
    const heroKey = 101 + (index % 20);
    return `{"heroKey":${heroKey},"HeroLevel":50,"HeroExp":1000,"IsUnLock":true}`;
  }).join(",");
}

function buildItemEntries(itemKeys: number[]): string {
  return itemKeys
    .map((itemKey, index) => {
      const uniqueId = `514119247889201${String(index).padStart(3, "0")}`;
      return `{"ItemKey":${itemKey},"UniqueId":${uniqueId},"IsChaotic":false}`;
    })
    .join(",");
}

/** Build decrypted ES3 root JSON text with a realistic item count. */
export function buildLargeSaveText(options: LargeSaveOptions = {}): string {
  const itemCount = options.itemCount ?? DEFAULT_ITEM_COUNT;
  const heroCount = options.heroCount ?? DEFAULT_HERO_COUNT;
  const itemKeys = sampleItemKeys(itemCount);

  const playerInner = `{
  "heroSaveDatas":[${buildHeroEntries(heroCount)}],
  "inventorySaveDatas":[{"Index":0,"ItemUniqueId":514119247889201000,"IsUnlock":true}],
  "itemSaveDatas":[${buildItemEntries(itemKeys)},{"ItemKey":0}],
  "aggregateSaveDatas":[{"Type":0,"SubKey":10002,"Value":100}],
  "BoxData":{"BoxTypes":[0,1,2],"BoxUniqueId":[1,2,3],"BoxQuantity":[10,5,3]},
  "commonSaveData":{"playTime":36000,"currentStageKey":3205,"currentStageWave":7,"maxCompletedStage":3209},
  "currenySaveDatas":[{"Key":100001,"Quantity":500000}]
}`;

  return JSON.stringify({
    PlayerSaveData: { __type: "Player", value: playerInner },
  });
}
