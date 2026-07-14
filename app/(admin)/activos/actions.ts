"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { auxAssetInputSchema, auxAssetMovementSchema } from "@/lib/validation/inputs";
import { createAuxAsset, registerAuxAssetMovement } from "@/lib/data/aux-assets";

export async function createAuxAssetAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/activos/nuevo", revalidate: ["/activos"] }, async () => {
    const input = auxAssetInputSchema.parse(formDataToObject(formData));
    const asset = await createAuxAsset(session, input);
    return `/activos/${asset.id}`;
  });
}

export async function registerAuxAssetMovementAction(assetId: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/activos/${assetId}`, revalidate: ["/activos", `/activos/${assetId}`] },
    async () => {
      const input = auxAssetMovementSchema.parse(formDataToObject(formData));
      await registerAuxAssetMovement(session, assetId, input);
      return `/activos/${assetId}`;
    },
  );
}
