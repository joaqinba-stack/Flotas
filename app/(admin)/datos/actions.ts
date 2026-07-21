"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { catalogItemCreateSchema, catalogItemSaveSchema } from "@/lib/validation/inputs";
import {
  createCatalogItem,
  saveCatalogItem,
  deleteCatalogItem,
} from "@/lib/data/catalogs";

export async function createCatalogItemAction(catalog: string, formData: FormData) {
  const session = await requireSession(Role.ADMIN);
  const path = `/datos/${catalog}`;
  return runFormAction({ errorPath: path, revalidate: [path, "/datos"] }, async () => {
    const input = catalogItemCreateSchema.parse(formDataToObject(formData));
    await createCatalogItem(session, catalog, input);
    return path;
  });
}

export async function saveCatalogItemAction(catalog: string, code: string, formData: FormData) {
  const session = await requireSession(Role.ADMIN);
  const path = `/datos/${catalog}`;
  return runFormAction({ errorPath: path, revalidate: [path, "/datos"] }, async () => {
    const input = catalogItemSaveSchema.parse(formDataToObject(formData));
    await saveCatalogItem(session, catalog, code, input);
    return path;
  });
}

export async function deleteCatalogItemAction(catalog: string, code: string) {
  const session = await requireSession(Role.ADMIN);
  const path = `/datos/${catalog}`;
  return runFormAction({ errorPath: path, revalidate: [path, "/datos"] }, async () => {
    await deleteCatalogItem(session, catalog, code);
    return path;
  });
}

/** Adopta un valor que ya estaba cargado como texto libre en la base. */
export async function adoptOrphanValueAction(catalog: string, code: string) {
  const session = await requireSession(Role.ADMIN);
  const path = `/datos/${catalog}`;
  return runFormAction({ errorPath: path, revalidate: [path, "/datos"] }, async () => {
    await createCatalogItem(session, catalog, { code, label: code, sortOrder: 0 });
    return path;
  });
}
