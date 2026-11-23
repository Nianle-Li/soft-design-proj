import { describe, expect, it, vi } from "vitest";
import { shouldMarkSvgFile, SVG_FILE_BADGE } from "../src/SvgFileMarker";

describe("SVG Explorer marker selection", () => {
  it("uses the exact requested badge", () => {
    expect(SVG_FILE_BADGE).toBe("[]");
  });
  it("marks an SVG file only", async () => {
    expect(
      await shouldMarkSvgFile({ scheme: "file", path: "/a/example.svg" }, () => Promise.resolve(1))
    ).toBe(true);
    expect(
      await shouldMarkSvgFile({ scheme: "file", path: "/a/readme.txt" }, () => Promise.resolve(1))
    ).toBe(false);
    expect(
      await shouldMarkSvgFile({ scheme: "file", path: "/a/folder.svg" }, () => Promise.resolve(2))
    ).toBe(false);
    expect(
      await shouldMarkSvgFile({ scheme: "file", path: "/a/example.svg" }, () => Promise.resolve(3))
    ).toBe(false);
  });

  it("does not stat unrelated resources and handles missing files", async () => {
    const stat = vi.fn(() => Promise.resolve(1));
    expect(await shouldMarkSvgFile({ scheme: "file", path: "/a/readme.md" }, stat)).toBe(false);
    expect(stat).not.toHaveBeenCalled();
    expect(await shouldMarkSvgFile({ scheme: "untitled", path: "/a/example.svg" }, stat)).toBe(
      false
    );
    expect(stat).not.toHaveBeenCalled();
    expect(
      await shouldMarkSvgFile({ scheme: "file", path: "/a/example.svg" }, () =>
        Promise.reject(new Error("missing"))
      )
    ).toBe(false);
  });
});
