"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Garage } from "@/lib/types/database.types";
import { resolveRecommendedGarage, ResolveGarageResult } from "@/lib/engine/garage-resolver";
import { revalidatePath } from "next/cache";

export async function backfillGaragesFromExistingDocumentsAction(): Promise<{ success: boolean; count: number; error?: string }> {
  const adminSupabase = createAdminClient();

  try {
    const { data: docs, error: docError } = await (adminSupabase as any)
      .from("documents_sources")
      .select("*");

    if (docError || !docs || docs.length === 0) {
      return { success: true, count: 0 };
    }

    let createdOrLinkedCount = 0;

    for (const doc of docs) {
      if (doc.file_type === "carte_grise") continue;

      const ocr = (doc.ocr_structured_data || {}) as any;
      const meta = (doc.metadata || {}) as any;

      const rawGarageName =
        (ocr.garage?.name && ocr.garage?.name !== "Atelier Professionnel" ? ocr.garage.name : null) ||
        (ocr.emetteur?.nom && ocr.emetteur.nom !== "Atelier Professionnel" ? ocr.emetteur.nom : null) ||
        ocr.garage?.nom ||
        (doc.emetteur && doc.emetteur !== "Atelier Professionnel" && !doc.emetteur.toLowerCase().includes("ants") ? doc.emetteur : null);

      if (!rawGarageName) continue;

      const rawGarageAddress = ocr.garage?.address || ocr.emetteur?.adresse || meta.address || null;
      const rawGaragePhone = ocr.garage?.phone || ocr.emetteur?.telephone || meta.phone || null;
      const rawGarageEmail = ocr.garage?.email || ocr.emetteur?.email || meta.email || null;
      const rawGarageBrand = ocr.garage?.brandNetwork || ocr.garage?.marque || meta.brand || null;
      const rawGarageSiret = ocr.garage?.siret || ocr.emetteur?.siret || meta.siret || null;

      const foyerId = doc.foyer_id;
      if (!foyerId) continue;

      const { data: existingGarages } = await (adminSupabase as any)
        .from("garages")
        .select("*")
        .eq("foyer_id", foyerId);

      const cleanName = rawGarageName.trim().toLowerCase();
      let targetGarage = (existingGarages || []).find((g: any) => {
        if (rawGarageSiret && g.siret && g.siret.trim() === rawGarageSiret.trim()) return true;
        if (g.nom && g.nom.trim().toLowerCase() === cleanName) return true;
        if (g.nom && (g.nom.toLowerCase().includes(cleanName) || cleanName.includes(g.nom.toLowerCase()))) return true;
        return false;
      });

      let garageId = targetGarage?.id;

      if (!targetGarage) {
        const { data: newG, error: insertError } = await (adminSupabase as any)
          .from("garages")
          .insert({
            foyer_id: foyerId,
            nom: rawGarageName.trim(),
            adresse: rawGarageAddress,
            telephone: rawGaragePhone,
            email: rawGarageEmail,
            marque: rawGarageBrand,
            siret: rawGarageSiret,
            metadata: {
              backfilled: true,
              source_doc_id: doc.id,
            },
          })
          .select("id")
          .single();

        if (!insertError && newG) {
          garageId = newG.id;
          createdOrLinkedCount++;
        }
      } else {
        const updatePayload: Record<string, unknown> = {};
        if (rawGarageAddress && !targetGarage.adresse) updatePayload.adresse = rawGarageAddress;
        if (rawGaragePhone && !targetGarage.telephone) updatePayload.telephone = rawGaragePhone;
        if (rawGarageEmail && !targetGarage.email) updatePayload.email = rawGarageEmail;
        if (rawGarageBrand && !targetGarage.marque) updatePayload.marque = rawGarageBrand;
        if (rawGarageSiret && !targetGarage.siret) updatePayload.siret = rawGarageSiret;

        if (Object.keys(updatePayload).length > 0) {
          await (adminSupabase as any).from("garages").update(updatePayload).eq("id", targetGarage.id);
        }
      }

      if (garageId && doc.garage_id !== garageId) {
        await (adminSupabase as any).from("documents_sources").update({ garage_id: garageId }).eq("id", doc.id);
        await (adminSupabase as any).from("lignes_interventions").update({ garage_id: garageId }).eq("document_source_id", doc.id);
      }
    }

    return { success: true, count: createdOrLinkedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

export async function getFoyerGaragesAction(): Promise<Garage[]> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  let foyerId: string | null = null;

  if (user) {
    const { data: mem } = await (adminSupabase as any)
      .from("foyer_members")
      .select("foyer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (mem?.foyer_id) foyerId = mem.foyer_id;
  }

  if (!foyerId) {
    const { data: firstFoyer } = await (adminSupabase as any)
      .from("foyers")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstFoyer?.id) foyerId = firstFoyer.id;
  }

  if (!foyerId) return [];

  let { data: garages, error } = await (adminSupabase as any)
    .from("garages")
    .select("*")
    .eq("foyer_id", foyerId)
    .order("nom", { ascending: true });

  // Si aucun garage mais des factures existent, exécuter automatiquement le rattrapage
  if (!garages || garages.length === 0) {
    await backfillGaragesFromExistingDocumentsAction();
    const { data: refetched } = await (adminSupabase as any)
      .from("garages")
      .select("*")
      .eq("foyer_id", foyerId)
      .order("nom", { ascending: true });
    garages = refetched;
  }

  if (error || !garages) return [];
  return garages as Garage[];
}

export async function getRecommendedGarageForVehicleAction(vehicleId: string): Promise<ResolveGarageResult> {
  const adminSupabase = createAdminClient();

  const [vehRes, garagesRes, docsRes, linesRes] = await Promise.all([
    (adminSupabase as any).from("vehicules").select("*").eq("id", vehicleId).maybeSingle(),
    (adminSupabase as any).from("garages").select("*"),
    (adminSupabase as any).from("documents_sources").select("*").eq("vehicule_id", vehicleId),
    (adminSupabase as any).from("lignes_interventions").select("*").eq("vehicule_id", vehicleId),
  ]);

  const vehicle = vehRes.data || { id: vehicleId };
  const foyerId = vehicle.foyer_id;

  const filteredGarages = (garagesRes.data || []).filter((g: any) => !foyerId || g.foyer_id === foyerId);

  return resolveRecommendedGarage({
    vehicle,
    garages: filteredGarages,
    documents: docsRes.data || [],
    interventions: linesRes.data || [],
  });
}

export async function saveGarageAction(garageData: Partial<Garage>): Promise<{ success: boolean; garage?: Garage; error?: string }> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  let foyerId = garageData.foyer_id;

  if (!foyerId && user) {
    const { data: mem } = await (adminSupabase as any)
      .from("foyer_members")
      .select("foyer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (mem?.foyer_id) foyerId = mem.foyer_id;
  }

  if (!foyerId) {
    const { data: firstFoyer } = await (adminSupabase as any)
      .from("foyers")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstFoyer?.id) foyerId = firstFoyer.id;
  }

  if (!foyerId) {
    return { success: false, error: "Foyer introuvable." };
  }

  try {
    if (garageData.id && !garageData.id.startsWith("virtual-") && !garageData.id.startsWith("g-")) {
      const { data, error } = await (adminSupabase as any)
        .from("garages")
        .update({
          nom: garageData.nom,
          adresse: garageData.adresse,
          telephone: garageData.telephone,
          email: garageData.email,
          marque: garageData.marque,
          siret: garageData.siret,
          metadata: garageData.metadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", garageData.id)
        .select()
        .single();

      if (error) throw error;
      revalidatePath("/dashboard");
      return { success: true, garage: data as Garage };
    } else {
      const { data, error } = await (adminSupabase as any)
        .from("garages")
        .insert({
          foyer_id: foyerId,
          nom: garageData.nom || "Atelier Professionnel",
          adresse: garageData.adresse,
          telephone: garageData.telephone,
          email: garageData.email,
          marque: garageData.marque,
          siret: garageData.siret,
          metadata: garageData.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      revalidatePath("/dashboard");
      return { success: true, garage: data as Garage };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur lors de la sauvegarde du garage." };
  }
}
