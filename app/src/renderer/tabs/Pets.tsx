import { aggregatePassiveBonuses } from "../../core/pets/bonuses";
import type { PetBestStage, PetRow } from "../../../shared/types";
import { Badge } from "../components/ui/Badge";
import { CapacityBar } from "../components/ui/CapacityBar";
import { Accordion } from "../design-system/primitives/Accordion/Accordion";
import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";
import { usePets } from "../lib/usePets";

function formatKillsPerClear(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function BestStageBlock({ stage }: { stage: PetBestStage }) {
  return (
    <li className="border-t border-border pt-2 first:border-t-0 first:pt-0">
      <p className="m-0 text-xs text-fg">
        {stage.difficultyLabel} · {stage.locationName} · {stage.spawnPercent}% spawn
      </p>
      <p className="m-0 mt-0.5 text-xs text-muted">
        ~{formatKillsPerClear(stage.expectedKillsPerClear)} kills/clear
        {stage.runsMessage ? <> · {stage.runsMessage}</> : null}
      </p>
    </li>
  );
}

function PetCard({ pet }: { pet: PetRow }) {
  const showProgress =
    pet.unlockKind === "kills" && pet.killTarget != null && pet.killCount != null;
  const showKillsRemaining =
    showProgress && !pet.unlocked && pet.killsRemaining != null && pet.killsRemaining > 0;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-sm">{pet.name}</h2>
          {pet.equipped ? <Badge>Equipped</Badge> : null}
          {pet.unlocked ? <Badge variant="success">Unlocked</Badge> : null}
          {!pet.unlocked && pet.unlockKind === "dlc" ? <Badge>DLC</Badge> : null}
          {!pet.unlocked && pet.unlockKind === "kills" ? <Badge>In progress</Badge> : null}
        </div>

        <p className="m-0 min-h-[2.5rem] text-xs leading-relaxed text-muted">
          {pet.bonuses.join(" · ")}
        </p>

        {showProgress ? (
          <div>
            <p className="m-0 text-sm font-semibold">
              {pet.killCount!.toLocaleString()} / {pet.killTarget!.toLocaleString()} kills
            </p>
            <CapacityBar
              className="mt-1.5"
              percent={pet.progressPct ?? 0}
              variant={pet.unlocked ? "gray" : "blue"}
              compact
              role="progressbar"
              aria-valuenow={pet.killCount}
              aria-valuemin={0}
              aria-valuemax={pet.killTarget}
            />
            <p className="m-0 mt-1.5 min-h-[1.125rem] text-xs text-muted">
              {showKillsRemaining
                ? `${pet.killsRemaining!.toLocaleString()} kills remaining`
                : "\u00a0"}
            </p>
          </div>
        ) : null}

        {!pet.unlocked && pet.unlockKind === "dlc" ? (
          <p className="m-0 text-xs text-muted">Unlock via {pet.dlcLabel ?? "Supporter Pack"}</p>
        ) : null}
      </div>

      {pet.bestStages?.length || pet.appearsOnStages?.length ? (
        <div className="mt-auto flex flex-col gap-2 pt-2">
          {pet.bestStages && pet.bestStages.length > 0 ? (
            <Accordion variant="card" title="Best stages">
              <ul className="m-0 list-none space-y-2 p-0">
                {pet.bestStages.map((stage) => (
                  <BestStageBlock key={stage.stageKey} stage={stage} />
                ))}
              </ul>
            </Accordion>
          ) : null}

          {pet.appearsOnStages && pet.appearsOnStages.length > 0 ? (
            <Accordion variant="card" title="Where to find it">
              <ul className="m-0 list-none space-y-0.5 p-0 text-xs text-muted">
                {pet.appearsOnStages.map((stage) => (
                  <li key={`${stage.act}-${stage.stage}`}>{stage.label}</li>
                ))}
              </ul>
            </Accordion>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function PetGrid({ pets }: { pets: PetRow[] }) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-2.5 max-[720px]:grid-cols-1">
      {pets.map((pet) => (
        <PetCard key={pet.petKey} pet={pet} />
      ))}
    </div>
  );
}

export function Pets() {
  const pets = usePets();

  if (!pets) {
    return (
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-lg font-semibold">Pets</h1>
        <p className="m-0 text-muted">Waiting for save data…</p>
      </div>
    );
  }

  const unlockedCount = pets.pets.filter((p) => p.unlocked).length;
  const farmablePets = pets.pets.filter((p) => p.unlockKind === "kills");
  const dlcPets = pets.pets.filter((p) => p.unlockKind === "dlc");
  const farmableUnlocked = farmablePets.filter((p) => p.unlocked).length;
  const dlcUnlocked = dlcPets.filter((p) => p.unlocked).length;
  const passiveBonuses = aggregatePassiveBonuses(pets.pets);

  return (
    <TabPage>
      <TabHeader
        title="Pets"
        intro={`${unlockedCount} of ${pets.pets.length} companions unlocked. Passive bonuses apply even when a pet is not equipped — the slot is cosmetic.`}
      />

      <Section title="Current passive bonus" className="max-w-md">
        {passiveBonuses.length > 0 ? (
          <Card className="w-fit min-w-48">
            <ul className="m-0 list-none space-y-1 p-0 text-sm font-medium text-fg">
              {passiveBonuses.map((bonus) => (
                <li key={bonus}>{bonus}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <p className="m-0 text-xs text-muted">Unlock pets to gain passive bonuses.</p>
        )}
      </Section>

      <Section title="Unlock by farming">
        <p className="m-0 text-xs text-muted">
          {farmableUnlocked} of {farmablePets.length} unlocked ·{" "}
          {pets.unlockKillCount.toLocaleString()} kills per target monster
        </p>
        <PetGrid pets={farmablePets} />
      </Section>

      <Section title={pets.dlcLabel}>
        <p className="m-0 text-xs text-muted">
          {dlcUnlocked} of {dlcPets.length} unlocked · purchased with the Supporter Pack
        </p>
        <PetGrid pets={dlcPets} />
      </Section>
    </TabPage>
  );
}
