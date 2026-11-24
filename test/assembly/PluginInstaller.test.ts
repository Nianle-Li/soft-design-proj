import { describe, expect, it } from "vitest";
import type {
  AttributeHandler,
  Command,
  Plugin,
  ShapeProvider,
  TreeDecorator
} from "../../src/core/plugin-api";
import { PluginInstaller } from "../../src/host/assembly/PluginInstaller";

const services = { tree: () => ({ width: 1, height: 1, roots: [] }) };

const shape = (type: string): ShapeProvider => ({
  type,
  create: () => {
    throw new Error("not used");
  }
});
const command = (name: string): Command => ({ name, help: name, execute: () => [] });
const decorator = (name: string): TreeDecorator => ({ name, decorate: () => undefined });
const attribute = (name: string): AttributeHandler => ({
  name,
  handles: () => false,
  prepare: () => {
    throw new Error("not used");
  }
});

describe("plugin installation transaction", () => {
  it("publishes four declared categories in activation order and passes options unchanged", () => {
    const installer = new PluginInstaller(services);
    const options = { fill: "orange" };
    let received: unknown;
    const plugin: Plugin = {
      activate(context, actualOptions) {
        received = actualOptions;
        context.registerShape(shape("box"));
        context.registerCommand(command("inspect"));
        context.registerDecorator(decorator("box-label"));
        context.registerAttribute(attribute("box-attributes"));
      }
    };

    installer.install({
      name: "box-tools",
      contributes: {
        attributes: ["box-attributes"],
        decorators: ["box-label"],
        commands: ["inspect"],
        shapes: ["box"]
      },
      plugin,
      options
    });

    expect(received).toBe(options);
    const installed = installer.contributions();
    expect(installed.shapes.map((value) => value.type)).toEqual(["box"]);
    expect(installed.commands.map((value) => value.name)).toEqual(["inspect"]);
    expect(installed.decorators.map((value) => value.name)).toEqual(["box-label"]);
    expect(installed.attributes.map((value) => value.name)).toEqual(["box-attributes"]);
  });

  it("rolls back every staged category when the manifest does not match", () => {
    const installer = new PluginInstaller(services);
    expect(() => {
      installer.install({
        name: "bad-manifest",
        contributes: { shapes: ["declared"] },
        plugin: {
          activate(context) {
            context.registerShape(shape("actual"));
            context.registerCommand(command("leaked"));
          }
        }
      });
    }).toThrowError(
      "plugin manifest mismatch: bad-manifest (declared: shapes=[declared]; commands=[]; decorators=[]; attributes=[], registered: shapes=[actual]; commands=[leaked]; decorators=[]; attributes=[])"
    );
    expect(installer.contributions()).toEqual({
      shapes: [],
      commands: [],
      decorators: [],
      attributes: []
    });
  });

  it("rolls back an activation failure while keeping earlier plugins and accepting later ones", () => {
    const installer = new PluginInstaller(services);
    installer.install({
      name: "first",
      contributes: { commands: ["first"] },
      plugin: {
        activate: (context) => {
          context.registerCommand(command("first"));
        }
      }
    });

    expect(() => {
      installer.install({
        name: "broken",
        contributes: { shapes: ["leaked"] },
        plugin: {
          activate(context) {
            context.registerShape(shape("leaked"));
            throw new Error("boom");
          }
        }
      });
    }).toThrowError("plugin failed to activate: broken (boom)");

    installer.install({
      name: "last",
      contributes: { commands: ["last"] },
      plugin: {
        activate: (context) => {
          context.registerCommand(command("last"));
        }
      }
    });
    expect(installer.contributions().commands.map((value) => value.name)).toEqual([
      "first",
      "last"
    ]);
    expect(installer.contributions().shapes).toEqual([]);
  });

  it("rejects duplicate names atomically within and across plugins", () => {
    const installer = new PluginInstaller(services);
    installer.install({
      name: "first",
      contributes: { decorators: ["label"] },
      plugin: {
        activate: (context) => {
          context.registerDecorator(decorator("label"));
        }
      }
    });

    expect(() => {
      installer.install({
        name: "duplicate-existing",
        contributes: { decorators: ["label"] },
        plugin: {
          activate: (context) => {
            context.registerDecorator(decorator("label"));
          }
        }
      });
    }).toThrowError("duplicate registration: decorators/label");
    expect(() => {
      installer.install({
        name: "duplicate-staged",
        contributes: { commands: ["same"] },
        plugin: {
          activate(context) {
            context.registerCommand(command("same"));
            context.registerCommand(command("same"));
          }
        }
      });
    }).toThrowError("duplicate registration: commands/same");
    expect(installer.contributions().decorators.map((value) => value.name)).toEqual(["label"]);
    expect(installer.contributions().commands).toEqual([]);
  });
});
