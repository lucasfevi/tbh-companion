# Save format - TBH: Task Bar Hero

This is the hard-won, reverse-engineered knowledge about the save file. If
decryption or parsing breaks after a game update, start here.

## File location

```
%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3
```

The game writes this file periodically (every ~1-2 minutes while playing), not
on every XP tick. All rate math is therefore keyed off the file's modification
time (`mtime`), not poll time - see `tracker`.

## Encryption (Easy Save 3 / ES3)

The save is an ES3-encrypted blob:

- **Layout:** `[16-byte IV/salt][AES-CBC ciphertext]`
- **Key derivation:** PBKDF2-HMAC-**SHA1**, password + salt=IV, **100**
  iterations, 16-byte key (AES-128).
- **Cipher:** AES-128-**CBC**, PKCS7 padding.
- **Plaintext:** UTF-8 JSON.

### Password

```
emuMqG3bLYJ938ZDCfieWJ
```

This is the ES3 password baked into TBH builds. It is **not secret** - it is
published in the community Save Inspector's client-side JS
(https://taskbarhero.wiki/save-inspector). The developer can rotate it in a
patch; if decryption starts failing, the status line reads "wrong password or
not a TaskbarHero save" and the password in `config.json` (`es3Password`) must
be updated. The wiki inspector usually tracks the current value.

### Node implementation note

Port target is Node's built-in `crypto` (no native deps):

```ts
const iv = buf.subarray(0, 16);
const ct = buf.subarray(16);                       // length must be % 16 === 0
const key = crypto.pbkdf2Sync(password, iv, 100, 16, "sha1");
const d = crypto.createDecipheriv("aes-128-cbc", key, iv);
d.setAutoPadding(false);                            // strip PKCS7 manually so a
let out = Buffer.concat([d.update(ct), d.final()]); // wrong password -> clean error
```

A ciphertext length that is not a multiple of 16 almost always means the game
was caught mid-write - treat as a transient error and retry.

## Decrypted JSON layout (relevant parts)

Top level is an ES3 object map. Each entry is wrapped as
`{ "__type": ..., "value": <data> }`, and `value` is frequently itself a JSON
**string** that must be parsed again (see `_unwrap_es3_entry`).

```
PlayerSaveData.value (nested JSON string) ->
  heroSaveDatas: [ { heroKey, HeroLevel, HeroExp, IsUnLock, ... }, ... ]
  cubeSaveLevelData: { Level, Exp }
  currenySaveDatas: [ { Key, Quantity }, ... ]   # note: game's spelling
  commonSaveData: { playTime, currentStageKey, currentStageWave,
                    maxCompletedStage, ... }
  inventorySaveDatas / stashSaveDatas / tradingStashSaveDatas:
      [ { Index, ItemUniqueId, IsUnlock }, ... ]   # slots, ref items by id
  itemSaveDatas: [ { ItemKey, UniqueId, IsChaotic, EnchantCount[3],
                     EnchantData[6], ... }, ... ] # master list of instances
  BoxData: { BoxTypes[], BoxUniqueId[], BoxQuantity[] }  # held (unopened) chests
  aggregateSaveDatas: [ { Type, SubKey, Value }, ... ]   # lifetime counters
```

### Key facts

- **Gold** is currency `Key == 100001` in `currenySaveDatas` (`Quantity`).
  Gold is spent as well as earned, so only positive deltas are counted ("gold
  earned").
- **Hero XP** (`HeroExp`) resets on level-up, so it is not monotonic. Gains are
  accumulated from positive deltas only; a drop is treated as a reset.
- **Stage keys** are 4-digit `Difficulty|Act|Stage` (e.g. `3205` = Hell 2-5).
  Difficulties: `1 Normal, 2 Nightmare, 3 Hell, 4 Torment`. See `stages`.
- **Hero keys** -> names: `101 Knight, 201 Ranger, 301 Sorcerer, 401 Priest,
  501 Hunter, 601 Slayer`.

## Items (for the inventory/market features)

- **`itemSaveDatas` is the master list of every owned item instance** -
  inventory + stash + trading + equipped. Verified: all non-empty
  `inventorySaveDatas`/`stashSaveDatas`/`tradingStashSaveDatas` slot
  `ItemUniqueId` refs resolve into it. The slot arrays are mostly capacity
  (`IsUnlock` flags) and only say *where* an instance sits.
- The inventory feature reads `itemSaveDatas` directly and groups by `ItemKey`.
  It does **not** join slots to instances by `UniqueId`.
- **`UniqueId` precision warning:** `UniqueId` / `ItemUniqueId` (e.g.
  `514119247889201000`) exceed `Number.MAX_SAFE_INTEGER`. `JSON.parse` rounds
  them, so distinct ids can collide (~6/185 observed). Any future slot->instance
  join must parse these as strings/bigints losslessly (the numeric form is
  unsafe).
- `ItemKey` itself is small and safe; it equals the `id` in the tbh.city catalog
  (`data/gamedata.json`), giving `ItemKey -> name/grade/type/icon/marketTradable`.
- **`BoxData`** holds *unopened* chests as three parallel arrays
  (`BoxTypes[i]`, `BoxQuantity[i]`). It's a current count, not a drop history.
- **`aggregateSaveDatas`** are lifetime counters `{ Type, SubKey, Value }` with
  no timestamps (Type/SubKey meanings not yet decoded).
- Pricing: an `ItemKey -> market_hash_name` mapping is still needed for Steam
  Market lookups (appid **3678970**); the gear variant-letter is the open piece.
  See `docs/findings/`.
