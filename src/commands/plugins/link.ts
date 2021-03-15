import { Command, flags } from "@oclif/command";
import * as chalk from "chalk";
import cli from "cli-ux";
import { ColorifyConstants } from "vtex";

import Plugins from "../../modules/plugins";

export default class PluginsLink extends Command {
  static description = "Links a plugin into the CLI for development.";

  static usage = "plugins link PLUGIN";

  static examples = [
    `${ColorifyConstants.COMMAND_OR_VTEX_REF("vtex plugins link")} myplugin`,
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
    const { flags, args } = this.parse(PluginsLink);
    this.plugins.verbose = flags.verbose;
    cli.action.start(`Linking plugin ${chalk.cyan(args.path)}`);
    await this.plugins.link(args.path);
    cli.action.stop();
  }
}
