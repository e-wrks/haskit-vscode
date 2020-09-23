
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

export async function newEdhTerminal(cmdl?: string): Promise<boolean> {
    function parseCmdLine(cmdl: string): string[] {
        // todo honor string quotes ?
        const cmds = cmdl.split(/\s+/).filter(arg => !!arg);
        return cmds;
    }

    if (undefined !== cmdl) {
        return null !== createEdhTerminal(parseCmdLine(cmdl));
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
        new OptionCmd("stack run", "Build & Run default target"),
        // cabal has no concept of default target, we can not supply a
        // working option without knowning what's opened in vscode
        // new OptionCmd("cabal run xxx", 'Build & Run with Cabal'),
    );

    return await new Promise((resolve, reject) => {
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
            const sel = qp.selectedItems;
            try {
                if (sel.length > 0) {
                    const opt = sel[0];
                    const term = createEdhTerminal(opt.label ? parseCmdLine(opt.label) : defaultCmdl);
                    resolve(null !== term);
                }
                resolve(false);
            } catch (exc) {
                reject(exc);
            } finally {
                qp.hide();
                qp.dispose();
            }
        });
        qp.show();
    });
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
        let beforeBlockIdx = beforeLineIdx;
        for (let lineIdx = beforeLineIdx - 1; lineIdx >= 0; lineIdx--) {
            const line = document.lineAt(lineIdx);
            const effLine = line.text.trimStart();
            if (effLine.startsWith("# %%") || effLine.startsWith("# In[")) {
                // a code cell
                codeLenses.push(new vscode.CodeLens(
                    new vscode.Range(lineIdx, 0, beforeLineIdx, 0), {
                    "title": "Run Cell",
                    "command": "edh.SendToEdhTermSession",
                    "arguments": [
                        document, lineIdx, beforeLineIdx
                    ]
                }));
                if (lineIdx > 0) {
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
                } else {
                    codeLenses.push(new vscode.CodeLens(
                        new vscode.Range(0, 0, 0, 0), {
                        "title": "Run All",
                        "command": "edh.SendToEdhTermSession",
                        "arguments": [
                            document, 0, -1
                        ]
                    }));
                }
                beforeLineIdx = lineIdx;
                cellCnt++;
            } else if (effLine.startsWith("# %{")) {
                // a block-starting cell
                codeLenses.push(new vscode.CodeLens(
                    new vscode.Range(lineIdx, 0, lineIdx + 1, 0), {
                    "title": "Run Block",
                    "command": "edh.SendToEdhTermSession",
                    "arguments": [
                        document, lineIdx, beforeBlockIdx
                    ]
                }));
                if (lineIdx > 0) {
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
                } else {
                    codeLenses.push(new vscode.CodeLens(
                        new vscode.Range(0, 0, 0, 0), {
                        "title": "Run All",
                        "command": "edh.SendToEdhTermSession",
                        "arguments": [
                            document, 0, -1
                        ]
                    }));
                }
                beforeLineIdx = lineIdx;
                cellCnt++;
            } else if (effLine.startsWith("# %}")) {
                // a block-ending cell
                beforeBlockIdx = beforeLineIdx;
                codeLenses.push(new vscode.CodeLens(
                    new vscode.Range(lineIdx, 0, lineIdx + 1, 0), {
                    "title": "Run Rest",
                    "command": "edh.SendToEdhTermSession",
                    "arguments": [
                        document, beforeBlockIdx, -1
                    ]
                }));
                beforeLineIdx = lineIdx;
                cellCnt++;
            }
        }
        if (cellCnt > 0 && beforeLineIdx > 0) {
            codeLenses.push(new vscode.CodeLens(
                new vscode.Range(0, 0, beforeLineIdx, 0), {
                "title": "Run Cell",
                "command": "edh.SendToEdhTermSession",
                "arguments": [
                    document, 0, beforeLineIdx
                ]
            }));
            codeLenses.push(new vscode.CodeLens(
                new vscode.Range(0, 0, 0, 0), {
                "title": "Run All",
                "command": "edh.SendToEdhTermSession",
                "arguments": [
                    document, 0, -1
                ]
            }));
        }
        return codeLenses;
    }

}

export async function sendEdhSourceToTerminal(document?: vscode.TextDocument,
    sinceLineIdx?: number, beforeLineIdx?: number): Promise<void> {

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

    const term = await prepareEdhTerminal();
    if (null === term) {
        return; // cancelled
    }
    term.sendText("%%paste "
        + lineCnt // lineCnt
        + ' ' + (sinceLineIdx + 1) // lineNo
        + ' ' + document.fileName // srcName
        + '\n' + sourceText, true);
}

export async function prepareEdhTerminal(): Promise<null | vscode.Terminal> {
    for (; ;) {
        let term = vscode.window.activeTerminal;
        if (term && isEdhTerminal(term)) return term;
        for (term of vscode.window.terminals) {
            if (isEdhTerminal(term)) return term;
        }
        if (! await newEdhTerminal()) {
            return null; // cancelled
        }
    }
}
