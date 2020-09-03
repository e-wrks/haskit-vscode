
import * as vscode from 'vscode';

import { TextDecoder } from 'util';

const EdhTermPrefix = "Đ Session - ";

function createEdhTerminal(cmds: string[]): vscode.Terminal {
    const term = vscode.window.createTerminal(
        EdhTermPrefix + cmds.join(' '),
        "/usr/bin/env", ["epm", "x"].concat(cmds),
    );
    term.show();
    return term;
}

function isEdhTerminal(term: vscode.Terminal): boolean {
    if (term && undefined === term.exitStatus) {
        if (term.name.startsWith(EdhTermPrefix)) {
            return true;
        }
    }
    return false;
}

export async function newEdhTerminal(cmdl?: string): Promise<void> {
    function parseCmdLine(cmdl: string): string[] {
        // todo honor string quotes ?
        const cmds = cmdl.split(/\s+/).filter(arg => !!arg);
        return cmds;
    }

    if (undefined !== cmdl) {
        createEdhTerminal(parseCmdLine(cmdl));
        return;
    }

    const wsCmdls: Array<string> = [];
    const wsCfgs = await vscode.workspace.findFiles('haskit.json');
    for (const cfgFile of wsCfgs) {
        const cfgUtf8 = await vscode.workspace.fs.readFile(cfgFile);
        const cfgJson = JSON.parse(new TextDecoder().decode(cfgUtf8));
        const cmdls = cfgJson['edh.terminal.cmdl'];
        if (cmdls instanceof Array) {
            wsCmdls.push(...cmdls);
        } else if ('string' === typeof cmdls) {
            wsCmdls.push(cmdls);
        }
    }

    const defaultCmdl: Array<string> = wsCmdls.length < 1 ? ['hski'] : [wsCmdls[0]];
    const enteredCmd = new AsEnteredCmd('Run: epm x ' + defaultCmdl.join(' '));
    const optCmds: (AsEnteredCmd | OptionCmd)[] = Array.from(wsCmdls,
        cmdl => new OptionCmd(cmdl, 'Run: epm x ' + cmdl));
    optCmds.push(
        new OptionCmd("stack run", "Build & Run with Stack"),
        // new OptionCmd("cabal run hski", 'Build & Run with Cabal'),
    );
    const qp = vscode.window.createQuickPick<AsEnteredCmd | OptionCmd>();
    qp.title = "New Đ Terminal running command:";
    qp.placeholder = defaultCmdl.join(' ');
    qp.onDidChangeValue(e => {
        enteredCmd.label = e;
        enteredCmd.description = 'Run: epm x ' + e;
        qp.items = ([enteredCmd] as (AsEnteredCmd | OptionCmd)[]).concat(optCmds);
    });
    qp.items = ([enteredCmd] as (AsEnteredCmd | OptionCmd)[]).concat(optCmds);
    qp.onDidAccept(() => {
        const sel = qp.selectedItems[0];
        qp.hide();
        qp.dispose();
        createEdhTerminal(sel.label ? parseCmdLine(sel.label) : defaultCmdl);
    });
    qp.show();
}

class AsEnteredCmd implements vscode.QuickPickItem {

    alwaysShow = true;

    label = '';
    description = '';

    constructor(description: string) {
        this.description = description;
    }

}

class OptionCmd implements vscode.QuickPickItem {

    alwaysShow = true;

    label: string;
    description?: string;

    constructor(lable: string, description?: string) {
        this.label = lable;
        this.description = description;
    }

}


export class EdhCodelensProvider implements vscode.CodeLensProvider {

    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken)
        : vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        let cellCnt = 0;
        const codeLenses = [];
        let beforeLineIdx = document.lineCount;
        for (let lineIdx = beforeLineIdx - 1; lineIdx >= 0; lineIdx--) {
            const line = document.lineAt(lineIdx);
            const effLine = line.text.trimStart();
            if (effLine.startsWith("# %%") || effLine.startsWith("# In[")) {
                codeLenses.push(new vscode.CodeLens(
                    new vscode.Range(lineIdx, 0, beforeLineIdx, 0), {
                    "title": "Run Cell",
                    "command": "edh.SendToEdhTermSession",
                    "arguments": [
                        document, lineIdx, beforeLineIdx
                    ]
                }));
                codeLenses.push(new vscode.CodeLens(
                    new vscode.Range(lineIdx, 0, lineIdx + 1, 0), {
                    "title": "Run Above",
                    "command": "edh.SendToEdhTermSession",
                    "arguments": [
                        document, 0, lineIdx
                    ]
                }));
                codeLenses.push(new vscode.CodeLens(
                    new vscode.Range(lineIdx, 0, lineIdx + 1, 0), {
                    "title": "Run Below",
                    "command": "edh.SendToEdhTermSession",
                    "arguments": [
                        document, lineIdx, -1
                    ]
                }));
                beforeLineIdx = lineIdx;
                cellCnt++;
            }
        }
        if (cellCnt > 0 && beforeLineIdx > 0) {
            codeLenses.push(new vscode.CodeLens(
                new vscode.Range(0, 0, 0, 0), {
                "title": "Run All",
                "command": "edh.SendToEdhTermSession",
                "arguments": [
                    document, 0, -1
                ]
            }));
            codeLenses.push(new vscode.CodeLens(
                new vscode.Range(0, 0, beforeLineIdx, 0), {
                "title": "Run Cell",
                "command": "edh.SendToEdhTermSession",
                "arguments": [
                    document, 0, beforeLineIdx
                ]
            }));
        }
        return codeLenses;
    }

}

export function sendEdhSourceToTerminal(document?: vscode.TextDocument,
    sinceLineIdx?: number, beforeLineIdx?: number): void {

    let sourceText: null | string = null;
    if (!document || undefined === sinceLineIdx || undefined === beforeLineIdx) {
        document = vscode.window.activeTextEditor?.document;
        if (!document) {
            return;
        }
        const sel = vscode.window.activeTextEditor?.selection;
        const selText = sel ? document.getText(sel) : undefined;
        if (!sel || !selText) {
            sinceLineIdx = 0;
            beforeLineIdx = document.lineCount;
            sourceText = document.getText();
        } else {
            sinceLineIdx = sel.start.line;
            beforeLineIdx = sel.end.character > 0
                ? sel.end.line + 1
                : sel.end.line;
            sourceText = selText;
        }
    }

    if (beforeLineIdx < 0) {
        beforeLineIdx = document.lineCount;
    }

    const lineCnt = beforeLineIdx >= document.lineCount
        ? beforeLineIdx - sinceLineIdx - 1
        : beforeLineIdx - sinceLineIdx;

    if (lineCnt < 1) {
        console.warn('No Edh source to send.');
        return;
    }

    if (null === sourceText) {
        sourceText = document.getText(new vscode.Range(
            sinceLineIdx, 0, beforeLineIdx, 0));
    }

    const term = prepareEdhTerminal();
    term.sendText("%%paste "
        + lineCnt // lineCnt
        + ' ' + (sinceLineIdx + 1) // lineNo
        + ' ' + document.fileName // srcName
        + '\n' + sourceText, true);
}

export function prepareEdhTerminal(): vscode.Terminal {
    let term = vscode.window.activeTerminal;
    if (term && isEdhTerminal(term)) return term;
    for (term of vscode.window.terminals) {
        if (isEdhTerminal(term)) return term;
    }
    const cmds = vscode.workspace.getConfiguration(
        "haskit.shell").get("cmd", ["hski"]);
    return createEdhTerminal(cmds);
}
