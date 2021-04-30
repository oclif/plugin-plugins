import { Command, flags } from "@oclif/command";
import Plugins from "../../modules/plugins";
import { FeatureFlag } from "vtex";
import { IPlugin } from "@oclif/config";
import chalk = require("chalk");

import { ColorifyConstants } from "vtex";

export default class PluginsSource extends Command {
  static description = `Lists all plugins supported by ${ColorifyConstants.ID(
    "VTEX"
  )}.`;

  static usage = "plugins source PLUGIN";

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF("vtex plugins source")} myplugin`,
  ];

  static args = [
    { name: "path", description: "Plugin path.", required: true, default: "." },
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    verbose: flags.boolean({ char: "v" }),
  };

  plugins = new Plugins(this.config);

  async run() {
    const remoteCommands = FeatureFlag.getSingleton()
    .getFeatureFlagInfo<Array<{ name: string, description: string }>>("REMOTE_COMMANDS");
    let allPlugins: IPlugin[] = this.config.plugins;
    allPlugins = allPlugins.filter(
      (p) =>
        p.type !== "core" &&
        p.type !== "dev" &&
        p.name.startsWith("@vtex/cli-plugin-")
    );
    allPlugins = allPlugins.map((p) => {
      p.name = p.name.replace("@vtex/cli-plugin-", "");
      return p;
    });
    const plugins: string[] = allPlugins.map((p) => {
      return p.name;
    });
    for (const command of remoteCommands) {
      if (plugins.includes(command.name)) {
        command.name = `${chalk.green(command.name)}`;
      }
      console.log(`• ${command.name} - ${command.description}`);
    }
  }
}
