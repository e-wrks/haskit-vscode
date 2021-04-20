import * as vscode from "vscode";

import {
    newEdhTerminal,
    EdhCodeLensProvider, sendEdhSourceToTerminal,
} from "./haskit";

export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(vscode.commands.registerCommand(
        "edh.NewEdhTermSession", newEdhTerminal));

    const codelensProvider = new EdhCodeLensProvider();
    vscode.languages.registerCodeLensProvider({
        "language": "edh"
    }, codelensProvider);

    context.subscriptions.push(vscode.commands.registerCommand(
        "edh.SendToEdhTermSession", sendEdhSourceToTerminal));

}
