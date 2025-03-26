import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

	const createFileCommand = vscode.commands.registerCommand('quickstruct-liquid-sections.createSectionFile', async () => {
		const fileNameInput = await vscode.window.showInputBox({
			prompt: 'Enter the name of the new section file (max 25 characters)',
			placeHolder: 'Section name ',
			validateInput: (input) => {
				return input.length > 25 ? 'File name must not exceed 25 characters' : null;
			}
		});

		if (fileNameInput) {
			const fileName = fileNameInput.replace(/[\s_&$%@#]/g, '-').toLowerCase();
			const pascalCaseFileName = fileName
				.split('-')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');

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

				const addStylesheet = await vscode.window.showQuickPick(
					[
						{ label: 'Lazy Loaded', description: ' •  Recommended for non first fold content' },
						{ label: 'Pre Loaded', description: ' •  Recommended for first fold content' },
						{ label: 'Render Blocking', description: ' •  Not recommended' },
						{ label: 'Skip CSS', description: ' •  Who needs CSS anyway? ;)' }
					],
					{ placeHolder: 'Select how you want to handle the stylesheet for this section:' }
				);

				if (addStylesheet?.label === 'Lazy Loaded') {
					stylesheetPath = path.join(assetsFolderPath, `${fileName}-stylesheet.css`);
					fs.writeFileSync(stylesheetPath, '');
					sectionContent += `<link rel="stylesheet" href="{{ '${fileName}-stylesheet.css' | asset_url }}" media="print" onload="this.media='all'">`;
				} else if (addStylesheet?.label === 'Pre Loaded (For first fold content)') {
					stylesheetPath = path.join(assetsFolderPath, `${fileName}-stylesheet.css`);
					fs.writeFileSync(stylesheetPath, '');
					sectionContent += `<link rel="preload" href="{{ '${fileName}-stylesheet.css' | asset_url }}" as="style" onload="this.rel='stylesheet'">`;
				} else if (addStylesheet?.label === 'Render Blocking (not recommended)') {
					stylesheetPath = path.join(assetsFolderPath, `${fileName}-stylesheet.css`);
					fs.writeFileSync(stylesheetPath, '');
					sectionContent += `<link rel="stylesheet" href="{{ '${fileName}-stylesheet.css' | asset_url }}">`;
				}

				sectionContent += `\n`;
				sectionContent += `
<div class="${fileName}"> 

</div>\n`;
				sectionContent += `\n`;

				const scriptOption = await vscode.window.showQuickPick(
					[
						{ 
							label: 'Defer', 
							description: ' •  Downloads the script in parallel with HTML parsing but waits to execute until the HTML is fully loaded (maintains order).' 
						},
						{ 
							label: 'Async', 
							description: ' •  Downloads the script in parallel with HTML parsing and executes it immediately once ready (order not guaranteed).' 
						},
						{ 
							label: 'Render Blocking', 
							description: ' •  ⚠️ Not recommended! Uses full network bandwidth to download the script and blocks the main thread until execution is complete, significantly delaying page rendering.' 
						},
						{ 
							label: 'Skip JavaScript', 
							description: ' •  No JS will be added. Your page will load so fast, it might time-travel! 🚀⌛' 
						}
					],
					{ placeHolder: 'Select JS loading options? • ( and hover on options to read whole description 🫡)' }
				);
				
				if (scriptOption?.label !== 'Skip JavaScript') {
					scriptPath = path.join(assetsFolderPath, `${fileName}-javascript.js`);
					fs.writeFileSync(scriptPath, '');
					
					let scriptTag = '';
					if (scriptOption?.label === 'Async') {
						scriptTag = 'async';
					} else if (scriptOption?.label === 'Defer') {
						scriptTag = 'defer';
					} // No need to set anything for "Render Blocking" since it defaults to blocking mode
				
					sectionContent += `\n<script src="{{ '${fileName}-javascript.js' | asset_url }}" ${scriptTag}></script>\n`;
				}						
				sectionContent += `
{% schema %}
{
	"name": "${fileName}",
	"class": "${fileName}-parent",
	"settings": [],
	"presets": [
		{
			"name": "${pascalCaseFileName}"
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
