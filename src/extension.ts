// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel(
    "Open File on Git Remote",
  );
  // outputChannel.appendLine("open-file-on-git-remote extension activated");

  // let customUrl: string | undefined;

  // const updateCustomUrl = () => {
  //   const config = vscode.workspace.getConfiguration("open-file-on-git-remote");
  //   const value = config.get<string>("customUrl");
  //   customUrl = value ?? undefined;
  //   outputChannel.appendLine("Custom URL updated: " + (customUrl ?? "not set"));
  // };

  // updateCustomUrl();

  // const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
  //   if (event.affectsConfiguration("open-file-on-git-remote.customUrl")) {
  //     updateCustomUrl();
  //   }
  // });

  const openFileOnGitRemote = vscode.commands.registerCommand(
    "open-file-on-git-remote.openRemoteFile",
    async (uri?: vscode.Uri) => {
      // outputChannel.appendLine("openRemoteFile command executed");

      // Determine the file URI: use the argument if provided (explorer), else active editor
      let fileUri: vscode.Uri | undefined = uri;
      if (!fileUri) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          outputChannel.appendLine(
            "No active text editor found and no file selected.",
          );
          vscode.window.showErrorMessage(
            "No active text editor found and no file selected.",
          );
          return;
        }
        fileUri = editor.document.uri;
      }
      const filePath = fileUri.fsPath;

      // Get the Git extension API
      const gitExtension =
        vscode.extensions.getExtension("vscode.git")?.exports;
      const git = gitExtension?.getAPI(1);
      if (!git) {
        outputChannel.appendLine("Git extension not found.");
        vscode.window.showErrorMessage("Git extension not found.");
        return;
      }

      // outputChannel.appendLine(
      // "Number of repositories detected: " + git.repositories.length,
      // );

      // Find the repository for the current file using path.relative
      const repo = git.repositories.find(
        (r: { rootUri: { fsPath: string } }) => {
          // outputChannel.appendLine(`Checking repository: ${r.rootUri.fsPath}`);
          const rel = path.relative(r.rootUri.fsPath, filePath);
          const isInRepo =
            !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
          // outputChannel.appendLine(
          // `Checking repo: ${r.rootUri.fsPath}, relative: ${rel}, isInRepo: ${isInRepo}`,
          // );
          return isInRepo;
        },
      );
      if (!repo) {
        outputChannel.appendLine(
          "No Git repository found for file: " + filePath,
        );
        vscode.window.showErrorMessage(
          "No Git repository found for file: " + filePath,
        );
        return;
      }

      // Get the remote URL (use 'origin' by default)
      const originRemote =
        repo.state.remotes.find((r: { name: string }) => r.name === "origin") ||
        repo.state.remotes[0];

      // outputChannel.appendLine(
      //   `repo.state.remotes: ${JSON.stringify(repo.state.remotes)}`,
      // );
      // outputChannel.appendLine(
      //   `repo.state.remotes.find((r: { name: string }) => r.name === "origin")): ${JSON.stringify(repo.state.remotes.find((r: { name: string }) => r.name === "origin"))}`,
      // );
      // outputChannel.appendLine(
      //   `repo.state.remotes[0]: ${JSON.stringify(repo.state.remotes[0])}`,
      // );

      if (!originRemote) {
        outputChannel.appendLine("No Git remote found for this repository.");
        vscode.window.showErrorMessage(
          "No Git remote found for this repository.",
        );
        return;
      }
      const gitRemoteUrl = originRemote.fetchUrl || originRemote.pushUrl;
      if (!gitRemoteUrl) {
        outputChannel.appendLine("No Git remote URL found.");
        vscode.window.showErrorMessage("No Git remote URL found.");
        return;
      }

      // Get the current branch name
      const branch = repo.state.HEAD?.name || "main";
      // outputChannel.appendLine("branch: " + branch);

      // Get the relative path of the file in the repo
      const relativePath = filePath
        .substring(repo.rootUri.fsPath.length + 1)
        .replace(/\\/g, "/");

      // Convert remote URL to web URL (GitHub/GitLab/Bitbucket basic support)
      // ssh://git@github.com/insilications/unplugin-inline-functions
      let webUrl = gitRemoteUrl
        .replace(/\.git$/, "")
        .replace(/^(:?ssh:\/\/)?git@([^:\n]+)/, "https://$1/")
        // .replace(/^git@([^:]+):/, "https://$1/")
        .replace(/^https?:\/\/([^@]+@)?/, "https://");
      // outputChannel.appendLine("webUrl: " + webUrl);

      // Get url string from settings
      const customUrl = vscode.workspace
        .getConfiguration("open-file-on-git-remote")
        .get<string>("customUrl");

      // outputChannel.appendLine("Custom URL from settings: " + customUrl);

      if (customUrl) {
        const url = customUrl
          .replace("${webUrl}", webUrl)
          .replace("${branch}", branch)
          .replace("${relativePath}", relativePath);

        vscode.env.openExternal(vscode.Uri.parse(url));
      }
    },
  );

  // context.subscriptions.push(openFileOnGitRemote, configWatcher);
  context.subscriptions.push(openFileOnGitRemote);
}

// This method is called when your extension is deactivated
export function deactivate() {}
