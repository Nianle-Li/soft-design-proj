export interface ResourceRef {
  readonly scheme: string;
  readonly path: string;
}

export const SVG_FILE_BADGE = "[]";

/** File decorations have no file-type argument, so the caller supplies a stat operation. */
export async function shouldMarkSvgFile(
  resource: ResourceRef,
  statType: () => Promise<number>
): Promise<boolean> {
  if (resource.scheme !== "file" || !resource.path.toLowerCase().endsWith(".svg")) {
    return false;
  }
  try {
    return (await statType()) === 1;
  } catch {
    return false;
  }
}
