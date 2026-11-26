import { describe, expect, it } from "vitest";
import { parsePluginConfig } from "../../src/host/assembly/PluginConfig";

describe("plugin configuration", () => {
  it("preserves enabled entry order and passes JSON options unchanged", () => {
    const options = { fill: "#f5a623", nested: { enabled: true } };
    const entries = parsePluginConfig(
      JSON.stringify({
        plugins: [
          { module: "first", options },
          { module: "disabled", enabled: false },
          { module: "last", enabled: true, options: [1, "two"] }
        ]
      })
    );

    expect(entries).toEqual([
      { module: "first", options },
      { module: "last", options: [1, "two"] }
    ]);
  });

  it("accepts an empty plugin list", () => {
    expect(parsePluginConfig('{"plugins":[]}')).toEqual([]);
  });

  it("accepts a UTF-8 byte order mark before the JSON document", () => {
    expect(parsePluginConfig('\uFEFF{"plugins":[{"module":"box"}]}')).toEqual([{ module: "box" }]);
  });

  it.each([
    "not json",
    "null",
    "[]",
    "{}",
    '{"plugins":null}',
    '{"plugins":[null]}',
    '{"plugins":[{}]}',
    '{"plugins":[{"module":""}]}',
    '{"plugins":[{"module":"  "}]}',
    '{"plugins":[{"module":1}]}',
    '{"plugins":[{"module":"ok","enabled":"false"}]}'
  ])("rejects invalid syntax or structure without exposing parser details: %s", (source) => {
    expect(() => parsePluginConfig(source)).toThrowError("invalid plugin config");
  });
});
