import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

	const createFileCommand = vscode.commands.registerCommand('quickstruct-liquid-sections.createSectionFile', async () => {
		const fileNameInput = await vscode.window.showInputBox({
			prompt: 'Enter the name of the new section file',
			placeHolder: 'example'
		});

		if (fileNameInput) {
			const fileName = fileNameInput.replace(/[\s_&$%@#]/g, '-').toLowerCase();

			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (workspaceFolders) {
				const sectionsFolderPath = path.join(workspaceFolders[0].uri.fsPath, 'sections');
				const assetsFolderPath = path.join(workspaceFolders[0].uri.fsPath, 'assets');

				if (!fs.existsSync(sectionsFolderPath)) {
					fs.mkdirSync(sectionsFolderPath);
				}
				if (!fs.existsSync(assetsFolderPath)) {
					fs.mkdirSync(assetsFolderPath);
				}

				const sectionFilePath = path.join(sectionsFolderPath, `${fileName}.liquid`);
				let sectionContent = ``;

				let stylesheetPath = '';
				let scriptPath = '';

				const addStylesheet = await vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: 'Do you want to add a stylesheet file to the assets folder?' });
				if (addStylesheet === 'Yes') {
					stylesheetPath = path.join(assetsFolderPath, `${fileName}-stylesheet.css`);
					fs.writeFileSync(stylesheetPath, '');
					sectionContent += `{{ '${fileName}-stylesheet.css' | asset_url | stylesheet_tag }}`;
				}
				
				sectionContent += `\n`;
				sectionContent += `\n`;

				const scriptOption = await vscode.window.showQuickPick(['Async', 'Defer', 'Skip JavaScript'], { placeHolder: 'Define JavaScript load behavior (or skip adding a script)' });
				if (scriptOption !== 'Skip JavaScript') {
					scriptPath = path.join(assetsFolderPath, `${fileName}-javascript.js`);
					fs.writeFileSync(scriptPath, '');
					const scriptTag = scriptOption === 'Async' ? `async: true` : `defer: true`;
					sectionContent += `\n{{ '${fileName}-javascript.js' | asset_url | script_tag: ${scriptTag} }}\n`;
				}

				sectionContent += `
{% schema %}
{
	"name": "${fileName}",
	"class": "${fileName}",
	"settings": [],
	"presets": [
		{
			"name": "${fileName}"
		}
	]
}
{% endschema %}
`;

				fs.writeFileSync(sectionFilePath, sectionContent);

				if (stylesheetPath) {
					const stylesheetUri = vscode.Uri.file(stylesheetPath);
					vscode.workspace.openTextDocument(stylesheetUri).then(doc => vscode.window.showTextDocument(doc, { preview: false }));
					await vscode.window.withProgress({
						location: vscode.ProgressLocation.Notification,
						title: `CSS ${fileName} File created and linked in liquid`
					}, async (progress) => {
						await new Promise(resolve => setTimeout(resolve, 200));
					});
				}

				if (scriptPath) {
					const scriptUri = vscode.Uri.file(scriptPath);
					vscode.workspace.openTextDocument(scriptUri).then(doc => vscode.window.showTextDocument(doc, { preview: false }));
					await vscode.window.withProgress({
						location: vscode.ProgressLocation.Notification,
						title: `Js ${fileName} File created and linked in liquid`
					}, async (progress) => {
						await new Promise(resolve => setTimeout(resolve, 200));
					});
				}

				
				// Open all created files in persistent tabs
				const sectionUri = vscode.Uri.file(sectionFilePath);
				vscode.workspace.openTextDocument(sectionUri).then(doc => vscode.window.showTextDocument(doc, { preview: false }));

				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: `Liquid File ${fileName} Created`
				}, async (progress) => {
					await new Promise(resolve => setTimeout(resolve, 2000));
				});
				
			}
		}
	});

	context.subscriptions.push(createFileCommand);
}

export function deactivate() {}
