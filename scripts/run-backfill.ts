import { createClient } from "@supabase/supabase-js";
import { backfillGaragesFromExistingDocumentsAction } from "../src/app/actions/garages";

async function runBackfill() {
  console.log("Exécution du rattrapage automatique des garages...");
  const res = await backfillGaragesFromExistingDocumentsAction();
  console.log("Résultat du backfill:", res);
}

runBackfill().catch(console.error);
